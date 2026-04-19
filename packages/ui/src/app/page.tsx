'use client'

import { useCallback, useEffect, useState } from 'react'
import { fetchDevices, fetchState, fetchScenarios } from '@/lib/api'
import type { Device, SystemStateResponse, Scenario } from '@/lib/api'
import { DeviceCard } from '@/components/DeviceCard'
import { ScenarioButton } from '@/components/ScenarioButton'
import { SystemStateBadge } from '@/components/SystemStateBadge'
import { useRealtime } from '@/hooks/useRealtime'

export default function Dashboard() {
  const [devices, setDevices] = useState<Device[]>([])
  const [systemState, setSystemState] = useState<SystemStateResponse | null>(null)
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [connected, setConnected] = useState(false)

  const load = useCallback(async () => {
    const [devs, state, scens] = await Promise.all([fetchDevices(), fetchState(), fetchScenarios()])
    setDevices(devs)
    setSystemState(state)
    setScenarios(scens)
  }, [])

  useEffect(() => { load() }, [load])

  useRealtime((msg) => {
    if (msg.type === 'snapshot') {
      setConnected(true)
      load()
    }
    if (msg.type === 'state_change') {
      if (msg.data.type === 'device') {
        setDevices((prev) =>
          prev.map((d) =>
            d.id === msg.data.id
              ? {
                  ...d,
                  snapshot: {
                    id: d.id,
                    state: msg.data.currentState as Device['snapshot']['state'],
                    payload: msg.data.payload ?? d.snapshot?.payload ?? {},
                    lastSeen: Date.now(),
                  },
                }
              : d,
          ),
        )
      }
      if (msg.data.type === 'system') {
        setSystemState((prev) => prev ? { ...prev, system: msg.data.currentState as SystemStateResponse['system'] } : prev)
      }
    }
  })

  // Group devices by room
  const byRoom = devices.reduce<Record<string, Device[]>>((acc, d) => {
    acc[d.room] = acc[d.room] ?? []
    acc[d.room].push(d)
    return acc
  }, {})

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="border-b border-stone-200 bg-white px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-orange-500 rounded-lg rotate-45" />
            <h1 className="text-xl font-bold tracking-tight">DomHouse</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-stone-300'}`} />
            {systemState && (
              <SystemStateBadge current={systemState.system} onChange={load} />
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-10">
        {/* Scenarios */}
        {scenarios.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold tracking-widest uppercase text-stone-400 mb-3">Scenari</h2>
            <div className="flex flex-wrap gap-2">
              {scenarios.map((s) => <ScenarioButton key={s.name} scenario={s} />)}
            </div>
          </section>
        )}

        {/* Rooms */}
        {Object.entries(byRoom).map(([room, roomDevices]) => (
          <section key={room}>
            <h2 className="text-xs font-semibold tracking-widest uppercase text-stone-400 mb-3 capitalize">
              {room}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {roomDevices.map((device) => (
                <DeviceCard key={device.id} device={device} onUpdate={load} />
              ))}
            </div>
          </section>
        ))}

        {devices.length === 0 && (
          <div className="text-center py-20 text-stone-400">
            <p className="text-lg">Nessun device configurato.</p>
            <p className="text-sm mt-1">Aggiungi device in <code>config/devices/</code></p>
          </div>
        )}
      </main>
    </div>
  )
}
