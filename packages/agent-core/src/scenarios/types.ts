export type StepMode = 'sequential' | 'parallel'

export interface MqttPublishStep {
  type: 'mqtt_publish'
  topic: string
  payload: unknown
  qos?: 0 | 1 | 2
  delayMs?: number
}

export interface WaitStep {
  type: 'wait'
  ms: number
}

export interface SetSystemStateStep {
  type: 'set_system_state'
  state: 'home' | 'away' | 'night' | 'vacation'
}

export interface TriggerScenarioStep {
  type: 'trigger_scenario'
  name: string
}

export type ScenarioStep =
  | MqttPublishStep
  | WaitStep
  | SetSystemStateStep
  | TriggerScenarioStep

export interface ScenarioDefinition {
  name: string
  description?: string
  mode?: StepMode
  timeoutMs?: number
  steps: ScenarioStep[]
  rollback?: ScenarioStep[]
}
