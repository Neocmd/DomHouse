'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { Device, SystemState } from '@/lib/api'
import { fetchDevices, fetchState } from '@/lib/api'
import { useRealtime } from '@/hooks/useRealtime'
import type { WsMessage } from '@/hooks/useRealtime'

interface ContextValue {
  devices: Device[]
  systemState: SystemState
  connected: boolean
}

const RealtimeContext = createContext<ContextValue>({
  devices: [],
  systemState: 'home',
  connected: false,
})

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const [devices, setDevices] = useState<Device[]>([])
  const [systemState, setSystemState] = useState<SystemState>('home')
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    fetchDevices().then(setDevices).catch(() => {})
    fetchState().then((s) => setSystemState(s.system)).catch(() => {})
  }, [])

  const handleMessage = useCallback((msg: WsMessage) => {
    if (msg.type === 'snapshot') {
      setDevices(msg.data.devices as Device[])
      setSystemState(msg.data.systemState as SystemState)
      setConnected(true)
    } else if (msg.type === 'state_change') {
      setDevices((prev) =>
        prev.map((d) =>
          d.id === msg.data.id
            ? {
                ...d,
                snapshot: {
                  id: d.id,
                  state: msg.data.currentState as NonNullable<Device['snapshot']>['state'],
                  payload: msg.data.payload ?? d.snapshot?.payload ?? {},
                  lastSeen: Date.now(),
                },
              }
            : d,
        ),
      )
    }
  }, [])

  useRealtime(handleMessage)

  return (
    <RealtimeContext.Provider value={{ devices, systemState, connected }}>
      {children}
    </RealtimeContext.Provider>
  )
}

export function useDevices(): Device[] {
  return useContext(RealtimeContext).devices
}

export function useSystemState(): Pick<ContextValue, 'systemState' | 'connected'> {
  const { systemState, connected } = useContext(RealtimeContext)
  return { systemState, connected }
}
