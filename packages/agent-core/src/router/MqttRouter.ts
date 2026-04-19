import { logger } from '../logger.js'
import type { MessageBrokerInterface, ParsedMqttMessage } from '../mqtt/MessageBrokerInterface.js'
import type { DeviceRegistry } from '../mqtt/DeviceRegistry.js'
import type { StateManager } from '../state/StateManager.js'
import type { RuleEngine } from '../rules/RuleEngine.js'
import type { DeviceConfig } from '../types.js'

/**
 * Listens to all device state topics and:
 * 1. Updates StateManager with new device state
 * 2. Feeds threshold checks to RuleEngine
 * 3. Handles device auto-discovery (config topic)
 */
export class MqttRouter {
  constructor(
    private broker: MessageBrokerInterface,
    private registry: DeviceRegistry,
    private stateManager: StateManager,
    private ruleEngine: RuleEngine,
  ) {}

  start(): void {
    // home/{room}/{type}/{id}/state
    this.broker.subscribe('home/+/+/+/state', (msg) => {
      this.handleDeviceState(msg)
    })

    // home/{room}/{type}/{id}/config (auto-discovery)
    this.broker.subscribe('home/+/+/+/config', (msg) => {
      this.handleDeviceConfig(msg)
    })

    // domhouse/scenarios/{name}/trigger
    this.broker.subscribe('domhouse/scenarios/+/trigger', (msg) => {
      const scenarioName = msg.topicParts[2]
      logger.debug({ scenarioName }, 'Scenario trigger via MQTT')
    })

    logger.info('MQTT Router started')
  }

  private handleDeviceState(msg: ParsedMqttMessage): void {
    const [, room, type, id] = msg.topicParts
    if (!room || !type || !id) return

    const deviceId = `${room}.${type}.${id}`
    const payload =
      typeof msg.payload === 'object' && msg.payload !== null
        ? (msg.payload as Record<string, unknown>)
        : { value: msg.payload }

    this.stateManager.sendDeviceEvent(deviceId, room, {
      type: 'STATE_RECEIVED',
      payload,
    })

    // Feed numeric fields to threshold rule checks
    for (const [field, value] of Object.entries(payload)) {
      if (typeof value === 'number') {
        this.ruleEngine.checkThreshold(deviceId, field, value)
      }
    }
  }

  private handleDeviceConfig(msg: ParsedMqttMessage): void {
    const [, room, type, id] = msg.topicParts
    if (!room || !type || !id) return

    const payload = msg.payload as Record<string, unknown>
    const deviceId = `${room}.${type}.${id}`

    if (this.registry.get(deviceId)) return // already known

    const device: DeviceConfig = {
      id: deviceId,
      name: (payload['name'] as string) ?? deviceId,
      type: type as DeviceConfig['type'],
      room,
      topic: {
        state: `home/${room}/${type}/${id}/state`,
        set: `home/${room}/${type}/${id}/set`,
        config: `home/${room}/${type}/${id}/config`,
      },
      capabilities: (payload['capabilities'] as string[]) ?? [],
      meta: payload,
    }
    this.registry.register(device)
  }

  /** Send a command to a specific device */
  async command(deviceId: string, payload: unknown): Promise<void> {
    const device = this.registry.get(deviceId)
    if (!device) {
      logger.warn({ deviceId }, 'Command to unknown device')
      return
    }
    await this.broker.publish(device.topic.set, payload, { qos: 1 })
  }
}
