import Fastify from 'fastify'
import cors from '@fastify/cors'
import websocket from '@fastify/websocket'
import { config } from '../config.js'
import { logger } from '../logger.js'
import type { DeviceRegistry } from '../mqtt/DeviceRegistry.js'
import type { StateManager } from '../state/StateManager.js'
import type { ScenarioEngine } from '../scenarios/ScenarioEngine.js'
import type { MqttRouter } from '../router/MqttRouter.js'
import type { StateChangeEvent } from '../state/StateManager.js'
import type { WebSocket } from 'ws'

export function buildServer(
  registry: DeviceRegistry,
  stateManager: StateManager,
  scenarioEngine: ScenarioEngine,
  mqttRouter: MqttRouter,
) {
  const app = Fastify({ loggerInstance: logger })

  app.register(cors, { origin: true })
  app.register(websocket)

  const wsClients = new Set<WebSocket>()

  // Push state changes to all connected WS clients
  stateManager.onStateChange((event: StateChangeEvent) => {
    const msg = JSON.stringify({ type: 'state_change', data: event })
    for (const client of wsClients) {
      if (client.readyState === 1 /* OPEN */) {
        client.send(msg)
      }
    }
  })

  // ── WebSocket endpoint ───────────────────────────────────

  app.get('/ws', { websocket: true }, (socket: WebSocket) => {
    wsClients.add(socket)

    // Send current snapshot on connect
    const systemState = stateManager.getSystemState()
    const devices = registry.getAll().map((d) => ({
      ...d,
      snapshot: stateManager.getDeviceSnapshot(d.id),
    }))
    socket.send(JSON.stringify({ type: 'snapshot', data: { systemState, devices } }))

    socket.on('close', () => wsClients.delete(socket))
    socket.on('error', () => wsClients.delete(socket))
  })

  // ── REST: System state ───────────────────────────────────

  app.get('/api/state', async () => ({
    system: stateManager.getSystemState(),
    rooms: registry.getRooms().map((room) => ({
      room,
      state: stateManager.getRoomState(room),
    })),
  }))

  app.post<{ Body: { state: 'home' | 'away' | 'night' | 'vacation' } }>(
    '/api/state',
    { schema: { body: { type: 'object', required: ['state'], properties: { state: { type: 'string' } } } } },
    async (req) => {
      const eventMap = {
        home: 'SET_HOME',
        away: 'SET_AWAY',
        night: 'SET_NIGHT',
        vacation: 'SET_VACATION',
      } as const
      stateManager.sendSystemEvent({ type: eventMap[req.body.state] })
      return { ok: true, state: req.body.state }
    },
  )

  // ── REST: Devices ────────────────────────────────────────

  app.get('/api/devices', async () =>
    registry.getAll().map((d) => ({
      ...d,
      snapshot: stateManager.getDeviceSnapshot(d.id),
    })),
  )

  app.get<{ Params: { id: string } }>('/api/devices/:id', async (req, reply) => {
    const device = registry.get(req.params.id)
    if (!device) return reply.code(404).send({ error: 'Device not found' })
    return { ...device, snapshot: stateManager.getDeviceSnapshot(device.id) }
  })

  app.post<{ Params: { id: string }; Body: unknown }>(
    '/api/devices/:id/command',
    async (req, reply) => {
      const device = registry.get(req.params.id)
      if (!device) return reply.code(404).send({ error: 'Device not found' })
      await mqttRouter.command(req.params.id, req.body)
      return { ok: true }
    },
  )

  // ── REST: Scenarios ──────────────────────────────────────

  app.get('/api/scenarios', async () => scenarioEngine.getAll())

  app.post<{ Params: { name: string }; Body: Record<string, unknown> }>(
    '/api/scenarios/:name/trigger',
    async (req, reply) => {
      scenarioEngine.trigger(req.params.name, req.body).catch(() => {})
      return { ok: true, scenario: req.params.name }
    },
  )

  // ── Health ───────────────────────────────────────────────

  app.get('/health', async () => ({ status: 'ok', ts: Date.now() }))

  return app
}

export async function startServer(
  registry: DeviceRegistry,
  stateManager: StateManager,
  scenarioEngine: ScenarioEngine,
  mqttRouter: MqttRouter,
): Promise<void> {
  const app = buildServer(registry, stateManager, scenarioEngine, mqttRouter)
  await app.listen({ port: config.api.port, host: config.api.host })
  logger.info({ port: config.api.port }, 'API server started')
}
