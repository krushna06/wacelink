import { metadata } from './metadata'
import Library from './Library'

// Export main class
export * from './Wacelink'
// Export player class
export * from './Player/WacelinkPlayer'
export * from './Player/WacelinkQueue'
export * from './Player/WacelinkTrack'
export * from './Player/WacelinkFilter'
// Export node class
export * from './Node/WacelinkNode'
export * from './Node/WacelinkRest'
export * from './Node/WacelinkPlayerEvents'
// Export manager class
export * from './Manager/WacelinkNodeManager'
export * from './Manager/WacelinkPlayerManager'
//// Export library class
export * from './Library/AbstractLibrary'
export { Library }
//Export interface
export * from './Interface/Connection'
export * from './Interface/Constants'
export * from './Interface/Manager'
export * from './Interface/Node'
export * from './Interface/Player'
export * from './Interface/Rest'
export * from './Interface/Track'
export * from './Interface/Events'
// Export plugin
export * from './Plugin/WacelinkPlugin'
export * from './Plugin/SourceWacelinkPlugin'
// Export driver
export * from './Drivers/AbstractDriver'
export * from './Drivers/Lavalink3'
export * from './Drivers/Lavalink4'
export * from './Drivers/Nodelink2'
// Export utilities
export * from './Utilities/WacelinkDatabase'
export * from './Utilities/WacelinkWebsocket'
export * from './Utilities/AbstractDecoder'
export * from './Utilities/LavalinkDecoder'
// Export metadata
export * from './metadata'
export const version = metadata.version
