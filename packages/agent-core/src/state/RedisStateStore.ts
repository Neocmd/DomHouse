import Redis from 'ioredis'
import { config } from '../config.js'
import { logger } from '../logger.js'
import type { DeviceSnapshot, SystemState, RoomState } from '../types.js'

const DEVICE_KEY = (id: string) => `device:${id}`
const SYSTEM_STATE_KEY = 'system:state'
const ROOM_STATE_KEY = (room: string) => `room:${room}:state`
const DEVICE_LAST_SEEN_KEY = (id: string) => `device:${id}:last_seen`

export class RedisStateStore {
  private client: Redis

  constructor() {
    this.client = new Redis(config.redis.url, {
      lazyConnect: true,
      maxRetriesPerRequest: 3,
    })
  }

  async connect(): Promise<void> {
    await this.client.connect()
    logger.info({ url: config.redis.url }, 'Redis connected')
  }

  async disconnect(): Promise<void> {
    await this.client.quit()
  }

  // ── Device state ──────────────────────────────────────────

  async setDeviceSnapshot(id: string, snapshot: DeviceSnapshot): Promise<void> {
    await this.client.set(DEVICE_KEY(id), JSON.stringify(snapshot))
  }

  async getDeviceSnapshot(id: string): Promise<DeviceSnapshot | null> {
    const raw = await this.client.get(DEVICE_KEY(id))
    return raw ? (JSON.parse(raw) as DeviceSnapshot) : null
  }

  async getAllDeviceSnapshots(): Promise<DeviceSnapshot[]> {
    const keys = await this.client.keys('device:*')
    const filtered = keys.filter((k) => !k.includes(':last_seen'))
    if (filtered.length === 0) return []
    const values = await this.client.mget(...filtered)
    return values
      .filter((v): v is string => v !== null)
      .map((v) => JSON.parse(v) as DeviceSnapshot)
  }

  // ── System / room state ───────────────────────────────────

  async setSystemState(state: SystemState): Promise<void> {
    await this.client.set(SYSTEM_STATE_KEY, state)
  }

  async getSystemState(): Promise<SystemState> {
    const val = await this.client.get(SYSTEM_STATE_KEY)
    return (val as SystemState) ?? 'home'
  }

  async setRoomState(room: string, state: RoomState): Promise<void> {
    await this.client.set(ROOM_STATE_KEY(room), state)
  }

  async getRoomState(room: string): Promise<RoomState> {
    const val = await this.client.get(ROOM_STATE_KEY(room))
    return (val as RoomState) ?? 'unknown'
  }

  // ── Generic KV for rule engine context ───────────────────

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const serialized = JSON.stringify(value)
    if (ttlSeconds) {
      await this.client.setex(key, ttlSeconds, serialized)
    } else {
      await this.client.set(key, serialized)
    }
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    const raw = await this.client.get(key)
    return raw ? (JSON.parse(raw) as T) : null
  }

  getClient(): Redis {
    return this.client
  }
}
