import type { Device } from './api'

export const ROOM_EMOJI: Record<string, string> = {
  living_room: '🛋',
  kitchen:     '🍳',
  bedroom:     '🛏',
  bathroom:    '🚿',
  office:      '💻',
  garage:      '🚗',
  garden:      '🌿',
  entrance:    '🚪',
}

export function formatRoomName(roomId: string): string {
  return roomId.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function groupByRoom(devices: Device[]): Map<string, Device[]> {
  const map = new Map<string, Device[]>()
  for (const device of devices) {
    if (!map.has(device.room)) map.set(device.room, [])
    map.get(device.room)!.push(device)
  }
  return map
}

export function roomActiveCount(devices: Device[]): number {
  return devices.filter((d) => d.snapshot?.state === 'on').length
}

export function roomTemperature(devices: Device[]): number | undefined {
  for (const d of devices) {
    if (!d.capabilities.includes('temperature') || !d.snapshot) continue
    const val = d.snapshot.payload['temperature']
    if (typeof val === 'number') return val
  }
  return undefined
}
