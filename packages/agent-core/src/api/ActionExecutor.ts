import { logger } from '../logger.js'
import type { Action } from '../rules/types.js'
import type { ExecutionContext } from '../rules/RuleEngine.js'
import type { MessageBrokerInterface } from '../mqtt/MessageBrokerInterface.js'
import type { StateManager } from '../state/StateManager.js'
import type { ScenarioEngine } from '../scenarios/ScenarioEngine.js'
import type { SystemEvent } from '../state/machines.js'

const STATE_EVENT_MAP: Record<string, SystemEvent['type']> = {
  home: 'SET_HOME',
  away: 'SET_AWAY',
  night: 'SET_NIGHT',
  vacation: 'SET_VACATION',
}

export class ActionExecutor {
  constructor(
    private broker: MessageBrokerInterface,
    private stateManager: StateManager,
    private scenarioEngine: ScenarioEngine,
  ) {}

  async execute(action: Action, ctx: ExecutionContext): Promise<void> {
    switch (action.type) {
      case 'mqtt_publish':
        await this.broker.publish(action.topic, action.payload, { qos: action.qos ?? 1 })
        break

      case 'trigger_scenario':
        await this.scenarioEngine.trigger(action.name, action.params)
        break

      case 'set_system_state': {
        const evType = STATE_EVENT_MAP[action.state]
        if (evType) this.stateManager.sendSystemEvent({ type: evType })
        break
      }

      case 'log':
        logger[action.level ?? 'info']({ ruleId: ctx.rule.id }, action.message)
        break
    }
  }
}
