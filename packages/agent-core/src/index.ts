import path from 'node:path'
import { MqttClient } from './mqtt/MqttClient.js'
import { DeviceRegistry } from './mqtt/DeviceRegistry.js'
import { RedisStateStore } from './state/RedisStateStore.js'
import { InfluxWriter } from './state/InfluxWriter.js'
import { StateManager } from './state/StateManager.js'
import { RuleEngine } from './rules/RuleEngine.js'
import { ScenarioEngine } from './scenarios/ScenarioEngine.js'
import { MqttRouter } from './router/MqttRouter.js'
import { ActionExecutor } from './api/ActionExecutor.js'
import { startServer } from './api/server.js'
import { logger } from './logger.js'

const CONFIG_DIR = path.resolve(process.env.CONFIG_DIR ?? '/app/config')

async function main() {
  logger.info('DomHouse AgentCore starting...')

  // ── Storage ────────────────────────────────────────────
  const redis = new RedisStateStore()
  const influx = new InfluxWriter()
  await redis.connect()

  // ── State ──────────────────────────────────────────────
  const stateManager = new StateManager(redis, influx)

  // ── MQTT ───────────────────────────────────────────────
  const mqttClient = new MqttClient()
  await mqttClient.connect()

  // ── Device registry ────────────────────────────────────
  const registry = new DeviceRegistry()
  registry.load(CONFIG_DIR)

  // ── Engines ────────────────────────────────────────────
  const ruleEngine = new RuleEngine(mqttClient, stateManager)
  const scenarioEngine = new ScenarioEngine(mqttClient, stateManager)

  ruleEngine.load(CONFIG_DIR)
  scenarioEngine.load(CONFIG_DIR)

  // ── Action executor wires rules → actions ──────────────
  const actionExecutor = new ActionExecutor(mqttClient, stateManager, scenarioEngine)
  ruleEngine.setActionExecutor((action, ctx) => actionExecutor.execute(action, ctx))

  // ── Router ─────────────────────────────────────────────
  const mqttRouter = new MqttRouter(mqttClient, registry, stateManager, ruleEngine)
  mqttRouter.start()

  // ── Rule engine start (MQTT subscriptions) ─────────────
  ruleEngine.start()

  // ── API ────────────────────────────────────────────────
  await startServer(registry, stateManager, scenarioEngine, mqttRouter)

  logger.info('DomHouse AgentCore ready')

  // ── Graceful shutdown ──────────────────────────────────
  const shutdown = async () => {
    logger.info('Shutting down...')
    ruleEngine.stop()
    await influx.flush()
    await influx.close()
    await mqttClient.disconnect()
    await redis.disconnect()
    process.exit(0)
  }

  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
}

main().catch((err) => {
  logger.fatal({ err }, 'Fatal startup error')
  process.exit(1)
})
