'use client'

import { useSystemState } from '@/context/RealtimeContext'

export default function SettingsPage() {
  const { connected } = useSystemState()

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-10">
      <div className="mb-4 text-[10px] font-semibold uppercase tracking-widest text-stone-500">
        Impostazioni
      </div>

      <div className="rounded-2xl bg-[#1c1c1e] p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-white">Connessione realtime</div>
            <div className="mt-0.5 text-xs text-stone-500">WebSocket agent-core</div>
          </div>
          <span className={connected ? 'text-xs text-green-400' : 'text-xs text-stone-500'}>
            {connected ? '● Connesso' : '○ Disconnesso'}
          </span>
        </div>
      </div>

      <p className="mt-6 text-xs text-stone-600">
        Altre impostazioni in arrivo.
      </p>
    </div>
  )
}
