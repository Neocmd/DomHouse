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
    const existing = map.get(device.room) ?? []
    existing.push(device)
    map.set(device.room, existing)
  }
  return map
}

export function roomActiveCount(devices: Device[]): number {
  return devices.filter((d) => d.snapshot?.state === 'on').length
}

export function roomTemperature(devices: Device[]): number | undefined {
  const sensor = devices.find(
    (d) =>
      d.capabilities.includes('temperature') &&
      typeof d.snapshot?.payload['temperature'] === 'number',
  )
  if (!sensor?.snapshot) return undefined
  const val = sensor.snapshot.payload['temperature']
  return typeof val === 'number' ? val : undefined
}
