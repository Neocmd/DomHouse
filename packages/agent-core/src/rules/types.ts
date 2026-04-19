export interface MqttTrigger {
  type: 'mqtt'
  topic: string
  payloadMatch?: Record<string, unknown>
}

export interface CronTrigger {
  type: 'cron'
  expression: string
}

export interface StateChangeTrigger {
  type: 'state_change'
  entity: 'system' | 'room' | 'device'
  id: string
  to?: string
  from?: string
}

export interface ThresholdTrigger {
  type: 'threshold'
  deviceId: string
  field: string
  operator: '>' | '<' | '>=' | '<=' | '==' | '!='
  value: number
  forSeconds?: number
}

export type Trigger = MqttTrigger | CronTrigger | StateChangeTrigger | ThresholdTrigger

export interface Condition {
  type: 'system_state' | 'room_state' | 'device_state' | 'time_range' | 'device_payload'
  entity?: string
  operator?: '==' | '!=' | '>' | '<' | '>=' | '<='
  value?: unknown
  from?: string
  to?: string
}

export interface MqttPublishAction {
  type: 'mqtt_publish'
  topic: string
  payload: unknown
  qos?: 0 | 1 | 2
}

export interface TriggerScenarioAction {
  type: 'trigger_scenario'
  name: string
  params?: Record<string, unknown>
}

export interface SetSystemStateAction {
  type: 'set_system_state'
  state: 'home' | 'away' | 'night' | 'vacation'
}

export interface LogAction {
  type: 'log'
  message: string
  level?: 'info' | 'warn' | 'error'
}

export type Action =
  | MqttPublishAction
  | TriggerScenarioAction
  | SetSystemStateAction
  | LogAction

export interface RuleDefinition {
  id: string
  name: string
  enabled?: boolean
  trigger: Trigger
  conditions?: Condition[]
  actions: Action[]
}
