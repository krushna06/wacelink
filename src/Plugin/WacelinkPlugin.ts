import { WacelinkPluginType } from '../Interface/Constants'
import { Wacelink } from '../Wacelink'

/** The interface class for another wacelink plugin, extend it to use */
export class WacelinkPlugin {
	public readonly isWacelinkPlugin: boolean = true
	/** Name function for getting plugin name */
	public name(): string {
		throw new Error('Plugin must implement name() and return a plguin name string')
	}

	/** Type function for diferent type of plugin */
	public type(): WacelinkPluginType {
		throw new Error('Plugin must implement type() and return "sourceResolver" or "default"')
	}

	/** Load function for make the plugin working */
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	public load(manager: Wacelink): void {
		throw new Error('Plugin must implement load()')
	}

	/** unload function for make the plugin stop working */
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	public unload(manager: Wacelink): void {
		throw new Error('Plugin must implement unload()')
	}
}
