'use client'

import Link from 'next/link'
import { useDevices } from '@/context/RealtimeContext'
import { ROOM_EMOJI, formatRoomName, groupByRoom, roomActiveCount, roomTemperature } from '@/lib/rooms'

export default function RoomsPage() {
  const devices = useDevices()
  const rooms = Array.from(groupByRoom(devices).entries())

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-10">
      <div className="mb-4 text-[10px] font-semibold uppercase tracking-widest text-stone-500">
        Stanze
      </div>

      {rooms.length === 0 ? (
        <div className="rounded-2xl border border-[#1f1f1f] bg-[#161616] p-8 text-center text-sm text-stone-400">
          Nessuna stanza configurata.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {rooms.map(([room, roomDevices]) => {
            const active = roomActiveCount(roomDevices)
            const temp = roomTemperature(roomDevices)
            const dim = active === 0
            return (
              <Link
                key={room}
                href={`/rooms/${encodeURIComponent(room)}`}
                className={[
                  'flex flex-col rounded-2xl p-4 transition-colors',
                  dim ? 'bg-[#151515] opacity-70 hover:opacity-100' : 'bg-[#1c1c1e] hover:bg-[#222]',
                ].join(' ')}
              >
                <div className="mb-2 text-2xl">{ROOM_EMOJI[room] ?? '🏠'}</div>
                <div className="text-sm font-semibold text-white">{formatRoomName(room)}</div>
                <div className={`mt-1 text-xs ${active > 0 ? 'text-orange-400' : 'text-stone-500'}`}>
                  {active > 0
                    ? `${active} accesi${temp !== undefined ? ` · ${temp.toFixed(0)}°C` : ''}`
                    : temp !== undefined
                      ? `${temp.toFixed(0)}°C`
                      : 'tutto off'}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
