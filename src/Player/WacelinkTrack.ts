import { WacelinkEvents } from '../Interface/Constants'
import { WacelinkSearchResult, WacelinkSearchResultType } from '../Interface/Manager'
import { RawTrack } from '../Interface/Rest'
import { ResolveOptions } from '../Interface/Track'
import { WacelinkPlayer } from './WacelinkPlayer'

/**
 * A class for managing track info
 */
export class WacelinkTrack {
	/** Encoded string from lavalink */
	encoded: string
	/** Identifier string from lavalink */
	identifier: string
	/** Whenever track is seekable or not */
	isSeekable: boolean
	/** Track's author */
	author: string
	/** Track's duration */
	duration: number
	/** Whenever track is stream able or not */
	isStream: boolean
	/** Track's position */
	position: number
	/** Track's title */
	title: string
	/** Track's URL */
	uri: string | null = null
	/** Track's artwork URL */
	artworkUrl: string | null = null
	/** Track's isrc */
	isrc: string | null = null
	/** Track's source name */
	source: string
	/** Data from lavalink plugin */
	pluginInfo: unknown
	/** Track's requester */
	requester: unknown
	/** Track's realUri (youtube fall back) */
	realUri: string | null = null
	/** Name of the driver that search this track */
	driverName?: string

	/**
   * The wacelink track class for playing track from lavalink
   * @param options The raw track resolved from rest, use RawTrack interface
   * @param requester The requester details of this track
   */
	constructor(
    protected options: RawTrack,
    requester: unknown,
    driverName?: string
	) {
		this.encoded = options.encoded
		this.identifier = options.info.identifier
		this.isSeekable = options.info.isSeekable
		this.author = options.info.author
		this.duration = options.info.length
		this.isStream = options.info.isStream
		this.position = options.info.position
		this.title = options.info.title
		this.uri = options.info.uri
		this.artworkUrl = options.info.artworkUrl
		this.isrc = options.info.isrc
		this.source = options.info.sourceName
		this.pluginInfo = options.pluginInfo
		this.requester = requester
		this.realUri = null
		this.driverName = driverName
	}

	/**
   * Whenever track is able to play or not
   * @returns boolean
   */
	get isPlayable(): boolean {
		return (
			!!this.encoded &&
      !!this.source &&
      !!this.identifier &&
      !!this.author &&
      !!this.duration &&
      !!this.title &&
      !!this.uri
		)
	}

	/**
   * Get all raw details of the track
   * @returns RawTrack
   */
	get raw(): RawTrack {
		return {
			encoded: this.encoded,
			info: {
				identifier: this.identifier,
				isSeekable: this.isSeekable,
				author: this.author,
				length: this.duration,
				isStream: this.isStream,
				position: this.position,
				title: this.title,
				uri: this.uri,
				artworkUrl: this.artworkUrl,
				isrc: this.isrc,
				sourceName: this.source,
			},
			pluginInfo: this.pluginInfo,
		}
	}

	/** @ignore */
	public async resolver(player: WacelinkPlayer, options?: ResolveOptions): Promise<WacelinkTrack> {
		const { overwrite } = options ? options : { overwrite: false }

		if (this.isPlayable && this.driverName == player.node.driver.id) {
			this.realUri = this.raw.info.uri
			return this
		}

		player.manager.emit(
			WacelinkEvents.Debug,
			`[Wacelink] / [Track] | Resolving ${this.source} track ${this.title}; Source: ${this.source}`
		)

		const result = await this.getTrack(player)
		if (!result) throw new Error('No results found')

		this.encoded = result.encoded
		this.realUri = result.info.uri
		this.duration = result.info.length

		if (overwrite) {
			this.title = result.info.title
			this.identifier = result.info.identifier
			this.isSeekable = result.info.isSeekable
			this.author = result.info.author
			this.duration = result.info.length
			this.isStream = result.info.isStream
			this.uri = result.info.uri
		}
		return this
	}

	protected async getTrack(player: WacelinkPlayer): Promise<RawTrack> {
		const result = await this.resolverEngine(player)

		if (!result || !result.tracks.length) throw new Error('No results found')

		const rawTracks = result.tracks.map((x) => x.raw)

		if (this.author) {
			const author = [this.author, `${this.author} - Topic`]
			const officialTrack = rawTracks.find(
				(track) =>
					author.some((name) =>
						new RegExp(`^${this.escapeRegExp(name)}$`, 'i').test(track.info.author)
					) || new RegExp(`^${this.escapeRegExp(this.title)}$`, 'i').test(track.info.title)
			)
			if (officialTrack) return officialTrack
		}
		if (this.duration) {
			const sameDuration = rawTracks.find(
				(track) =>
					track.info.length >= (this.duration ? this.duration : 0) - 2000 &&
          track.info.length <= (this.duration ? this.duration : 0) + 2000
			)
			if (sameDuration) return sameDuration
		}

		return rawTracks[0]
	}

	protected escapeRegExp(string: string) {
		return string.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&')
	}

	protected async resolverEngine(player: WacelinkPlayer): Promise<WacelinkSearchResult> {
		const defaultSearchEngine = player.manager.wacelinkOptions.options!.defaultSearchEngine
		const engine = player.manager.searchEngines.get(this.source || defaultSearchEngine || 'youtube')
		const searchQuery = [this.author, this.title].filter((x) => !!x).join(' - ')
		const searchFallbackEngineName = player.manager.wacelinkOptions.options!.searchFallback!.engine
		const searchFallbackEngine = player.manager.searchEngines.get(searchFallbackEngineName)

		const prase1 = await player.search(`directSearch=${this.uri}`, {
			requester: this.requester,
		})
		if (prase1.tracks.length !== 0) return prase1

		const prase2 = await player.search(`directSearch=${engine}search:${searchQuery}`, {
			requester: this.requester,
		})
		if (prase2.tracks.length !== 0) return prase2

		if (player.manager.wacelinkOptions.options!.searchFallback?.enable && searchFallbackEngine) {
			const prase3 = await player.search(
				`directSearch=${searchFallbackEngine}search:${searchQuery}`,
				{
					requester: this.requester,
				}
			)
			if (prase3.tracks.length !== 0) return prase3
		}

		return {
			type: WacelinkSearchResultType.SEARCH,
			playlistName: undefined,
			tracks: [],
		}
	}
}
