import { createActor } from 'xstate'
import { systemMachine, roomMachine, deviceMachine } from './machines.js'
import type { SystemEvent, RoomEvent, DeviceEvent } from './machines.js'
import { RedisStateStore } from './RedisStateStore.js'
import { InfluxWriter } from './InfluxWriter.js'
import { logger } from '../logger.js'
import type { SystemState, RoomState, DeviceSnapshot } from '../types.js'

type SystemActor = ReturnType<typeof createActor<typeof systemMachine>>
type RoomActor = ReturnType<typeof createActor<typeof roomMachine>>
type DeviceActor = ReturnType<typeof createActor<typeof deviceMachine>>

export interface StateChangeEvent {
  type: 'system' | 'room' | 'device'
  id: string
  previousState: string
  currentState: string
  payload?: Record<string, unknown>
}

type StateChangeListener = (event: StateChangeEvent) => void

export class StateManager {
  private systemActor: SystemActor
  private roomActors = new Map<string, RoomActor>()
  private deviceActors = new Map<string, DeviceActor>()
  private listeners: StateChangeListener[] = []

  constructor(
    private redis: RedisStateStore,
    private influx: InfluxWriter,
  ) {
    this.systemActor = createActor(systemMachine)
    this.systemActor.subscribe((snapshot) => {
      const state = snapshot.context.state as SystemState
      this.redis.setSystemState(state)
      this.influx.writeSystemStateChange(state)
    })
    this.systemActor.start()
  }

  // ── System ────────────────────────────────────────────────

  sendSystemEvent(event: SystemEvent): void {
    const prev = this.getSystemState()
    this.systemActor.send(event)
    const next = this.getSystemState()
    if (prev !== next) {
      logger.info({ prev, next }, 'System state changed')
      this.emit({ type: 'system', id: 'system', previousState: prev, currentState: next })
    }
  }

  getSystemState(): SystemState {
    return this.systemActor.getSnapshot().context.state
  }

  // ── Rooms ─────────────────────────────────────────────────

  ensureRoom(room: string): RoomActor {
    if (!this.roomActors.has(room)) {
      const actor = createActor(roomMachine, { input: { room } })
      actor.subscribe((snapshot) => {
        this.redis.setRoomState(room, snapshot.context.state as RoomState)
      })
      actor.start()
      this.roomActors.set(room, actor)
    }
    return this.roomActors.get(room)!
  }

  sendRoomEvent(room: string, event: RoomEvent): void {
    const actor = this.ensureRoom(room)
    const prev = actor.getSnapshot().context.state
    actor.send(event)
    const next = actor.getSnapshot().context.state
    if (prev !== next) {
      logger.debug({ room, prev, next }, 'Room state changed')
      this.emit({ type: 'room', id: room, previousState: prev, currentState: next })
    }
  }

  getRoomState(room: string): RoomState {
    const actor = this.roomActors.get(room)
    return (actor?.getSnapshot().context.state as RoomState) ?? 'unknown'
  }

  // ── Devices ───────────────────────────────────────────────

  ensureDevice(deviceId: string): DeviceActor {
    if (!this.deviceActors.has(deviceId)) {
      const actor = createActor(deviceMachine, { input: { deviceId } })
      actor.subscribe((snapshot) => {
        const snap: DeviceSnapshot = {
          id: deviceId,
          state: snapshot.context.state,
          payload: snapshot.context.payload,
          lastSeen: snapshot.context.lastSeen,
        }
        this.redis.setDeviceSnapshot(deviceId, snap)
      })
      actor.start()
      this.deviceActors.set(deviceId, actor)
    }
    return this.deviceActors.get(deviceId)!
  }

  sendDeviceEvent(deviceId: string, room: string, event: DeviceEvent): void {
    const actor = this.ensureDevice(deviceId)
    const prev = actor.getSnapshot().context.state
    actor.send(event)
    const next = actor.getSnapshot().context.state
    const payload = actor.getSnapshot().context.payload

    if (prev !== next) {
      logger.debug({ deviceId, prev, next }, 'Device state changed')
      this.influx.writeDeviceStateChange(deviceId, room, next)
      this.emit({ type: 'device', id: deviceId, previousState: prev, currentState: next, payload })
    }

    // Always write numeric/boolean payload fields to InfluxDB
    for (const [field, value] of Object.entries(payload)) {
      if (typeof value === 'number' || typeof value === 'boolean') {
        this.influx.writeSensorValue(deviceId, room, field, value)
      }
    }
  }

  getDeviceSnapshot(deviceId: string): DeviceSnapshot | null {
    const actor = this.deviceActors.get(deviceId)
    if (!actor) return null
    const ctx = actor.getSnapshot().context
    return { id: deviceId, state: ctx.state, payload: ctx.payload, lastSeen: ctx.lastSeen }
  }

  // ── Listeners ─────────────────────────────────────────────

  onStateChange(listener: StateChangeListener): void {
    this.listeners.push(listener)
  }

  private emit(event: StateChangeEvent): void {
    for (const listener of this.listeners) {
      try { listener(event) } catch {}
    }
  }
}
