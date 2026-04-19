'use client'

import { useEffect, useState } from 'react'
import { fetchScenarios } from '@/lib/api'
import type { Scenario } from '@/lib/api'
import { ScenarioCard } from '@/components/ScenarioButton'

export default function ScenariosPage() {
  const [scenarios, setScenarios] = useState<Scenario[] | null>(null)

  useEffect(() => {
    fetchScenarios()
      .then(setScenarios)
      .catch((err) => {
        console.error('[Scenarios] fetchScenarios failed:', err)
        setScenarios([])
      })
  }, [])

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-10">
      <div className="mb-4 text-[10px] font-semibold uppercase tracking-widest text-stone-500">
        Scenari
      </div>

      {scenarios === null ? (
        <div className="text-sm text-stone-500">Caricamento…</div>
      ) : scenarios.length === 0 ? (
        <div className="rounded-2xl border border-[#1f1f1f] bg-[#161616] p-8 text-center text-sm text-stone-400">
          Nessuno scenario configurato.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {scenarios.map((s) => <ScenarioCard key={s.name} scenario={s} />)}
        </div>
      )}
    </div>
  )
}
