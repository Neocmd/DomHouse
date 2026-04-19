'use client'

import Link from 'next/link'
import { use } from 'react'
import { ChevronLeft } from 'lucide-react'
import { DeviceCard } from '@/components/DeviceCard'
import { useDevices } from '@/context/RealtimeContext'
import { ROOM_EMOJI, formatRoomName, roomActiveCount, roomTemperature } from '@/lib/rooms'

export default function RoomDetail({ params }: { params: Promise<{ room: string }> }) {
  const { room } = use(params)
  const roomId = decodeURIComponent(room)
  const devices = useDevices().filter((d) => d.room === roomId)
  const active = roomActiveCount(devices)
  const temp = roomTemperature(devices)

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-10">
      <Link
        href="/rooms"
        className="mb-4 inline-flex items-center gap-1 text-xs text-stone-500 hover:text-stone-300"
      >
        <ChevronLeft size={14} /> Stanze
      </Link>

      <div className="mb-6 flex items-center gap-3">
        <span className="text-3xl">{ROOM_EMOJI[roomId] ?? '🏠'}</span>
        <div>
          <div className="text-xl font-bold text-white">{formatRoomName(roomId)}</div>
          <div className="mt-0.5 text-xs text-green-400">
            ● {active > 0 ? `${active} attivi` : 'Nessun dispositivo attivo'}
            {temp !== undefined && ` · ${temp.toFixed(1)}°C`}
          </div>
        </div>
      </div>

      {devices.length === 0 ? (
        <div className="rounded-2xl border border-[#1f1f1f] bg-[#161616] p-8 text-center text-sm text-stone-400">
          Nessun device in questa stanza.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {devices.map((d) => <DeviceCard key={d.id} device={d} />)}
        </div>
      )}
    </div>
  )
}
