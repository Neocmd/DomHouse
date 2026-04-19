export type DeviceType =
  | 'light'
  | 'switch'
  | 'sensor'
  | 'lock'
  | 'climate'
  | 'media'
  | 'blind'
  | 'camera'
  | 'alarm'
  | 'presence'

export type DeviceState = 'on' | 'off' | 'unreachable' | 'error' | 'unknown'
export type SystemState = 'home' | 'away' | 'night' | 'vacation'
export type RoomState = 'occupied' | 'empty' | 'unknown'

export interface DeviceConfig {
  id: string
  name: string
  type: DeviceType
  room: string
  topic: {
    state: string
    set: string
    config?: string
  }
  capabilities: string[]
  meta?: Record<string, unknown>
}

export interface DeviceSnapshot {
  id: string
  state: DeviceState
  payload: Record<string, unknown>
  lastSeen: number
}

export interface MqttMessage {
  topic: string
  payload: Buffer
  qos: 0 | 1 | 2
  retain: boolean
}

export interface ParsedMessage {
  topic: string
  payload: Record<string, unknown> | string | number | boolean
  receivedAt: number
}

export type TriggerType = 'mqtt' | 'cron' | 'state_change' | 'threshold'
export type ActionType = 'mqtt_publish' | 'trigger_scenario' | 'set_system_state' | 'log'
