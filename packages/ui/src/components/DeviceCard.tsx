'use client'

import { Lightbulb, Thermometer, Lock, Tv, Wind, Eye, BlindsIcon, Zap } from 'lucide-react'
import type { Device } from '@/lib/api'
import { sendCommand } from '@/lib/api'
import { cn } from '@/lib/utils'

const ICONS: Record<string, React.ElementType> = {
  light: Lightbulb,
  sensor: Thermometer,
  lock: Lock,
  media: Tv,
  climate: Wind,
  presence: Eye,
  blind: BlindsIcon,
  switch: Zap,
}

const LIVE_TYPES = new Set(['sensor', 'presence', 'climate'])

interface Props {
  device: Device
  onUpdate?: () => void
}

export function DeviceCard({ device, onUpdate }: Props) {
  const Icon = ICONS[device.type] ?? Zap
  const state = device.snapshot?.state
  const isOn = state === 'on'
  const isUnreachable = state === 'unreachable'
  const isError = state === 'error'
  const isLive = LIVE_TYPES.has(device.type)
  const canToggle = !isLive && !isUnreachable && !isError

  const toggle = async () => {
    if (!canToggle) return
    await sendCommand(device.id, { on: !isOn })
    onUpdate?.()
  }

  const payload = device.snapshot?.payload ?? {}
  const brightness = typeof payload['brightness'] === 'number' ? payload['brightness'] : undefined
  const position   = typeof payload['position']   === 'number' ? payload['position']   : undefined
  const temp       = typeof payload['temperature']=== 'number' ? payload['temperature']: undefined
  const hum        = typeof payload['humidity']   === 'number' ? payload['humidity']   : undefined
  const motion     = payload['motion']

  return (
    <div
      role={canToggle ? 'button' : undefined}
      tabIndex={canToggle ? 0 : undefined}
      onClick={canToggle ? toggle : undefined}
      onKeyDown={canToggle ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle() } } : undefined}
      className={cn(
        'relative rounded-2xl border p-3 transition-all select-none',
        isOn && 'border-orange-500/30 bg-[#1c1c1e]',
        !isOn && !isUnreachable && !isError && 'border-[#1f1f1f] bg-[#161616]',
        isUnreachable && 'border-[#1f1f1f] bg-[#161616] opacity-40',
        isError && 'border-red-900/40 bg-[#1c1616]',
        isLive && state === 'on' && device.type === 'sensor'   && 'border-blue-900/40',
        isLive && state === 'on' && device.type === 'presence' && 'border-green-900/40',
        canToggle && 'cursor-pointer hover:border-orange-500/50',
      )}
    >
      <div className="mb-2 flex items-start justify-between">
        <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg', isOn ? 'text-orange-400' : 'text-stone-500')}>
          <Icon size={20} />
        </div>
        {isLive ? (
          <LiveBadge type={device.type} />
        ) : device.type === 'blind' ? (
          <span className="text-xs text-stone-400">{position !== undefined ? `${position}%` : '—'}</span>
        ) : (
          <Toggle on={isOn} disabled={!canToggle} />
        )}
      </div>

      <p className={cn('text-sm font-semibold leading-tight', isOn ? 'text-white' : 'text-stone-400')}>
        {device.name}
      </p>

      <p className={cn(
        'mt-1 text-xs',
        isError       ? 'text-red-400'
        : isUnreachable ? 'text-stone-600'
        : device.type === 'sensor'   ? 'text-blue-400'
        : device.type === 'presence' ? 'text-green-400'
        : isOn        ? 'text-orange-400'
        : 'text-stone-600',
      )}>
        {isError       ? 'Errore'
        : isUnreachable ? 'Non raggiungibile'
        : temp !== undefined ? `${temp.toFixed(1)}°C${hum !== undefined ? ` · ${hum.toFixed(0)}%` : ''}`
        : motion !== undefined ? (motion ? 'Movimento rilevato' : 'Nessun movimento')
        : isOn && brightness !== undefined ? `ON · ${brightness}%`
        : isOn ? 'ON'
        : 'OFF'}
      </p>

      {device.type === 'blind' && position !== undefined && (
        <div className="mt-2 h-1 rounded-full bg-[#2a2a2e]">
          <div className="h-1 rounded-full bg-orange-500" style={{ width: `${position}%` }} />
        </div>
      )}
    </div>
  )
}

function Toggle({ on, disabled }: { on: boolean; disabled: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        'relative inline-block h-[18px] w-[30px] rounded-full transition-colors',
        on ? 'bg-orange-500' : 'bg-[#2a2a2e]',
        disabled && 'opacity-50',
      )}
    >
      <span
        className={cn(
          'absolute top-[3px] h-3 w-3 rounded-full bg-white transition-all',
          on ? 'right-[3px]' : 'left-[3px] bg-stone-500',
        )}
      />
    </span>
  )
}

function LiveBadge({ type }: { type: string }) {
  const color = type === 'presence'
    ? 'bg-green-900/40 text-green-400'
    : type === 'climate'
      ? 'bg-orange-900/40 text-orange-300'
      : 'bg-blue-900/40 text-blue-400'
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-[9px] font-semibold tracking-wider', color)}>
      LIVE
    </span>
  )
}
