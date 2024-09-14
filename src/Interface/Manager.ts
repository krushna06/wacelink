import { AbstractLibrary } from '../Library/AbstractLibrary'
import { WacelinkPlugin } from '../Plugin/WacelinkPlugin'
import { WacelinkTrack } from '../Player/WacelinkTrack'
import { WacelinkNodeManager } from '../Manager/WacelinkNodeManager'
import { WacelinkNode } from '../Node/WacelinkNode'
import { WacelinkRest } from '../Node/WacelinkRest'
import { WacelinkPlayer } from '../Player/WacelinkPlayer'
import { AbstractDriver } from '../Drivers/AbstractDriver'
import { WacelinkQueue } from '../Player/WacelinkQueue'
import { WacelinkFilter } from '../Player/WacelinkFilter'

/**
 * A structure interface
 */
export type Constructor<T> = new (...args: any[]) => T

/**
 * The structures options interface for custom class/structures
 */
export interface Structures {
  /**
   * A custom structure that extends the WacelinkRest class
   */
  rest?: Constructor<WacelinkRest>
  /**
   * A custom structure that extends the WacelinkPlayer class
   */
  player?: Constructor<WacelinkPlayer>
  /**
   * A custom structure that extends the WacelinkQueue class
   */
  queue?: Constructor<WacelinkQueue>
  /**
   * A custom structure that extends the WacelinkQueue class
   */
  filter?: Constructor<WacelinkFilter>
}

/**
 * Wacelink node option interface
 */
export interface WacelinkNodeOptions {
  /** Name for get the lavalink server info in wacelink */
  name: string
  /** The ip address or domain of lavalink server */
  host: string
  /** The port that lavalink server exposed */
  port: number
  /** The password of lavalink server */
  auth: string
  /** Whenever lavalink user ssl or not */
  secure: boolean
  /** The driver class for handling lavalink response */
  driver?: string
}

/**
 * Some wacelink additional config option
 */
export interface WacelinkAdditionalOptions {
  /** Additional custom driver for wacelink (no need 'new' keyword when add). Example: `additionalDriver: Lavalink4` */
  additionalDriver?: Constructor<AbstractDriver>[]
  /** Timeout before trying to reconnect (ms) */
  retryTimeout?: number
  /** Number of times to try and reconnect to Lavalink before giving up */
  retryCount?: number
  /** The retry timeout for voice manager when dealing connection to discord voice server (ms) */
  voiceConnectionTimeout?: number
  /** The default search engine like default search from youtube, spotify,... */
  defaultSearchEngine?: string
  /** The default volume when create a player */
  defaultVolume?: number
  /** Search track from youtube when track resolve failed */
  searchFallback?: {
    /** Whenever enable this search fallback or not */
    enable: boolean
    /** Choose a fallback search engine, recommended soundcloud and youtube */
    engine: string
  }
  /** Whether to resume a connection on disconnect to Lavalink (Server Side) (Note: DOES NOT RESUME WHEN THE LAVALINK SERVER DIES) */
  resume?: boolean
  /** When the seasion is deleted from Lavalink. Use second (Server Side) (Note: DOES NOT RESUME WHEN THE LAVALINK SERVER DIES) */
  resumeTimeout?: number
  /** User Agent to use when making requests to Lavalink */
  userAgent?: string
  /** Node Resolver to use if you want to customize it */
  nodeResolver?: (nodes: WacelinkNodeManager) => Promise<WacelinkNode | undefined>
  /** Custom structures for wacelink to use */
  structures?: Structures
}

/**
 * Wacelink config interface
 */
export interface WacelinkOptions {
  /** The lavalink server credentials array*/
  nodes: WacelinkNodeOptions[]
  /** The discord library for using voice manager, example: discordjs, erisjs. Check {@link Library} */
  library: AbstractLibrary
  /** The wacelink plugins array. Check {@link WacelinkPlugin} */
  plugins?: WacelinkPlugin[]
  /** Wacelink additional options  */
  options?: WacelinkAdditionalOptions
}

/**
 * The type enum of wacelink search function result
 */
export enum WacelinkSearchResultType {
  TRACK = 'TRACK',
  PLAYLIST = 'PLAYLIST',
  SEARCH = 'SEARCH',
}

/**
 * The wacelink search function result interface
 */
export interface WacelinkSearchResult {
  type: WacelinkSearchResultType
  playlistName?: string
  tracks: WacelinkTrack[]
}

/**
 * The wacelink search function options interface
 */
export interface WacelinkSearchOptions {
  /** User info of who request the song */
  requester?: unknown
  /** Which node do user want to use (get using node name) */
  nodeName?: string
  /** Which search engine do user want to use (get using search engine name) */
  engine?: string
}
