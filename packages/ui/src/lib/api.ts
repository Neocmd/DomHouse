const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'
export const WS_URL = (process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:3000') + '/ws'

export type SystemState = 'home' | 'away' | 'night' | 'vacation'

export interface DeviceSnapshot {
  id: string
  state: 'on' | 'off' | 'unreachable' | 'error' | 'unknown'
  payload: Record<string, unknown>
  lastSeen: number
}

export interface Device {
  id: string
  name: string
  type: string
  room: string
  capabilities: string[]
  snapshot: DeviceSnapshot | null
}

export interface SystemStateResponse {
  system: SystemState
  rooms: { room: string; state: string }[]
}

export interface Scenario {
  name: string
  description?: string
}

export async function fetchState(): Promise<SystemStateResponse> {
  const res = await fetch(`${API_URL}/api/state`)
  return res.json()
}

export async function setSystemState(state: string): Promise<void> {
  await fetch(`${API_URL}/api/state`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ state }),
  })
}

export async function fetchDevices(): Promise<Device[]> {
  const res = await fetch(`${API_URL}/api/devices`)
  return res.json()
}

export async function sendCommand(deviceId: string, payload: unknown): Promise<void> {
  await fetch(`${API_URL}/api/devices/${encodeURIComponent(deviceId)}/command`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function fetchScenarios(): Promise<Scenario[]> {
  const res = await fetch(`${API_URL}/api/scenarios`)
  return res.json()
}

export async function triggerScenario(name: string): Promise<void> {
  await fetch(`${API_URL}/api/scenarios/${encodeURIComponent(name)}/trigger`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  })
}
