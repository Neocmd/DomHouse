import fs from 'node:fs'
import path from 'node:path'
import YAML from 'yaml'
import { parseExpression as parseCronExpression } from 'cron-parser'
import { logger } from '../logger.js'
import { ConditionEvaluator } from './ConditionEvaluator.js'
import type { RuleDefinition, Action } from './types.js'
import type { MessageBrokerInterface, ParsedMqttMessage } from '../mqtt/MessageBrokerInterface.js'
import type { StateManager, StateChangeEvent } from '../state/StateManager.js'

type ActionExecutor = (action: Action, context: ExecutionContext) => Promise<void>

export interface ExecutionContext {
  triggerMessage?: ParsedMqttMessage
  stateEvent?: StateChangeEvent
  rule: RuleDefinition
}

export class RuleEngine {
  private rules: RuleDefinition[] = []
  private cronTimers = new Map<string, ReturnType<typeof setInterval>>()
  private thresholdState = new Map<string, { since: number; active: boolean }>()
  private evaluator: ConditionEvaluator
  private actionExecutor?: ActionExecutor

  constructor(
    private broker: MessageBrokerInterface,
    private stateManager: StateManager,
  ) {
    this.evaluator = new ConditionEvaluator(stateManager)
  }

  setActionExecutor(executor: ActionExecutor): void {
    this.actionExecutor = executor
  }

  load(configDir: string): void {
    const rulesDir = path.join(configDir, 'rules')
    if (!fs.existsSync(rulesDir)) {
      logger.warn({ rulesDir }, 'Rules dir not found')
      return
    }
    const files = fs.readdirSync(rulesDir).filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'))
    for (const file of files) {
      const raw = fs.readFileSync(path.join(rulesDir, file), 'utf8')
      const parsed = YAML.parse(raw) as RuleDefinition | RuleDefinition[]
      const list = Array.isArray(parsed) ? parsed : [parsed]
      for (const rule of list) {
        if (rule.enabled !== false) this.rules.push(rule)
      }
    }
    logger.info({ count: this.rules.length }, 'Rules loaded')
  }

  start(): void {
    // Wire MQTT triggers
    for (const rule of this.rules) {
      if (rule.trigger.type === 'mqtt') {
        this.broker.subscribe(rule.trigger.topic, (msg) => {
          this.handleMqttTrigger(rule, msg)
        })
      }

      if (rule.trigger.type === 'cron') {
        this.scheduleCron(rule)
      }
    }

    // Wire state change triggers
    this.stateManager.onStateChange((event) => {
      this.handleStateChangeTrigger(event)
    })

    logger.info('Rule engine started')
  }

  stop(): void {
    for (const timer of this.cronTimers.values()) clearInterval(timer)
    this.cronTimers.clear()
  }

  private handleMqttTrigger(rule: RuleDefinition, msg: ParsedMqttMessage): void {
    const trigger = rule.trigger as { type: 'mqtt'; payloadMatch?: Record<string, unknown> }

    if (trigger.payloadMatch) {
      for (const [key, expected] of Object.entries(trigger.payloadMatch)) {
        const actual = (msg.payload as Record<string, unknown>)?.[key]
        if (actual !== expected) return
      }
    }

    const conditions = rule.conditions ?? []
    if (!this.evaluator.evaluate(conditions, msg)) return

    this.executeActions(rule, { triggerMessage: msg, rule })
  }

  private handleStateChangeTrigger(event: StateChangeEvent): void {
    for (const rule of this.rules) {
      const t = rule.trigger
      if (t.type !== 'state_change') continue
      if (t.entity !== event.type) continue
      if (t.id && t.id !== event.id) continue
      if (t.to && t.to !== event.currentState) continue
      if (t.from && t.from !== event.previousState) continue

      const conditions = rule.conditions ?? []
      if (!this.evaluator.evaluate(conditions)) continue

      this.executeActions(rule, { stateEvent: event, rule })
    }
  }

  /** Called externally when a numeric sensor value arrives — evaluates threshold rules */
  checkThreshold(deviceId: string, field: string, value: number): void {
    for (const rule of this.rules) {
      const t = rule.trigger
      if (t.type !== 'threshold') continue
      if (t.deviceId !== deviceId || t.field !== field) continue

      const key = `${rule.id}:${deviceId}:${field}`
      const passes = compareOp(value, t.operator, t.value)

      if (passes) {
        const entry = this.thresholdState.get(key)
        const now = Date.now()

        if (!entry) {
          this.thresholdState.set(key, { since: now, active: false })
          continue
        }

        const elapsed = (now - entry.since) / 1000
        const required = t.forSeconds ?? 0

        if (!entry.active && elapsed >= required) {
          entry.active = true
          const conditions = rule.conditions ?? []
          if (this.evaluator.evaluate(conditions)) {
            this.executeActions(rule, { rule })
          }
        }
      } else {
        this.thresholdState.delete(key)
      }
    }
  }

  private scheduleCron(rule: RuleDefinition): void {
    const t = rule.trigger as { type: 'cron'; expression: string }

    const tick = () => {
      const conditions = rule.conditions ?? []
      if (!this.evaluator.evaluate(conditions)) return
      this.executeActions(rule, { rule })
    }

    try {
      const interval = parseCronExpression(t.expression)
      const scheduleNext = () => {
        const next = interval.next()
        const delay = next.getTime() - Date.now()
        const timer = setTimeout(() => {
          tick()
          scheduleNext()
        }, delay)
        this.cronTimers.set(rule.id, timer as unknown as ReturnType<typeof setInterval>)
      }
      scheduleNext()
    } catch (err) {
      logger.error({ err, ruleId: rule.id, expr: t.expression }, 'Invalid cron expression')
    }
  }

  private executeActions(rule: RuleDefinition, ctx: ExecutionContext): void {
    if (!this.actionExecutor) {
      logger.warn({ ruleId: rule.id }, 'No action executor registered')
      return
    }
    logger.debug({ ruleId: rule.id }, 'Rule fired')
    for (const action of rule.actions) {
      this.actionExecutor(action, ctx).catch((err) => {
        logger.error({ err, ruleId: rule.id, actionType: action.type }, 'Action failed')
      })
    }
  }
}

function compareOp(actual: number, op: string, expected: number): boolean {
  switch (op) {
    case '>':  return actual > expected
    case '<':  return actual < expected
    case '>=': return actual >= expected
    case '<=': return actual <= expected
    case '==': return actual === expected
    case '!=': return actual !== expected
    default:   return false
  }
}
