import type { MqttMessage } from '../types.js'

export type MessageHandler = (msg: ParsedMqttMessage) => void | Promise<void>

export interface ParsedMqttMessage {
  topic: string
  topicParts: string[]
  payload: unknown
  raw: Buffer
  receivedAt: number
}

/**
 * Universal contract for MQTT communication.
 * All device adapters and internal services implement this.
 */
export interface MessageBrokerInterface {
  publish(topic: string, payload: unknown, options?: PublishOptions): Promise<void>
  subscribe(topicPattern: string, handler: MessageHandler): void
  unsubscribe(topicPattern: string): void
  isConnected(): boolean
}

export interface PublishOptions {
  qos?: 0 | 1 | 2
  retain?: boolean
}

export function parsePayload(raw: Buffer): unknown {
  const str = raw.toString('utf8').trim()
  try {
    return JSON.parse(str)
  } catch {
    const num = Number(str)
    if (!isNaN(num)) return num
    return str
  }
}

export function serializePayload(payload: unknown): string {
  if (typeof payload === 'string') return payload
  return JSON.stringify(payload)
}
