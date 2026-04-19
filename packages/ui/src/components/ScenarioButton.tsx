'use client'

import { Play } from 'lucide-react'
import { triggerScenario } from '@/lib/api'
import type { Scenario } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useState } from 'react'

export function ScenarioButton({ scenario }: { scenario: Scenario }) {
  const [running, setRunning] = useState(false)

  const trigger = async () => {
    if (running) return
    setRunning(true)
    try {
      await triggerScenario(scenario.name)
    } finally {
      setTimeout(() => setRunning(false), 2000)
    }
  }

  return (
    <button
      onClick={trigger}
      className={cn(
        'flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all',
        running
          ? 'border-orange-300 bg-orange-50 text-orange-700'
          : 'border-stone-200 bg-white text-stone-700 hover:border-orange-300 hover:bg-orange-50',
      )}
    >
      <Play size={14} className={running ? 'animate-pulse' : ''} />
      {scenario.description ?? scenario.name}
    </button>
  )
}
