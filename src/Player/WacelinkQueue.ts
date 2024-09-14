import { WacelinkEvents } from '../Interface/Constants'
import { Wacelink } from '../Wacelink'
import { WacelinkPlayer } from './WacelinkPlayer'
import { WacelinkTrack } from './WacelinkTrack'

/**
 * A class for managing track queue
 */
export class WacelinkQueue extends Array<WacelinkTrack> {
	/** Wacelink manager */
	manager: Wacelink
	/** Wacelink player */
	player: WacelinkPlayer

	/**
   * The wacelink track queue handler class
   * @param manager The wacelink manager
   * @param player The current wacelink player
   */
	constructor(manager: Wacelink, player: WacelinkPlayer) {
		super()
		this.manager = manager
		this.player = player
	}

	/** Get the size of queue */
	public get size() {
		return this.length
	}

	/** Get the size of queue including current */
	public get totalSize(): number {
		return this.length + (this.current ? 1 : 0)
	}

	/** Check if the queue is empty or not */
	public get isEmpty() {
		return this.length === 0
	}

	/** Get the queue's duration */
	public get duration() {
		return this.reduce((acc, cur) => acc + (cur.duration || 0), 0)
	}

	/** Current playing track */
	public current: WacelinkTrack | undefined | null = null
	/** Previous playing tracks */
	public previous: WacelinkTrack[] = []

	/**
   * Add track(s) to the queue
   * @param track WacelinkTrack to add
   * @returns WacelinkQueue
   */
	public add(track: WacelinkTrack | WacelinkTrack[]): WacelinkQueue {
		if (Array.isArray(track) && track.some((t) => !(t instanceof WacelinkTrack)))
			throw new Error('Track must be an instance of WacelinkTrack')
		if (!Array.isArray(track) && !(track instanceof WacelinkTrack)) track = [track]

		if (!this.current) {
			if (Array.isArray(track)) this.current = track.shift()
			else {
				this.current = track
				return this
			}
		}

		if (Array.isArray(track)) for (const t of track) this.push(t)
		else this.push(track)
		this.manager.emit(
			WacelinkEvents.QueueAdd,
			this.player,
			this,
			Array.isArray(track) ? [...track] : [track]
		)
		return this
	}

	/**
   * Remove track from the queue
   * @param position Position of the track
   * @returns WacelinkQueue
   */
	public remove(position: number): WacelinkQueue {
		if (position < 0 || position >= this.length)
			throw new Error('Position must be between 0 and ' + (this.length - 1))
		const track = this[position]
		this.splice(position, 1)
		this.manager.emit(WacelinkEvents.QueueRemove, this.player, this, track)
		return this
	}

	/** Shuffle the queue */
	public shuffle(): WacelinkQueue {
		for (let i = this.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1))
      ;[this[i], this[j]] = [this[j], this[i]]
		}
		this.manager.emit(WacelinkEvents.QueueShuffle, this.player, this)
		return this
	}

	/** Clear the queue */
	public clear(): WacelinkQueue {
		this.splice(0, this.length)
		this.manager.emit(WacelinkEvents.QueueClear, this.player, this)
		return this
	}
}
