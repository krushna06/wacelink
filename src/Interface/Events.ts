import { WacelinkNode } from '../Node/WacelinkNode'
import { WacelinkPlayer } from '../Player/WacelinkPlayer'
import { WacelinkQueue } from '../Player/WacelinkQueue'
import { WacelinkTrack } from '../Player/WacelinkTrack'

export interface WacelinkEventsInterface {
  ////// ------------------------- Node Event ------------------------- /////
  /**
   * Emitted when wacelink have a debug log.
   * @event Wacelink#debug
   */
  debug: [logs: string]
  /**
   * Emitted when a lavalink server is connected.
   * @event Wacelink#nodeConnect
   */
  nodeConnect: [node: WacelinkNode]
  /**
   * Emitted when a lavalink server is disconnected.
   * @event Wacelink#nodeDisconnect
   */
  nodeDisconnect: [node: WacelinkNode, code: number, reason: Buffer]
  /**
   * Emitted when a lavalink server is trying to reconnect.
   * @event Wacelink#nodeReconnect
   */
  nodeReconnect: [node: WacelinkNode]
  /**
   * Emitted when a lavalink server is closed.
   * @event Wacelink#nodeClosed
   */
  nodeClosed: [node: WacelinkNode]
  /**
   * Emitted when a lavalink server is errored.
   * @event Wacelink#nodeError
   */
  nodeError: [node: WacelinkNode, error: Error]

  ////// ------------------------- Player Event ------------------------- /////
  /**
   * Emitted when a player is created.
   * @event Wacelink#playerCreate
   */
  playerCreate: [player: WacelinkPlayer]
  /**
   * Emitted when a player is going to destroyed.
   * @event Wacelink#playerDestroy
   */
  playerDestroy: [player: WacelinkPlayer]
  /**
   * Emitted when a player have an exception.
   * @event Wacelink#playerException
   */
  playerException: [player: WacelinkPlayer, data: Record<string, any>]
  /**
   * Emitted when a player updated info.
   * @event Wacelink#playerUpdate
   */
  playerUpdate: [player: WacelinkPlayer, data: Record<string, any>]
  /**
   * Emitted when a track paused.
   * @event Wacelink#playerPause
   */
  playerPause: [player: WacelinkPlayer, track: WacelinkTrack]
  /**
   * Emitted when a track resumed.
   * @event Wacelink#playerResume
   */
  playerResume: [player: WacelinkPlayer, data: WacelinkTrack]
  /**
   * Emitted when a player's websocket closed.
   * @event Wacelink#playerWebsocketClosed
   */
  playerWebsocketClosed: [player: WacelinkPlayer, data: Record<string, any>]

  ////// ------------------------- Track Event ------------------------- /////
  /**
   * Emitted when a track is going to play.
   * @event Wacelink#trackStart
   */
  trackStart: [player: WacelinkPlayer, track: WacelinkTrack]
  /**
   * Emitted when a track is going to end.
   * @event Wacelink#trackEnd
   */
  trackEnd: [player: WacelinkPlayer, track: WacelinkTrack]
  /**
   * Emitted when a track stucked.
   * @event Wacelink#trackStuck
   */
  trackStuck: [player: WacelinkPlayer, data: Record<string, any>]
  /**
   * Emitted when a track is failed to resolve using fallback search engine.
   * @event Wacelink#trackResolveError
   */
  trackResolveError: [player: WacelinkPlayer, track: WacelinkTrack, message: string]

  ////// ------------------------- Queue Event ------------------------- /////
  /**
   * Emitted when a track added into queue.
   * @event Wacelink#queueAdd
   */
  queueAdd: [player: WacelinkPlayer, queue: WacelinkQueue, track: WacelinkTrack[]]
  /**
   * Emitted when a track removed from queue.
   * @event Wacelink#queueRemove
   */
  queueRemove: [player: WacelinkPlayer, queue: WacelinkQueue, track: WacelinkTrack]
  /**
   * Emitted when a queue shuffled.
   * @event Wacelink#queueShuffle
   */
  queueShuffle: [player: WacelinkPlayer, queue: WacelinkQueue]
  /**
   * Emitted when a queue cleared.
   * @event Wacelink#queueClear
   */
  queueClear: [player: WacelinkPlayer, queue: WacelinkQueue]
  /**
   * Emitted when a queue is empty.
   * @event Wacelink#queueEmpty
   */
  queueEmpty: [player: WacelinkPlayer, queue: WacelinkQueue]
}
