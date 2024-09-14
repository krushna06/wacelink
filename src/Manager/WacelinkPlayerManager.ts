import { WacelinkEvents, WacelinkPlayerState, VoiceState } from '../Interface/Constants'
import { VoiceChannelOptions } from '../Interface/Player'
import { WacelinkPlayer } from '../Player/WacelinkPlayer'
import { Wacelink } from '../Wacelink'
import { WacelinkDatabase } from '../Utilities/WacelinkDatabase'

/** The node manager class for managing all active players */
export class WacelinkPlayerManager extends WacelinkDatabase<WacelinkPlayer> {
	/** The wacelink manager */
	public manager: Wacelink

	/**
   * The main class for handling lavalink players
   * @param manager The wacelink manager
   */
	constructor(manager: Wacelink) {
		super()
		this.manager = manager
	}

	/**
   * Create a player
   * @returns WacelinkPlayer
   * @internal
   */
	async create(options: VoiceChannelOptions): Promise<WacelinkPlayer> {
		const createdPlayer = this.get(options.guildId)
		if (createdPlayer) return createdPlayer
		const getCustomNode = this.manager.nodes.get(String(options.nodeName ? options.nodeName : ''))
		const node = getCustomNode ? getCustomNode : await this.manager.nodes.getLeastUsed()
		if (!node) throw new Error('Can\'t find any nodes to connect on')
		const customPlayer =
      this.manager.wacelinkOptions.options!.structures &&
      this.manager.wacelinkOptions.options!.structures.player
		let player = customPlayer
			? new customPlayer(this.manager, options, node)
			: new WacelinkPlayer(this.manager, options, node)
		this.set(player.guildId, player)
		try {
			player = await player.connect()
		} catch (err) {
			this.delete(player.guildId)
			throw err
		}
		const onUpdate = (state: VoiceState) => {
			if (state !== VoiceState.SESSION_READY) return
			player.sendServerUpdate()
		}
		await player.sendServerUpdate()
		player.on('connectionUpdate', onUpdate)
		player.state = WacelinkPlayerState.CONNECTED
		this.debug('Player created at ' + options.guildId)
		this.manager.emit(WacelinkEvents.PlayerCreate, player)
		return player
	}

	/**
   * Destroy a player
   * @returns The destroyed / disconnected player or undefined if none
   * @internal
   */
	public async destroy(guildId: string = ''): Promise<void> {
		const player = this.get(guildId)
		if (player) await player.destroy()
	}

	protected debug(logs: string) {
		this.manager.emit(WacelinkEvents.Debug, `[Wacelink] / [PlayerManager] | ${logs}`)
	}
}
