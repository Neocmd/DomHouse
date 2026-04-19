'use client'

import { Home, Plane, Moon, MapPin } from 'lucide-react'
import { setSystemState } from '@/lib/api'
import { cn } from '@/lib/utils'

const STATES = [
  { key: 'home', label: 'Casa', Icon: Home },
  { key: 'away', label: 'Fuori', Icon: MapPin },
  { key: 'night', label: 'Notte', Icon: Moon },
  { key: 'vacation', label: 'Vacanza', Icon: Plane },
] as const

type SystemState = 'home' | 'away' | 'night' | 'vacation'

interface Props {
  current: SystemState
  onChange: () => void
}

export function SystemStateBadge({ current, onChange }: Props) {
  const set = async (state: SystemState) => {
    await setSystemState(state)
    onChange()
  }

  return (
    <div className="flex gap-2 flex-wrap">
      {STATES.map(({ key, label, Icon }) => (
        <button
          key={key}
          onClick={() => set(key)}
          className={cn(
            'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all border',
            current === key
              ? 'bg-stone-900 text-white border-stone-900'
              : 'bg-white text-stone-500 border-stone-200 hover:border-stone-400',
          )}
        >
          <Icon size={12} />
          {label}
        </button>
      ))}
    </div>
  )
}
