'use client'

import { Play } from 'lucide-react'
import { useState } from 'react'
import { triggerScenario } from '@/lib/api'
import type { Scenario } from '@/lib/api'
import { cn } from '@/lib/utils'

const EMOJI_BY_KEYWORD: [RegExp, string][] = [
  [/movie|cinema|film/i,         '🎬'],
  [/morning|buongiorno|giorno/i, '🌅'],
  [/night|notte|buonanotte/i,    '🌙'],
  [/away|fuori|leav/i,           '✈️'],
  [/holiday|vacanz/i,            '🏖'],
  [/dinner|cena/i,               '🍽'],
  [/relax|chill/i,               '🛋'],
  [/read|lettura/i,              '📖'],
]

export function scenarioEmoji(s: Scenario): string {
  const haystack = `${s.name} ${s.description ?? ''}`
  for (const [re, emoji] of EMOJI_BY_KEYWORD) if (re.test(haystack)) return emoji
  return '✨'
}

function useScenarioTrigger(name: string) {
  const [running, setRunning] = useState(false)
  const trigger = async () => {
    if (running) return
    setRunning(true)
    try {
      await triggerScenario(name)
    } finally {
      setTimeout(() => setRunning(false), 2000)
    }
  }
  return { running, trigger }
}

export function ScenarioChip({ scenario }: { scenario: Scenario }) {
  const { running, trigger } = useScenarioTrigger(scenario.name)
  return (
    <button
      onClick={trigger}
      className={cn(
        'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
        running
          ? 'bg-orange-500/20 text-orange-300'
          : 'bg-[#2a2a2e] text-stone-300 hover:bg-[#34343a]',
      )}
    >
      <span>{scenarioEmoji(scenario)}</span>
      <span>{scenario.description ?? scenario.name}</span>
    </button>
  )
}

export function ScenarioCard({ scenario }: { scenario: Scenario }) {
  const { running, trigger } = useScenarioTrigger(scenario.name)
  return (
    <div className="flex flex-col rounded-2xl border border-[#1f1f1f] bg-[#1c1c1e] p-4">
      <div className="mb-2 text-3xl">{scenarioEmoji(scenario)}</div>
      <div className="mb-1 text-sm font-semibold text-white">{scenario.name}</div>
      {scenario.description && (
        <div className="mb-3 text-xs text-stone-500 line-clamp-2">{scenario.description}</div>
      )}
      <button
        onClick={trigger}
        disabled={running}
        className={cn(
          'mt-auto flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-colors',
          running
            ? 'bg-orange-500/20 text-orange-300'
            : 'bg-orange-500 text-white hover:bg-orange-600',
        )}
      >
        <Play size={12} className={running ? 'animate-pulse' : ''} />
        {running ? 'In corso…' : 'Avvia'}
      </button>
    </div>
  )
}

export function ScenarioButton({ scenario }: { scenario: Scenario }) {
  return <ScenarioChip scenario={scenario} />
}
