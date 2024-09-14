import { WacelinkNodeOptions } from '../Interface/Manager'
import { Wacelink } from '../Wacelink'
import { WacelinkConnectState, WacelinkEvents } from '../Interface/Constants'
import { WacelinkRest } from './WacelinkRest'
import { setTimeout } from 'node:timers/promises'
import { WacelinkPlayerEvents } from './WacelinkPlayerEvents'
import { LavalinkEventsEnum } from '../Interface/LavalinkEvents'
import { LavalinkNodeStatsResponse, NodeStats } from '../Interface/Node'
import { AbstractDriver } from '../Drivers/AbstractDriver'
// Drivers
import { Lavalink4 } from '../Drivers/Lavalink4'
import { WacelinkWebsocket } from '../Utilities/WacelinkWebsocket'

/** The node manager class for managing current audio sending server/node */
export class WacelinkNode {
	/** The wacelink manager */
	public manager: Wacelink
	/** The wacelink node options */
	public options: WacelinkNodeOptions
	/** The wacelink rest manager */
	public rest: WacelinkRest
	/** The lavalink server online status */
	public online: boolean = false
	protected retryCounter = 0
	/** The lavalink server connect state */
	public state: WacelinkConnectState = WacelinkConnectState.Closed
	/** The lavalink server all status */
	public stats: NodeStats
	protected sudoDisconnect = false
	protected wsEvent: WacelinkPlayerEvents
	/** Driver for connect to current version of Nodelink/Lavalink */
	public driver: AbstractDriver

	/**
   * The lavalink server handler class
   * @param manager The wacelink manager
   * @param options The lavalink server options
   */
	constructor(manager: Wacelink, options: WacelinkNodeOptions) {
		this.manager = manager
		this.options = options
		const getDriver = this.manager.drivers.filter(
			(driver) => driver.prototype.id === options.driver
		)
		if (!getDriver || getDriver.length == 0) {
			this.debug('No driver was found, using lavalink v4 driver instead')
			this.driver = new Lavalink4(manager, this)
		} else {
			this.debug(`Now using driver: ${getDriver[0].prototype.id}`)
			this.driver = new getDriver[0](manager, this)
		}
		const customRest =
      this.manager.wacelinkOptions.options!.structures &&
      this.manager.wacelinkOptions.options!.structures.rest
		this.rest = customRest
			? new customRest(manager, options, this)
			: new WacelinkRest(manager, options, this)
		this.wsEvent = new WacelinkPlayerEvents()
		this.stats = {
			players: 0,
			playingPlayers: 0,
			uptime: 0,
			memory: {
				free: 0,
				used: 0,
				allocated: 0,
				reservable: 0,
			},
			cpu: {
				cores: 0,
				systemLoad: 0,
				lavalinkLoad: 0,
			},
			frameStats: {
				sent: 0,
				nulled: 0,
				deficit: 0,
			},
		}
	}

	/** Connect this lavalink server */
	public connect(): WacelinkWebsocket {
		return this.driver.connect()
	}

	/** @ignore */
	public wsOpenEvent() {
		this.clean(true)
		this.state = WacelinkConnectState.Connected
		this.debug(`Node connected! URL: ${this.driver.wsUrl}`)
		this.manager.emit(WacelinkEvents.NodeConnect, this)
	}

	/** @ignore */
	public wsMessageEvent(data: Record<string, any>) {
		switch (data.op) {
		case LavalinkEventsEnum.Ready: {
			const isResume = this.manager.wacelinkOptions.options!.resume
			const timeout = this.manager.wacelinkOptions.options?.resumeTimeout
			this.driver.sessionId = data.sessionId
			const customRest =
          this.manager.wacelinkOptions.options!.structures &&
          this.manager.wacelinkOptions.options!.structures.rest
			this.rest = customRest
				? new customRest(this.manager, this.options, this)
				: new WacelinkRest(this.manager, this.options, this)
			if (isResume && timeout) {
				this.driver.updateSession(data.sessionId, isResume, timeout)
			}
			break
		}
		case LavalinkEventsEnum.Event: {
			this.wsEvent.initial(data, this.manager)
			break
		}
		case LavalinkEventsEnum.PlayerUpdate: {
			this.wsEvent.initial(data, this.manager)
			break
		}
		case LavalinkEventsEnum.Status: {
			this.stats = this.updateStatusData(data as LavalinkNodeStatsResponse)
			break
		}
		}
	}

	/** @ignore */
	public wsErrorEvent(logs: Error) {
		this.debug(`Node errored! URL: ${this.driver.wsUrl}`)
		this.manager.emit(WacelinkEvents.NodeError, this, logs)
	}

	/** @ignore */
	public async wsCloseEvent(code: number, reason: Buffer) {
		this.online = false
		this.state = WacelinkConnectState.Disconnected
		this.debug(`Node disconnected! URL: ${this.driver.wsUrl}`)
		this.manager.emit(WacelinkEvents.NodeDisconnect, this, code, reason)
		if (
			!this.sudoDisconnect &&
      this.retryCounter !== this.manager.wacelinkOptions.options!.retryCount
		) {
			await setTimeout(this.manager.wacelinkOptions.options!.retryTimeout)
			this.retryCounter = this.retryCounter + 1
			this.reconnect(true)
			return
		}
		this.nodeClosed()
		return
	}

	protected nodeClosed() {
		this.manager.emit(WacelinkEvents.NodeClosed, this)
		this.debug(`Node closed! URL: ${this.driver.wsUrl}`)
		this.clean()
	}

	protected updateStatusData(data: LavalinkNodeStatsResponse): NodeStats {
		return {
			players: data.players ?? this.stats.players,
			playingPlayers: data.playingPlayers ?? this.stats.playingPlayers,
			uptime: data.uptime ?? this.stats.uptime,
			memory: data.memory ?? this.stats.memory,
			cpu: data.cpu ?? this.stats.cpu,
			frameStats: data.frameStats ?? this.stats.frameStats,
		}
	}

	/** Disconnect this lavalink server */
	public disconnect() {
		this.sudoDisconnect = true
		this.driver.wsClose()
	}

	/** Reconnect back to this lavalink server */
	public reconnect(noClean: boolean) {
		if (!noClean) this.clean()
		this.debug(`Node is trying to reconnect! URL: ${this.driver.wsUrl}`)
		this.manager?.emit(WacelinkEvents.NodeReconnect, this)
		this.driver.connect()
	}

	/** Clean all the lavalink server state and set to default value */
	public clean(online: boolean = false) {
		this.sudoDisconnect = false
		this.retryCounter = 0
		this.online = online
		this.state = WacelinkConnectState.Closed
	}

	protected debug(logs: string) {
		this.manager.emit(WacelinkEvents.Debug, `[Wacelink] / [Node @ ${this.options.name}] | ${logs}`)
	}
}
