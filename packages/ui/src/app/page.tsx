'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { fetchScenarios } from '@/lib/api'
import type { Scenario } from '@/lib/api'
import { SystemStateBadge } from '@/components/SystemStateBadge'
import { ScenarioChip } from '@/components/ScenarioButton'
import { useDevices, useSystemState } from '@/context/RealtimeContext'
import { ROOM_EMOJI, formatRoomName, groupByRoom, roomActiveCount } from '@/lib/rooms'

export default function DashboardHome() {
  const devices = useDevices()
  const { systemState } = useSystemState()
  const [scenarios, setScenarios] = useState<Scenario[]>([])

  useEffect(() => {
    fetchScenarios()
      .then(setScenarios)
      .catch((err) => console.error('[Dashboard] fetchScenarios failed:', err))
  }, [])

  const activeCount = devices.filter((d) => d.snapshot?.state === 'on').length
  const rooms = Array.from(groupByRoom(devices).entries())

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-10">
      <SectionLabel>Dashboard</SectionLabel>

      <div className="mb-6">
        <SystemStateBadge current={systemState} />
      </div>

      <div className="mb-6 flex items-center justify-between rounded-2xl bg-[#1c1c1e] p-4">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-stone-500">Sistema</div>
          <div className="mt-0.5 text-lg font-bold text-white capitalize">{systemState}</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-stone-500">Dispositivi attivi</div>
          <div className="mt-0.5 text-lg font-bold text-orange-400">
            {activeCount} <span className="text-stone-500">/ {devices.length}</span>
          </div>
        </div>
      </div>

      {scenarios.length > 0 && (
        <section className="mb-6">
          <SectionLabel>Scenari rapidi</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {scenarios.map((s) => <ScenarioChip key={s.name} scenario={s} />)}
          </div>
        </section>
      )}

      <section>
        <SectionLabel>Stanze</SectionLabel>
        {rooms.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="flex flex-col gap-2">
            {rooms.map(([room, roomDevices]) => {
              const active = roomActiveCount(roomDevices)
              const dim = active === 0
              return (
                <Link
                  key={room}
                  href={`/rooms/${encodeURIComponent(room)}`}
                  className={cnRow(dim)}
                >
                  <span className="flex items-center gap-2 text-sm">
                    <span className="text-lg">{ROOM_EMOJI[room] ?? '🏠'}</span>
                    <span className={dim ? 'text-stone-500' : 'text-stone-200'}>{formatRoomName(room)}</span>
                  </span>
                  <span className={dim ? 'text-xs text-stone-600' : 'text-xs font-semibold text-orange-400'}>
                    {active > 0 ? `${active} ON` : 'off'}
                  </span>
                </Link>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-stone-500">
      {children}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-[#1f1f1f] bg-[#161616] p-8 text-center">
      <p className="text-sm text-stone-400">Nessun device configurato.</p>
      <p className="mt-1 text-xs text-stone-600">
        Aggiungi device in <code className="text-orange-400">config/devices/</code>
      </p>
    </div>
  )
}

function cnRow(dim: boolean) {
  return [
    'flex items-center justify-between rounded-xl px-3 py-3 transition-colors',
    dim ? 'bg-[#151515] hover:bg-[#1a1a1a]' : 'bg-[#1c1c1e] hover:bg-[#222]',
  ].join(' ')
}
