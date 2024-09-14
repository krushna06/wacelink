import { Wacelink } from '../Wacelink'
import { metadata } from '../metadata'
import { LavalinkLoadType, WacelinkEvents } from '../Interface/Constants'
import { WacelinkRequesterOptions, UpdatePlayerInfo } from '../Interface/Rest'
import { WacelinkNode } from '../Node/WacelinkNode'
import { AbstractDriver } from './AbstractDriver'
import util from 'node:util'
import { WacelinkPlayer } from '../Player/WacelinkPlayer'
import { WacelinkWebsocket } from '../Utilities/WacelinkWebsocket'
import { WacelinkDatabase } from '../Utilities/WacelinkDatabase'
import { LavalinkDecoder } from '../Utilities/LavalinkDecoder'

export enum Lavalink3loadType {
  TRACK_LOADED = 'TRACK_LOADED',
  PLAYLIST_LOADED = 'PLAYLIST_LOADED',
  SEARCH_RESULT = 'SEARCH_RESULT',
  NO_MATCHES = 'NO_MATCHES',
  LOAD_FAILED = 'LOAD_FAILED',
}

export class Lavalink3 extends AbstractDriver {
	public id: string = 'lavalink/v3/koto'
	public wsUrl: string = ''
	public httpUrl: string = ''
	public sessionId: string | null
	public playerFunctions: WacelinkDatabase<(player: WacelinkPlayer, ...args: any) => unknown>
	public functions: WacelinkDatabase<(manager: Wacelink, ...args: any) => unknown>
	protected wsClient?: WacelinkWebsocket

	constructor(
    public manager: Wacelink,
    public node: WacelinkNode
	) {
		super()
		this.playerFunctions = new WacelinkDatabase<(player: WacelinkPlayer, ...args: any) => unknown>()
		this.functions = new WacelinkDatabase<(manager: Wacelink, ...args: any) => unknown>()
		this.sessionId = null
		this.wsUrl = `${this.node.options.secure ? 'wss' : 'ws'}://${this.node.options.host}:${this.node.options.port}/`
		this.httpUrl = `${this.node.options.secure ? 'https://' : 'http://'}${this.node.options.host}:${this.node.options.port}`
		this.functions.set('decode', this.decode)
	}

	public connect(): WacelinkWebsocket {
		const isResume = this.manager!.wacelinkOptions.options!.resume
		const ws = new WacelinkWebsocket(this.wsUrl, {
			headers: {
				Authorization: this.node!.options.auth,
				'user-id': this.manager!.id,
				'client-name': `${metadata.name}/${metadata.version} (${metadata.github})`,
				'session-id': this.sessionId !== null && isResume ? this.sessionId : '',
				'user-agent': this.manager!.wacelinkOptions.options!.userAgent!,
				'num-shards': this.manager!.shardCount,
			},
		})

		ws.on('open', () => {
      this.node!.wsOpenEvent()
		})
		ws.on('message', (data: string) => this.wsMessageEvent(data))
		ws.on('error', (err) => this.node!.wsErrorEvent(err))
		ws.on('close', (code: number, reason: Buffer) => {
      this.node!.wsCloseEvent(code, reason)
      ws.removeAllListeners()
		})
		this.wsClient = ws
		return ws
	}

	public async requester<D = any>(options: WacelinkRequesterOptions): Promise<D | undefined> {
		const url = new URL(`${this.httpUrl}${options.path}`)
		if (options.params) url.search = new URLSearchParams(options.params).toString()
		if (options.rawReqData && options.path.includes('/sessions')) {
			this.convertToV3websocket(options.rawReqData)
			return
		}
		if (options.data) {
			this.convertToV3request(options.data as Record<string, any>)
			options.body = JSON.stringify(options.data)
		}
		if (options.path.includes('/sessions//')) return undefined
		if (
			/\/sessions\/(.*)\/players\/(.*)/.test(options.path) ||
      (options.method && options.method == 'DELETE')
		)
			return undefined

		const lavalinkHeaders = {
			authorization: this.node!.options.auth,
			'user-agent': this.manager!.wacelinkOptions.options!.userAgent!,
			...options.headers,
		}

		options.headers = lavalinkHeaders
		if (this.sessionId) url.pathname = '/v3' + url.pathname

		if (options.path == '/decodetrack') {
			const data = this.decode(
				options.params ? (options.params as Record<string, string>).encodedTrack : ''
			) as D
			if (data) return data
		}

		const res = await fetch(url, options)

		if (res.status == 204) {
			this.debug(
				`${options.method ?? 'GET'} ${url.pathname + url.search} payload=${options.body ? String(options.body) : '{}'}`
			)
			return undefined
		}
		if (res.status !== 200) {
			this.debug(
				`${options.method ?? 'GET'} ${url.pathname + url.search} payload=${options.body ? String(options.body) : '{}'}`
			)
			this.debug(
				'Something went wrong with lavalink server. ' +
          `Status code: ${res.status}\n Headers: ${util.inspect(options.headers)}`
			)
			return undefined
		}

		const preFinalData = await res.json()

		let finalData: any = preFinalData

		if (finalData.loadType) {
			finalData = this.convertV4trackResponse(finalData) as D
		}

		this.debug(
			`${options.method ?? 'GET'} ${url.pathname + url.search} payload=${options.body ? String(options.body) : '{}'}`
		)

		return finalData
	}

	protected convertToV3websocket(data: UpdatePlayerInfo) {
		let isPlaySent
		if (!data) return

		// Voice update
		if (data.playerOptions.voice)
			this.wsSendData({
				op: 'voiceUpdate',
				guildId: data.guildId,
				sessionId: data.playerOptions.voice.sessionId,
				event: data.playerOptions.voice,
			})

		// Play track
		if (
			data.playerOptions.track &&
      data.playerOptions.track.encoded &&
      data.playerOptions.track.length !== 0
		) {
			isPlaySent = true
			this.wsSendData({
				op: 'play',
				guildId: data.guildId,
				track: data.playerOptions.track.encoded,
				startTime: data.playerOptions.position,
				endTime: data.playerOptions.track.length,
				volume: data.playerOptions.volume,
				noReplace: data.noReplace,
				pause: data.playerOptions.paused,
			})
		}

		// Destroy player
		if (
			data.playerOptions.track &&
      data.playerOptions.track.encoded == null &&
      data.playerOptions.track.length === 0
		)
			this.wsSendData({
				op: 'destroy',
				guildId: data.guildId,
			})

		// Destroy player
		if (data.playerOptions.track && data.playerOptions.track.encoded == null)
			this.wsSendData({
				op: 'stop',
				guildId: data.guildId,
			})

		if (isPlaySent) return (isPlaySent = false)

		// Pause player
		if (data.playerOptions.paused === false || data.playerOptions.paused === true)
			this.wsSendData({
				op: 'pause',
				guildId: data.guildId,
				pause: data.playerOptions.paused,
			})

		// Seek player
		if (data.playerOptions.position)
			this.wsSendData({
				op: 'seek',
				guildId: data.guildId,
				position: data.playerOptions.position,
			})

		// Voice player
		if (data.playerOptions.volume)
			this.wsSendData({
				op: 'volume',
				guildId: data.guildId,
				volume: data.playerOptions.volume,
			})

		// Filter player
		if (data.playerOptions.filters)
			this.wsSendData({
				op: 'filters',
				guildId: data.guildId,
				...data.playerOptions.filters,
			})
	}

	protected checkUpdateExist(data: Record<string, any>) {
		return (
			data.track ||
      data.identifier ||
      data.position ||
      data.endTime ||
      data.volume ||
      data.paused ||
      data.filters ||
      data.voice
		)
	}

	protected wsSendData(data: Record<string, unknown>): void {
		if (!this.wsClient) return
		const jsonData = JSON.stringify(data)
		this.wsClient.send(jsonData)
		return
	}

	protected wsMessageEvent(data: string) {
		const wsData = JSON.parse(data.toString())
		if (wsData.reason) wsData.reason = (wsData.reason as string).toLowerCase()
		if (wsData.reason == 'LOAD_FAILED') wsData.reason = 'loadFailed'
    this.node!.wsMessageEvent(wsData)
	}

	public async updateSession(sessionId: string, mode: boolean, timeout: number): Promise<void> {
		if (!sessionId) {
			this.wsSendData({
				op: 'configureResuming',
				key: 'wacelink/lavalink/v3/koto/legacy',
				timeout: 60,
			})
			this.debug(`Session updated! resume: ${mode}, timeout: ${timeout}`)
			return
		}
		const options: WacelinkRequesterOptions = {
			path: `/sessions/${sessionId}`,
			headers: { 'content-type': 'application/json' },
			method: 'PATCH',
			data: {
				resumingKey: sessionId,
				timeout: timeout,
			},
		}

		await this.requester<{ resuming: boolean; timeout: number }>(options)
		this.debug(`Session updated! resume: ${mode}, timeout: ${timeout}`)
		return
	}

	protected debug(logs: string) {
    this.manager!.emit(
    	WacelinkEvents.Debug,
    	`[Wacelink] / [Node @ ${this.node?.options.name}] / [Driver] / [Lavalink3] | ${logs}`
    )
	}

	public wsClose(): void {
		if (this.wsClient) this.wsClient.close(1006, 'Self closed')
	}

	protected testJSON(text: string) {
		if (typeof text !== 'string') {
			return false
		}
		try {
			JSON.parse(text)
			return true
		} catch {
			return false
		}
	}

	protected convertToV3request(data?: Record<string, any>) {
		if (!data) return
		if (data.track && data.track.encoded !== undefined) {
			data.encodedTrack = data.track.encoded
			delete data.track
		}
		return
	}

	protected convertV4trackResponse(v3data: Record<string, any>): Record<string, any> {
		if (!v3data) return {}
		if (v3data.loadType == Lavalink3loadType.LOAD_FAILED) v3data.loadType = LavalinkLoadType.ERROR
		if (v3data.loadType.includes('PLAYLIST_LOADED')) {
			v3data.loadType = LavalinkLoadType.PLAYLIST
			const convertedArray = []
			for (let i = 0; i < v3data.tracks.length; i++) {
				convertedArray.push(this.buildV4track(v3data.tracks[i]))
			}
			v3data.data = {
				info: v3data.playlistInfo,
				tracks: convertedArray,
			}
			delete v3data.tracks
			return v3data
		}
		if (v3data.loadType == Lavalink3loadType.SEARCH_RESULT) {
			v3data.loadType = LavalinkLoadType.SEARCH
			v3data.data = v3data.tracks
			for (let i = 0; i < v3data.data.length; i++) {
				v3data.data[i] = this.buildV4track(v3data.data[i])
			}
			delete v3data.tracks
			delete v3data.playlistInfo
		}
		if (v3data.loadType == Lavalink3loadType.TRACK_LOADED) {
			v3data.loadType = LavalinkLoadType.TRACK
			v3data.data = this.buildV4track(v3data.tracks[0])
			delete v3data.tracks
		}
		if (v3data.loadType == Lavalink3loadType.NO_MATCHES) v3data.loadType = LavalinkLoadType.EMPTY
		return v3data
	}

	protected buildV4track(v3data: Record<string, any>) {
		return {
			encoded: v3data.track,
			info: {
				sourceName: v3data.info.sourceName,
				identifier: v3data.info.identifier,
				isSeekable: v3data.info.isSeekable,
				author: v3data.info.author,
				length: v3data.info.length,
				isStream: v3data.info.isStream,
				position: v3data.info.position,
				title: v3data.info.title,
				uri: v3data.info.uri,
				artworkUrl: undefined,
			},
			pluginInfo: undefined,
		}
	}

	protected decode(base64: string) {
		return new LavalinkDecoder(base64).getTrack ?? undefined
	}
}
