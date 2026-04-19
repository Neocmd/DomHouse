import fs from 'node:fs'
import path from 'node:path'
import YAML from 'yaml'
import { logger } from '../logger.js'
import type { ScenarioDefinition, ScenarioStep } from './types.js'
import type { MessageBrokerInterface } from '../mqtt/MessageBrokerInterface.js'
import type { StateManager } from '../state/StateManager.js'
import type { SystemEvent } from '../state/machines.js'

export class ScenarioEngine {
  private scenarios = new Map<string, ScenarioDefinition>()
  private running = new Set<string>()

  constructor(
    private broker: MessageBrokerInterface,
    private stateManager: StateManager,
  ) {}

  load(configDir: string): void {
    const scenariosDir = path.join(configDir, 'scenarios')
    if (!fs.existsSync(scenariosDir)) {
      logger.warn({ scenariosDir }, 'Scenarios dir not found')
      return
    }
    const files = fs.readdirSync(scenariosDir).filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'))
    for (const file of files) {
      const raw = fs.readFileSync(path.join(scenariosDir, file), 'utf8')
      const parsed = YAML.parse(raw) as ScenarioDefinition | ScenarioDefinition[]
      const list = Array.isArray(parsed) ? parsed : [parsed]
      for (const scenario of list) {
        this.scenarios.set(scenario.name, scenario)
      }
    }
    logger.info({ count: this.scenarios.size }, 'Scenarios loaded')
  }

  register(scenario: ScenarioDefinition): void {
    this.scenarios.set(scenario.name, scenario)
  }

  getAll(): ScenarioDefinition[] {
    return Array.from(this.scenarios.values())
  }

  async trigger(name: string, params?: Record<string, unknown>): Promise<void> {
    const scenario = this.scenarios.get(name)
    if (!scenario) {
      logger.warn({ name }, 'Scenario not found')
      return
    }

    if (this.running.has(name)) {
      logger.warn({ name }, 'Scenario already running, skipping')
      return
    }

    this.running.add(name)
    logger.info({ name }, 'Scenario triggered')

    const timeout = scenario.timeoutMs ?? 30_000
    const abortController = new AbortController()
    const timer = setTimeout(() => abortController.abort(), timeout)

    try {
      await this.executeSteps(scenario.steps, scenario.mode ?? 'sequential', abortController.signal)
      logger.info({ name }, 'Scenario completed')
    } catch (err) {
      logger.error({ err, name }, 'Scenario failed, running rollback')
      if (scenario.rollback?.length) {
        await this.executeSteps(scenario.rollback, 'sequential', new AbortController().signal).catch(
          (rollbackErr) => logger.error({ rollbackErr, name }, 'Rollback failed'),
        )
      }
    } finally {
      clearTimeout(timer)
      this.running.delete(name)
    }
  }

  private async executeSteps(
    steps: ScenarioStep[],
    mode: 'sequential' | 'parallel',
    signal: AbortSignal,
  ): Promise<void> {
    if (mode === 'parallel') {
      await Promise.all(steps.map((s) => this.executeStep(s, signal)))
    } else {
      for (const step of steps) {
        if (signal.aborted) throw new Error('Scenario aborted (timeout)')
        await this.executeStep(step, signal)
      }
    }
  }

  private async executeStep(step: ScenarioStep, signal: AbortSignal): Promise<void> {
    if (signal.aborted) throw new Error('Aborted')

    switch (step.type) {
      case 'mqtt_publish': {
        if (step.delayMs) await sleep(step.delayMs)
        await this.broker.publish(step.topic, step.payload, { qos: step.qos ?? 1 })
        logger.debug({ topic: step.topic }, 'Scenario: mqtt published')
        break
      }

      case 'wait': {
        await sleep(step.ms)
        break
      }

      case 'set_system_state': {
        const eventMap: Record<string, SystemEvent['type']> = {
          home: 'SET_HOME',
          away: 'SET_AWAY',
          night: 'SET_NIGHT',
          vacation: 'SET_VACATION',
        }
        this.stateManager.sendSystemEvent({ type: eventMap[step.state] ?? 'SET_HOME' } as SystemEvent)
        break
      }

      case 'trigger_scenario': {
        await this.trigger(step.name)
        break
      }
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
