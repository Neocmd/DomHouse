import mqtt, { type MqttClient as MqttJsClient } from 'mqtt'
import { config } from '../config.js'
import { logger } from '../logger.js'
import {
  type MessageBrokerInterface,
  type MessageHandler,
  type PublishOptions,
  type ParsedMqttMessage,
  parsePayload,
  serializePayload,
} from './MessageBrokerInterface.js'

export class MqttClient implements MessageBrokerInterface {
  private client: MqttJsClient | null = null
  private subscriptions = new Map<string, Set<MessageHandler>>()
  private connected = false

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client = mqtt.connect(config.mqtt.url, {
        clientId: config.mqtt.clientId,
        reconnectPeriod: config.mqtt.reconnectPeriod,
        keepalive: config.mqtt.keepalive,
        clean: true,
      })

      this.client.once('connect', () => {
        this.connected = true
        logger.info({ url: config.mqtt.url }, 'MQTT connected')
        resolve()
      })

      this.client.once('error', (err) => {
        logger.error({ err }, 'MQTT connect error')
        reject(err)
      })

      this.client.on('reconnect', () => {
        logger.warn('MQTT reconnecting')
      })

      this.client.on('close', () => {
        this.connected = false
        logger.warn('MQTT disconnected')
      })

      this.client.on('message', (topic, payload) => {
        this.dispatch(topic, payload)
      })
    })
  }

  async publish(topic: string, payload: unknown, options: PublishOptions = {}): Promise<void> {
    if (!this.client || !this.connected) throw new Error('MQTT not connected')
    const str = serializePayload(payload)
    return new Promise((resolve, reject) => {
      this.client!.publish(topic, str, { qos: options.qos ?? 1, retain: options.retain ?? false }, (err) => {
        if (err) reject(err)
        else resolve()
      })
    })
  }

  subscribe(topicPattern: string, handler: MessageHandler): void {
    if (!this.subscriptions.has(topicPattern)) {
      this.subscriptions.set(topicPattern, new Set())
      this.client?.subscribe(topicPattern, { qos: 1 })
    }
    this.subscriptions.get(topicPattern)!.add(handler)
  }

  unsubscribe(topicPattern: string): void {
    this.subscriptions.delete(topicPattern)
    this.client?.unsubscribe(topicPattern)
  }

  isConnected(): boolean {
    return this.connected
  }

  private dispatch(topic: string, raw: Buffer): void {
    const msg: ParsedMqttMessage = {
      topic,
      topicParts: topic.split('/'),
      payload: parsePayload(raw),
      raw,
      receivedAt: Date.now(),
    }

    for (const [pattern, handlers] of this.subscriptions) {
      if (topicMatches(pattern, topic)) {
        for (const handler of handlers) {
          Promise.resolve(handler(msg)).catch((err) => {
            logger.error({ err, topic }, 'Message handler error')
          })
        }
      }
    }
  }

  async disconnect(): Promise<void> {
    return new Promise((resolve) => {
      this.client?.end(false, {}, resolve)
    })
  }
}

function topicMatches(pattern: string, topic: string): boolean {
  const patternParts = pattern.split('/')
  const topicParts = topic.split('/')

  let pi = 0
  let ti = 0

  while (pi < patternParts.length && ti < topicParts.length) {
    if (patternParts[pi] === '#') return true
    if (patternParts[pi] !== '+' && patternParts[pi] !== topicParts[ti]) return false
    pi++
    ti++
  }

  return pi === patternParts.length && ti === topicParts.length
}
