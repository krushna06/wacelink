// Modded from: https://github.com/shipgirlproject/Shoukaku/blob/396aa531096eda327ade0f473f9807576e9ae9df/src/connectors/Connector.ts
// Special thanks to shipgirlproject team!

import { WacelinkNodeOptions } from '../Interface/Manager'
import { Wacelink } from '../Wacelink'
import { LavalinkLoadType } from '../Interface/Constants'
import { WacelinkNode } from './WacelinkNode'
import {
	LavalinkPlayer,
	LavalinkResponse,
	LavalinkStats,
	WacelinkRequesterOptions,
	RawTrack,
	RoutePlanner,
	UpdatePlayerInfo,
} from '../Interface/Rest'
import { NodeInfo } from '../Interface/Node'

/**
 * The rest class for get and calling
 * from audio sending node/server REST API
 */
export class WacelinkRest {
	/** The wacelink manager */
	public manager: Wacelink
	protected options: WacelinkNodeOptions
	/** The node manager (WacelinkNode class) */
	public nodeManager: WacelinkNode
	protected sessionId: string | null

	/**
   * The lavalink rest server handler class
   * @param manager The wacelink manager
   * @param options The wacelink node options, from WacelinkNodeOptions interface
   * @param nodeManager The wacelink's lavalink server handler class
   */
	constructor(manager: Wacelink, options: WacelinkNodeOptions, nodeManager: WacelinkNode) {
		this.manager = manager
		this.options = options
		this.nodeManager = nodeManager
		this.sessionId = this.nodeManager.driver.sessionId ? this.nodeManager.driver.sessionId : ''
	}

	/**
   * Gets all the player with the specified sessionId
   * @returns Promise that resolves to an array of Lavalink players
   */
	public async getPlayers(): Promise<LavalinkPlayer[]> {
		const options: WacelinkRequesterOptions = {
			path: `/sessions/${this.sessionId}/players`,
			headers: { 'content-type': 'application/json' },
		}
		return (await this.nodeManager.driver.requester<LavalinkPlayer[]>(options)) ?? []
	}

	/**
   * Gets current lavalink status
   * @returns Promise that resolves to an object of current lavalink status
   */
	public async getStatus(): Promise<LavalinkStats | undefined> {
		const options: WacelinkRequesterOptions = {
			path: '/stats',
			headers: { 'content-type': 'application/json' },
		}
		return await this.nodeManager.driver.requester<LavalinkStats>(options)
	}

	/**
   * Decode a single track from "encoded" properties
   * @returns Promise that resolves to an object of raw track
   */
	public async decodeTrack(base64track: string): Promise<RawTrack | undefined> {
		const options: WacelinkRequesterOptions = {
			path: '/decodetrack',
			params: {
				encodedTrack: base64track,
			},
			headers: { 'content-type': 'application/json' },
		}
		return await this.nodeManager.driver.requester<RawTrack>(options)
	}

	/**
   * Updates a Lavalink player
   * @returns Promise that resolves to a Lavalink player
   */
	public async updatePlayer(data: UpdatePlayerInfo): Promise<void> {
		const options: WacelinkRequesterOptions = {
			path: `/sessions/${this.sessionId}/players/${data.guildId}`,
			params: { noReplace: data.noReplace?.toString() || 'false' },
			headers: { 'content-type': 'application/json' },
			method: 'PATCH',
			data: data.playerOptions as Record<string, unknown>,
			rawReqData: data,
		}
		await this.nodeManager.driver.requester<LavalinkPlayer>(options)
	}

	/**
   * Destroy a Lavalink player
   * @returns Promise that resolves to a Lavalink player
   */
	public async destroyPlayer(guildId: string): Promise<void> {
		const options: WacelinkRequesterOptions = {
			path: `/sessions/${this.sessionId}/players/${guildId}`,
			headers: { 'content-type': 'application/json' },
			method: 'DELETE',
		}
		await this.nodeManager.driver.requester(options)
	}

	/**
   * A track resolver function to get track from lavalink
   * @returns LavalinkResponse
   */
	public async resolver(data: string): Promise<LavalinkResponse | undefined> {
		const options: WacelinkRequesterOptions = {
			path: '/loadtracks',
			params: { identifier: data },
			headers: { 'content-type': 'application/json' },
			method: 'GET',
		}

		const resData = await this.nodeManager.driver.requester<LavalinkResponse>(options)

		if (!resData) {
			return {
				loadType: LavalinkLoadType.EMPTY,
				data: {},
			}
		} else return resData
	}

	/**
   * Get routeplanner status from Lavalink
   * @returns Promise that resolves to a routeplanner response
   */
	public async getRoutePlannerStatus(): Promise<RoutePlanner | undefined> {
		const options = {
			path: '/routeplanner/status',
			headers: { 'content-type': 'application/json' },
		}
		return await this.nodeManager.driver.requester<RoutePlanner>(options)
	}

	/**
   * Release blacklisted IP address into pool of IPs
   * @param address IP address
   */
	public async unmarkFailedAddress(address: string): Promise<void> {
		const options = {
			path: '/routeplanner/free/address',
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			data: { address },
		}
		await this.nodeManager.driver.requester(options)
	}

	/**
   * Get Lavalink info
   */
	public async getInfo(): Promise<NodeInfo | undefined> {
		const options = {
			path: '/info',
			headers: { 'content-type': 'application/json' },
		}
		return await this.nodeManager.driver.requester(options)
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
}
