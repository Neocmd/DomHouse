'use client'

import { useState } from 'react'
import { Home, Plane, Moon, MapPin } from 'lucide-react'
import { setSystemState } from '@/lib/api'
import type { SystemState } from '@/lib/api'
import { cn } from '@/lib/utils'

const STATES = [
  { key: 'home',     label: 'Casa',    Icon: Home },
  { key: 'away',     label: 'Fuori',   Icon: MapPin },
  { key: 'night',    label: 'Notte',   Icon: Moon },
  { key: 'vacation', label: 'Vacanza', Icon: Plane },
] as const

interface Props {
  current: SystemState
  onChange?: () => void
}

export function SystemStateBadge({ current, onChange }: Props) {
  const [pending, setPending] = useState<SystemState | null>(null)

  const set = async (state: SystemState) => {
    if (pending || state === current) return
    setPending(state)
    try {
      await setSystemState(state)
      onChange?.()
    } finally {
      setPending(null)
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {STATES.map(({ key, label, Icon }) => {
        const active = current === key
        return (
          <button
            key={key}
            onClick={() => set(key)}
            disabled={pending !== null}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
              active
                ? 'bg-orange-500 text-white'
                : 'bg-[#2a2a2e] text-stone-400 hover:bg-[#34343a] hover:text-stone-200',
              pending === key && 'opacity-60',
            )}
          >
            <Icon size={12} />
            {label}
          </button>
        )
      })}
    </div>
  )
}
