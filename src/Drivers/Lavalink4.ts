import { Wacelink } from '../Wacelink'
import { metadata } from '../metadata'
import { WacelinkEvents } from '../Interface/Constants'
import { WacelinkRequesterOptions } from '../Interface/Rest'
import { WacelinkNode } from '../Node/WacelinkNode'
import { AbstractDriver } from './AbstractDriver'
import util from 'node:util'
import { WacelinkPlayer } from '../Player/WacelinkPlayer'
import { WacelinkWebsocket } from '../Utilities/WacelinkWebsocket'
import { WacelinkDatabase } from '../Utilities/WacelinkDatabase'
import { LavalinkDecoder } from '../Utilities/LavalinkDecoder'

export class Lavalink4 extends AbstractDriver {
	public id: string = 'lavalink/v4/koinu'
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
		this.wsUrl = `${this.node.options.secure ? 'wss' : 'ws'}://${this.node.options.host}:${this.node.options.port}/v4/websocket`
		this.httpUrl = `${this.node.options.secure ? 'https://' : 'http://'}${this.node.options.host}:${this.node.options.port}/v4`
		this.functions.set('decode', this.decode)
	}

	public connect(): WacelinkWebsocket {
		const isResume = this.manager.wacelinkOptions.options!.resume
		const ws = new WacelinkWebsocket(this.wsUrl, {
			headers: {
				Authorization: this.node.options.auth,
				'user-id': this.manager.id,
				'client-name': `${metadata.name}/${metadata.version} (${metadata.github})`,
				'session-id': this.sessionId !== null && isResume ? this.sessionId : '',
				'user-agent': this.manager.wacelinkOptions.options!.userAgent!,
				'num-shards': this.manager.shardCount,
			},
		})

		ws.on('open', () => {
			this.node.wsOpenEvent()
		})
		ws.on('message', (data) => this.wsMessageEvent(data))
		ws.on('error', (err) => this.node.wsErrorEvent(err))
		ws.on('close', (code: number, reason: Buffer) => {
			this.node.wsCloseEvent(code, reason)
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
			options.body = JSON.stringify(options.data)
		}

		const lavalinkHeaders = {
			authorization: this.node.options.auth,
			'user-agent': this.manager.wacelinkOptions.options!.userAgent!,
			...options.headers,
		}

		options.headers = lavalinkHeaders

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
				`${options.method ?? 'GET'} ${options.path} payload=${options.body ? String(options.body) : '{}'}`
			)
			this.debug(
				'Something went wrong with lavalink server. ' +
          `Status code: ${res.status}\n Headers: ${util.inspect(options.headers)}`
			)
			return undefined
		}

		const finalData = await res.json()

		this.debug(
			`${options.method ?? 'GET'} ${url.pathname + url.search} payload=${options.body ? String(options.body) : '{}'}`
		)

		return finalData as D
	}

	protected wsMessageEvent(data: string) {
		const wsData = JSON.parse(data.toString())
		this.node.wsMessageEvent(wsData)
	}

	protected debug(logs: string) {
		this.manager.emit(
			WacelinkEvents.Debug,
			`[Wacelink] / [Node @ ${this.node?.options.name}] / [Driver] / [Lavalink4] | ${logs}`
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

	protected decode(base64: string) {
		return new LavalinkDecoder(base64).getTrack ?? undefined
	}
}
