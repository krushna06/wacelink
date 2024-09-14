import { WacelinkRequesterOptions } from '../Interface/Rest'
import { WacelinkDatabase } from '../Utilities/WacelinkDatabase'
import { WacelinkNode } from '../Node/WacelinkNode'
import { WacelinkWebsocket } from '../Utilities/WacelinkWebsocket'
import { WacelinkPlayer } from '../Player/WacelinkPlayer'
import { Wacelink } from '../Wacelink'

/**
 * The abstract class for developing driver
 * to use another audio sending server.
 */
export abstract class AbstractDriver {
  /**  The id for the driver*/
  abstract id: string
  /** Ws url for dealing connection to lavalink/nodelink server */
  abstract wsUrl: string
  /** Http url for dealing rest request to lavalink/nodelink server */
  abstract httpUrl: string
  /** The lavalink server season id to resume */
  abstract sessionId: string | null
  /** All function to extend support driver on WacelinkPlayer class */
  abstract playerFunctions: WacelinkDatabase<(player: WacelinkPlayer, ...args: any) => unknown>
  /** All function to extend support driver on Wacelink class */
  abstract functions: WacelinkDatabase<(manager: Wacelink, ...args: any) => unknown>
  /** Wacelink manager class */
  abstract manager: Wacelink
  /** Wacelink reuqested lavalink/nodelink server */
  abstract node: WacelinkNode

  /**
   * Connect to lavalink/nodelink server
   * @returns WebSocket
   */
  abstract connect(): WacelinkWebsocket
  /**
   * Fetch function for dealing rest request to lavalink/nodelink server
   * @returns Promise<D | undefined>
   */
  abstract requester<D = any>(options: WacelinkRequesterOptions): Promise<D | undefined>
  /**
   * Close the lavalink/nodelink server
   * @returns void
   */
  abstract wsClose(): void
  /**
   * Update a season to resume able or not
   * @returns void
   */
  abstract updateSession(sessionId: string, mode: boolean, timeout: number): Promise<void>
}
