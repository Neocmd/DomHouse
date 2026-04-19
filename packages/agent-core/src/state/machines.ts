import { setup, assign } from 'xstate'
import type { SystemState, RoomState, DeviceState } from '../types.js'

// ── System FSM ─────────────────────────────────────────────

export type SystemEvent =
  | { type: 'SET_HOME' }
  | { type: 'SET_AWAY' }
  | { type: 'SET_NIGHT' }
  | { type: 'SET_VACATION' }
  | { type: 'PRESENCE_DETECTED' }
  | { type: 'PRESENCE_LOST'; afterMinutes: number }

export const systemMachine = setup({
  types: {
    context: {} as { state: SystemState; changedAt: number },
    events: {} as SystemEvent,
  },
}).createMachine({
  id: 'system',
  initial: 'home',
  context: { state: 'home' as SystemState, changedAt: Date.now() },
  states: {
    home: {
      entry: assign(() => ({ state: 'home' as SystemState, changedAt: Date.now() })),
      on: {
        SET_AWAY: 'away',
        SET_NIGHT: 'night',
        SET_VACATION: 'vacation',
        PRESENCE_LOST: {
          target: 'away',
          guard: ({ event }) => event.afterMinutes >= 30,
        },
      },
    },
    away: {
      entry: assign(() => ({ state: 'away' as SystemState, changedAt: Date.now() })),
      on: {
        SET_HOME: 'home',
        SET_VACATION: 'vacation',
        PRESENCE_DETECTED: 'home',
      },
    },
    night: {
      entry: assign(() => ({ state: 'night' as SystemState, changedAt: Date.now() })),
      on: {
        SET_HOME: 'home',
        SET_AWAY: 'away',
        PRESENCE_DETECTED: 'home',
      },
    },
    vacation: {
      entry: assign(() => ({ state: 'vacation' as SystemState, changedAt: Date.now() })),
      on: {
        SET_HOME: 'home',
        PRESENCE_DETECTED: 'home',
      },
    },
  },
})

// ── Room FSM ──────────────────────────────────────────────

export type RoomEvent =
  | { type: 'MOTION_DETECTED' }
  | { type: 'MOTION_CLEARED' }
  | { type: 'FORCE_OCCUPIED' }
  | { type: 'FORCE_EMPTY' }

export const roomMachine = setup({
  types: {
    context: {} as { state: RoomState; room: string; lastMotion: number },
    events: {} as RoomEvent,
    input: {} as { room: string },
  },
}).createMachine({
  id: 'room',
  initial: 'unknown',
  context: ({ input }) => ({
    state: 'unknown' as RoomState,
    room: input.room,
    lastMotion: 0,
  }),
  states: {
    unknown: {
      on: {
        MOTION_DETECTED: 'occupied',
        FORCE_OCCUPIED: 'occupied',
        FORCE_EMPTY: 'empty',
      },
    },
    occupied: {
      entry: assign(() => ({ state: 'occupied' as RoomState, lastMotion: Date.now() })),
      on: {
        MOTION_CLEARED: 'empty',
        FORCE_EMPTY: 'empty',
      },
    },
    empty: {
      entry: assign(() => ({ state: 'empty' as RoomState })),
      on: {
        MOTION_DETECTED: 'occupied',
        FORCE_OCCUPIED: 'occupied',
      },
    },
  },
})

// ── Device FSM ────────────────────────────────────────────

export type DeviceEvent =
  | { type: 'STATE_RECEIVED'; payload: Record<string, unknown> }
  | { type: 'UNREACHABLE' }
  | { type: 'RECOVERY' }
  | { type: 'ERROR'; message: string }

export const deviceMachine = setup({
  types: {
    context: {} as {
      state: DeviceState
      deviceId: string
      payload: Record<string, unknown>
      lastSeen: number
      errorMessage?: string
    },
    events: {} as DeviceEvent,
    input: {} as { deviceId: string },
  },
}).createMachine({
  id: 'device',
  initial: 'unknown',
  context: ({ input }) => ({
    state: 'unknown' as DeviceState,
    deviceId: input.deviceId,
    payload: {} as Record<string, unknown>,
    lastSeen: 0,
  }),
  states: {
    unknown: {
      on: {
        STATE_RECEIVED: {
          target: 'online',
          actions: assign(({ event }) => ({
            payload: event.payload,
            lastSeen: Date.now(),
            state: deriveDeviceState(event.payload),
          })),
        },
        UNREACHABLE: 'unreachable',
      },
    },
    online: {
      on: {
        STATE_RECEIVED: {
          actions: assign(({ event }) => ({
            payload: event.payload,
            lastSeen: Date.now(),
            state: deriveDeviceState(event.payload),
          })),
        },
        UNREACHABLE: 'unreachable',
        ERROR: {
          target: 'error',
          actions: assign(({ event }) => ({ errorMessage: event.message })),
        },
      },
    },
    unreachable: {
      entry: assign(() => ({ state: 'unreachable' as DeviceState })),
      on: {
        RECOVERY: 'unknown',
        STATE_RECEIVED: {
          target: 'online',
          actions: assign(({ event }) => ({
            payload: event.payload,
            lastSeen: Date.now(),
            state: deriveDeviceState(event.payload),
          })),
        },
      },
    },
    error: {
      entry: assign(() => ({ state: 'error' as DeviceState })),
      on: {
        RECOVERY: 'unknown',
        STATE_RECEIVED: {
          target: 'online',
          actions: assign(({ event }) => ({
            payload: event.payload,
            lastSeen: Date.now(),
            state: 'unknown' as DeviceState,
          })),
        },
      },
    },
  },
})

function deriveDeviceState(payload: Record<string, unknown>): DeviceState {
  if ('state' in payload) {
    const s = String(payload['state']).toLowerCase()
    if (s === 'on' || s === 'true' || s === '1') return 'on'
    if (s === 'off' || s === 'false' || s === '0') return 'off'
  }
  if ('on' in payload) {
    return payload['on'] ? 'on' : 'off'
  }
  return 'unknown'
}
