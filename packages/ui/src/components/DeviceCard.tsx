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

interface Props {
  device: Device
  onUpdate: () => void
}

export function DeviceCard({ device, onUpdate }: Props) {
  const Icon = ICONS[device.type] ?? Zap
  const isOn = device.snapshot?.state === 'on'
  const isUnreachable = device.snapshot?.state === 'unreachable'

  const toggle = async () => {
    await sendCommand(device.id, { on: !isOn })
    onUpdate()
  }

  return (
    <div
      className={cn(
        'relative rounded-2xl border p-4 transition-all duration-200 cursor-pointer select-none',
        isOn
          ? 'border-orange-300 bg-orange-50 shadow-sm shadow-orange-100'
          : 'border-stone-200 bg-white hover:border-stone-300',
        isUnreachable && 'opacity-40 cursor-not-allowed',
      )}
      onClick={isUnreachable ? undefined : toggle}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className={cn(
            'w-9 h-9 rounded-xl flex items-center justify-center',
            isOn ? 'bg-orange-100 text-orange-600' : 'bg-stone-100 text-stone-500',
          )}
        >
          <Icon size={18} />
        </div>
        <div
          className={cn(
            'w-2 h-2 rounded-full mt-1',
            isOn ? 'bg-orange-400' : isUnreachable ? 'bg-red-400' : 'bg-stone-300',
          )}
        />
      </div>

      <p className="text-sm font-semibold text-stone-800 leading-tight">{device.name}</p>
      <p className="text-xs text-stone-400 mt-0.5 capitalize">{device.room}</p>

      {device.snapshot?.payload && <PayloadBadge payload={device.snapshot.payload} type={device.type} />}
    </div>
  )
}

function PayloadBadge({ payload, type }: { payload: Record<string, unknown>; type: string }) {
  if (type === 'sensor' || type === 'presence') {
    const temp = payload['temperature']
    const hum = payload['humidity']
    const motion = payload['motion']

    return (
      <div className="mt-2 flex flex-wrap gap-1">
        {temp !== undefined && (
          <span className="text-xs bg-blue-50 text-blue-600 rounded-md px-1.5 py-0.5">{temp}°C</span>
        )}
        {hum !== undefined && (
          <span className="text-xs bg-cyan-50 text-cyan-600 rounded-md px-1.5 py-0.5">{hum}%</span>
        )}
        {motion !== undefined && (
          <span className={cn('text-xs rounded-md px-1.5 py-0.5', motion ? 'bg-amber-50 text-amber-600' : 'bg-stone-50 text-stone-400')}>
            {motion ? 'Movimento' : 'Quiete'}
          </span>
        )}
      </div>
    )
  }

  if (type === 'light') {
    const bri = payload['brightness']
    if (bri !== undefined) {
      return (
        <div className="mt-2">
          <span className="text-xs text-stone-400">{bri}%</span>
        </div>
      )
    }
  }

  return null
}
