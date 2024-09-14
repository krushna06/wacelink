import { Wacelink } from '../Wacelink'
import { metadata } from '../metadata'
import { WacelinkEvents } from '../Interface/Constants'
import { WacelinkRequesterOptions, RawTrack } from '../Interface/Rest'
import { WacelinkNode } from '../Node/WacelinkNode'
import { AbstractDriver } from './AbstractDriver'
import util from 'node:util'
import { WacelinkPlayer } from '../Player/WacelinkPlayer'
import { WacelinkWebsocket } from '../Utilities/WacelinkWebsocket'
import { WacelinkDatabase } from '../Utilities/WacelinkDatabase'
import { AbstractDecoder } from '../Utilities/AbstractDecoder'

export class FrequenC extends AbstractDriver {
	public id: string = 'frequenc/v1/miku'
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
		this.wsUrl = `${this.node.options.secure ? 'wss' : 'ws'}://${this.node.options.host}:${this.node.options.port}/v1/websocket`
		this.httpUrl = `${this.node.options.secure ? 'https://' : 'http://'}${this.node.options.host}:${this.node.options.port}/v1`
		this.functions.set('decode', this.decode)
	}

	public connect(): WacelinkWebsocket {
		const ws = new WacelinkWebsocket(this.wsUrl, {
			headers: {
				authorization: this.node!.options.auth,
				'user-id': this.manager!.id,
				'client-info': `${metadata.name}/${metadata.version} (${metadata.github})`,
				'user-agent': this.manager!.wacelinkOptions.options!.userAgent!,
				'num-shards': this.manager!.shardCount,
			},
		})

		ws.on('open', () => {
      this.node!.wsOpenEvent()
		})
		ws.on('message', (data) => this.wsMessageEvent(data))
		ws.on('error', (err) => this.node!.wsErrorEvent(err))
		ws.on('close', (code: number, reason: Buffer) => {
      this.node!.wsCloseEvent(code, reason)
      ws.removeAllListeners()
		})
		this.wsClient = ws
		return ws
	}

	public async requester<D = any>(options: WacelinkRequesterOptions): Promise<D | undefined> {
		if (options.path.includes('/sessions') && this.sessionId == null)
			throw new Error('sessionId not initalized! Please wait for lavalink get connected!')
		const url = new URL(`${this.httpUrl}${options.path}`)
		if (options.params) url.search = new URLSearchParams(options.params).toString()
		if (options.data) {
			const converted = this.camelToSnake(options.data)
			options.body = JSON.stringify(converted)
		}

		const lavalinkHeaders = {
			authorization: this.node!.options.auth,
			...options.headers,
		}

		options.headers = lavalinkHeaders
		if (options.body && JSON.stringify(options.body) == '{}') delete options.body
		//  + url.search;

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
				'Something went wrong with frequenc server. ' +
          `Status code: ${res.status}\n Headers: ${util.inspect(options.headers)}`
			)
			return undefined
		}

		let finalData

		if (res.headers.get('content-type') == 'application/json') finalData = await res.json()
		else finalData = { rawData: await res.text() }

		this.debug(
			`${options.method ?? 'GET'} ${url.pathname + url.search} payload=${options.body ? String(options.body) : '{}'}`
		)

		return finalData as D
	}

	protected wsMessageEvent(data: string) {
		const wsData = this.snakeToCamel(JSON.parse(data.toString()))
    this.node!.wsMessageEvent(wsData)
	}

	protected debug(logs: string) {
    this.manager!.emit(
    	WacelinkEvents.Debug,
    	`[Wacelink] / [Node @ ${this.node?.options.name}] / [Driver] / [FrequenC1] | ${logs}`
    )
	}

	public wsClose(): void {
		if (this.wsClient) this.wsClient.close(1006, 'Self closed')
	}

	public async updateSession(sessionId: string, mode: boolean, timeout: number): Promise<void> {
		const options: WacelinkRequesterOptions = {
			path: `/sessions/${sessionId}`,
			headers: { 'content-type': 'application/json' },
			method: 'PATCH',
			data: {
				resuming: mode,
				timeout: timeout,
			},
		}

		await this.requester<{ resuming: boolean; timeout: number }>(options)
		this.debug(`Session updated! resume: ${mode}, timeout: ${timeout}`)
		return
	}

	protected camelToSnake(obj: Record<string, unknown>): Record<string, unknown> {
		if (typeof obj !== 'object') return {}
		if (!obj || JSON.stringify(obj) == '{}') return {}
		const allKeys = Object.keys(obj)
		const regex = /^([a-z]{1,})(_[a-z0-9]{1,})*$/

		for (const key of allKeys) {
			let newKey
			if (!regex.test(key)) {
				newKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
				obj[newKey] = obj[key]
				delete obj[key]
			}
			if (newKey && typeof obj[newKey] !== 'object' && typeof obj[key] !== 'object') continue

			newKey
				? this.camelToSnake(obj[newKey] as Record<string, unknown>)
				: this.camelToSnake(obj[key] as Record<string, unknown>)
		}
		return obj
	}

	protected snakeToCamel(obj: Record<string, unknown>): Record<string, unknown> {
		if (typeof obj !== 'object') return {}
		if (!obj || JSON.stringify(obj) == '{}') return {}
		const allKeys = Object.keys(obj)
		for (const key of allKeys) {
			let newKey
			if (/([-_][a-z])/.test(key)) {
				newKey = key
					.toLowerCase()
					.replace(/([-_][a-z])/g, (group) => group.toUpperCase().replace('-', '').replace('_', ''))
				obj[newKey] = obj[key]
				delete obj[key]
			}
			if (newKey && typeof obj[newKey] !== 'object' && typeof obj[key] !== 'object') continue

			newKey
				? this.snakeToCamel(obj[newKey] as Record<string, unknown>)
				: this.snakeToCamel(obj[key] as Record<string, unknown>)
		}
		return obj
	}

	protected decode(base64: string) {
		return new Decoder(base64).getTrack ?? undefined
	}
}

class Decoder extends AbstractDecoder {
	protected position: number = 0
	protected buffer: Buffer
	constructor(protected track: string) {
		super()
		this.buffer = Buffer.from(track, 'base64')
	}
	get getTrack(): RawTrack | null {
		try {
			// Read the length of base64 (This will use later)
			this.readInt()
			// Read the version of base64 (This will use later)
			this.readByte()
			return {
				encoded: this.track,
				info: {
					title: this.readUTF(),
					author: this.readUTF(),
					length: Number(this.readLong()),
					identifier: this.readUTF(),
					isSeekable: true,
					isStream: this.readByte() === 1,
					uri: this.readUTF(),
					artworkUrl: this.readByte() === 1 ? this.readUTF() : null,
					isrc: this.readByte() === 1 ? this.readUTF() : null,
					sourceName: this.readUTF().toLowerCase(),
					position: 0,
				},
				pluginInfo: {},
			}
		} catch {
			return null
		}
	}
}
