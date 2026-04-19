import { setup, assign, fromCallback } from 'xstate'
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
  context: { state: 'home', changedAt: Date.now() },
  states: {
    home: {
      entry: assign({ state: 'home', changedAt: () => Date.now() }),
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
      entry: assign({ state: 'away', changedAt: () => Date.now() }),
      on: {
        SET_HOME: 'home',
        SET_VACATION: 'vacation',
        PRESENCE_DETECTED: 'home',
      },
    },
    night: {
      entry: assign({ state: 'night', changedAt: () => Date.now() }),
      on: {
        SET_HOME: 'home',
        SET_AWAY: 'away',
        PRESENCE_DETECTED: 'home',
      },
    },
    vacation: {
      entry: assign({ state: 'vacation', changedAt: () => Date.now() }),
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
    state: 'unknown',
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
      entry: assign({ state: 'occupied', lastMotion: () => Date.now() }),
      on: {
        MOTION_CLEARED: 'empty',
        FORCE_EMPTY: 'empty',
      },
    },
    empty: {
      entry: assign({ state: 'empty' }),
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
    state: 'unknown',
    deviceId: input.deviceId,
    payload: {},
    lastSeen: 0,
  }),
  states: {
    unknown: {
      on: {
        STATE_RECEIVED: {
          target: 'online',
          actions: assign({
            payload: ({ event }) => event.payload,
            lastSeen: () => Date.now(),
            state: ({ event }) => deriveDeviceState(event.payload),
          }),
        },
        UNREACHABLE: 'unreachable',
      },
    },
    online: {
      on: {
        STATE_RECEIVED: {
          actions: assign({
            payload: ({ event }) => event.payload,
            lastSeen: () => Date.now(),
            state: ({ event }) => deriveDeviceState(event.payload),
          }),
        },
        UNREACHABLE: 'unreachable',
        ERROR: {
          target: 'error',
          actions: assign({ errorMessage: ({ event }) => event.message }),
        },
      },
    },
    unreachable: {
      entry: assign({ state: 'unreachable' }),
      on: {
        RECOVERY: 'unknown',
        STATE_RECEIVED: {
          target: 'online',
          actions: assign({
            payload: ({ event }) => event.payload,
            lastSeen: () => Date.now(),
            state: ({ event }) => deriveDeviceState(event.payload),
          }),
        },
      },
    },
    error: {
      entry: assign({ state: 'error' }),
      on: {
        RECOVERY: 'unknown',
        STATE_RECEIVED: {
          target: 'online',
          actions: assign({
            payload: ({ event }) => event.payload,
            lastSeen: () => Date.now(),
            state: () => 'unknown',
          }),
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
