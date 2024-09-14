import { WacelinkEvents, WacelinkLoopMode, WacelinkPlayerState } from '../Interface/Constants'
import { LavalinkEventsEnum } from '../Interface/LavalinkEvents'
import { Wacelink } from '../Wacelink'

export class WacelinkPlayerEvents {
	protected readonly methods: Record<string, (manager: Wacelink, data: Record<string, any>) => void>

	constructor() {
		this.methods = {
			TrackStartEvent: this.TrackStartEvent,
			TrackEndEvent: this.TrackEndEvent,
			TrackExceptionEvent: this.TrackExceptionEvent,
			TrackStuckEvent: this.TrackStuckEvent,
			WebSocketClosedEvent: this.WebSocketClosedEvent,
		}
	}

	public initial(data: Record<string, any>, manager: Wacelink) {
		if (data.op == LavalinkEventsEnum.PlayerUpdate) return this.PlayerUpdate(manager, data)
		const _function = this.methods[data.type]
		if (_function !== undefined) _function(manager, data)
	}

	protected TrackStartEvent(manager: Wacelink, data: Record<string, any>) {
		const player = manager.players.get(data.guildId)
		if (player) {
			player.playing = true
			player.paused = false
			manager.emit(WacelinkEvents.TrackStart, player, player.queue.current!)
			manager.emit(
				WacelinkEvents.Debug,
				`[Wacelink] / [Player @ ${data.guildId}] / [Events] / [Start] | ` + JSON.stringify(data)
			)
		}
		return
	}

	protected TrackEndEvent(manager: Wacelink, data: Record<string, any>) {
		const player = manager.players.get(data.guildId)
		if (player) {
			// This event emits STOPPED reason when destroying, so return to prevent double emit
			if (player.state === WacelinkPlayerState.DESTROYED)
				return manager.emit(
					WacelinkEvents.Debug,
					`[Wacelink] / [Player @ ${data.guildId}] / [Events] / [End] | Player ${player.guildId} destroyed from end event`
				)

			manager.emit(
				WacelinkEvents.Debug,
				`[Wacelink] / [Player @ ${data.guildId}] / [Events] / [End] | ` +
          `Tracks: ${player.queue.length} ` +
          JSON.stringify(data)
			)

			player.playing = false
			player.paused = true

			if (data.reason === 'replaced') {
				return manager.emit(WacelinkEvents.TrackEnd, player, player.queue.current!)
			}
			if (['loadFailed', 'cleanup'].includes(data.reason)) {
				if (player.queue.current) player.queue.previous.push(player.queue.current)
				if (!player.queue.length && !player.sudoDestroy)
					return manager.emit(WacelinkEvents.QueueEmpty, player, player.queue)
				manager.emit(WacelinkEvents.QueueEmpty, player, player.queue)
				player.queue.current = null
				return player.play()
			}

			if (player.loop == WacelinkLoopMode.SONG && player.queue.current)
				player.queue.unshift(player.queue.current)
			if (player.loop == WacelinkLoopMode.QUEUE && player.queue.current)
				player.queue.push(player.queue.current)

			if (player.queue.current) player.queue.previous.push(player.queue.current)
			const currentSong = player.queue.current
			player.queue.current = null

			if (player.queue.length) {
				manager.emit(WacelinkEvents.TrackEnd, player, currentSong!)
			} else if (!player.queue.length && !player.sudoDestroy) {
				return manager.emit(WacelinkEvents.QueueEmpty, player, player.queue)
			} else return

			return player.play()
		}
		return
	}

	protected TrackExceptionEvent(manager: Wacelink, data: Record<string, any>) {
		const player = manager.players.get(data.guildId)
		if (player) {
			player.playing = false
			player.paused = true
			manager.emit(WacelinkEvents.PlayerException, player, data)
			manager.emit(
				WacelinkEvents.Debug,
				`[Wacelink] / [Player @ ${data.guildId}] / [Events] / [Exception] | ` + JSON.stringify(data)
			)
		}
		return
	}

	protected TrackStuckEvent(manager: Wacelink, data: Record<string, any>) {
		const player = manager.players.get(data.guildId)
		if (player) {
			player.playing = false
			player.paused = true
			manager.emit(WacelinkEvents.TrackStuck, player, data)
			manager.emit(
				WacelinkEvents.Debug,
				`[Wacelink] / [Player @ ${data.guildId}] / [Events] / [Stuck] | ` + JSON.stringify(data)
			)
		}
		return
	}

	protected WebSocketClosedEvent(manager: Wacelink, data: Record<string, any>) {
		const player = manager.players.get(data.guildId)
		if (player) {
			player.playing = false
			player.paused = true
			manager.emit(WacelinkEvents.PlayerWebsocketClosed, player, data)
			manager.emit(
				WacelinkEvents.Debug,
				`[Wacelink] / [Player @ ${data.guildId}] / [Events] / [WebsocketClosed] | ` +
          JSON.stringify(data)
			)
		}
		return
	}

	protected PlayerUpdate(manager: Wacelink, data: Record<string, any>) {
		const player = manager.players.get(data.guildId)
		if (player) {
			player.position = Number(data.state.position)
			manager.emit(
				WacelinkEvents.Debug,
				`[Wacelink] / [Player @ ${data.guildId}] / [Events] / [Updated] | ` + JSON.stringify(data)
			)
			manager.emit(WacelinkEvents.PlayerUpdate, player, data)
		}
		return
	}
}
