import { AbstractLibrary } from './AbstractLibrary'
import { WacelinkNodeOptions } from '../Interface/Manager'

export class Seyfert extends AbstractLibrary {
	public sendPacket(shardId: number, payload: any): void {
		return this.client.gateway.send(shardId, payload)
	}
	public getId(): string {
		return this.client.botId
	}

	public getShardCount(): number {
		return this.client.gateway.totalShards
	}

	public listen(nodes: WacelinkNodeOptions[]): void {
		this.client.events.values.RAW = {
			data: { name: 'raw' },
			run: (packet: any) => {
				if (packet.t === 'READY') return this.ready(nodes)
				return this.raw(packet)
			},
		}
	}
}
