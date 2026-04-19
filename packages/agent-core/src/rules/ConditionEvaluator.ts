import type { Condition } from './types.js'
import type { StateManager } from '../state/StateManager.js'
import type { ParsedMqttMessage } from '../mqtt/MessageBrokerInterface.js'

function compareValues(actual: unknown, operator: string, expected: unknown): boolean {
  switch (operator) {
    case '==': return actual == expected
    case '!=': return actual != expected
    case '>':  return (actual as number) > (expected as number)
    case '<':  return (actual as number) < (expected as number)
    case '>=': return (actual as number) >= (expected as number)
    case '<=': return (actual as number) <= (expected as number)
    default:   return false
  }
}

function timeInRange(from: string, to: string): boolean {
  const now = new Date()
  const [fh, fm] = from.split(':').map(Number)
  const [th, tm] = to.split(':').map(Number)
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const fromMinutes = fh * 60 + fm
  const toMinutes = th * 60 + tm
  if (fromMinutes <= toMinutes) {
    return nowMinutes >= fromMinutes && nowMinutes <= toMinutes
  }
  // crosses midnight
  return nowMinutes >= fromMinutes || nowMinutes <= toMinutes
}

export class ConditionEvaluator {
  constructor(private stateManager: StateManager) {}

  evaluate(conditions: Condition[], triggerMessage?: ParsedMqttMessage): boolean {
    return conditions.every((cond) => this.evaluateOne(cond, triggerMessage))
  }

  private evaluateOne(cond: Condition, msg?: ParsedMqttMessage): boolean {
    switch (cond.type) {
      case 'system_state': {
        const current = this.stateManager.getSystemState()
        return compareValues(current, cond.operator ?? '==', cond.value)
      }

      case 'room_state': {
        if (!cond.entity) return false
        const current = this.stateManager.getRoomState(cond.entity)
        return compareValues(current, cond.operator ?? '==', cond.value)
      }

      case 'device_state': {
        if (!cond.entity) return false
        const snapshot = this.stateManager.getDeviceSnapshot(cond.entity)
        if (!snapshot) return false
        return compareValues(snapshot.state, cond.operator ?? '==', cond.value)
      }

      case 'device_payload': {
        if (!cond.entity || !msg) return false
        const snapshot = this.stateManager.getDeviceSnapshot(cond.entity)
        if (!snapshot) return false
        const fieldPath = cond.value as string
        const fieldParts = fieldPath.split('.')
        let val: unknown = snapshot.payload
        for (const part of fieldParts) {
          if (val == null || typeof val !== 'object') return false
          val = (val as Record<string, unknown>)[part]
        }
        return compareValues(val, cond.operator ?? '==', cond.value)
      }

      case 'time_range': {
        if (!cond.from || !cond.to) return false
        return timeInRange(cond.from, cond.to)
      }

      default:
        return true
    }
  }
}
