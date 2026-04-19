'use client'

import { useEffect, useRef, useCallback } from 'react'
import { WS_URL } from '@/lib/api'

export type WsMessage =
  | { type: 'snapshot'; data: { systemState: string; devices: unknown[] } }
  | { type: 'state_change'; data: { type: string; id: string; previousState: string; currentState: string; payload?: Record<string, unknown> } }

type MessageHandler = (msg: WsMessage) => void

export function useRealtime(onMessage: MessageHandler) {
  const wsRef = useRef<WebSocket | null>(null)
  const handlerRef = useRef(onMessage)
  handlerRef.current = onMessage

  const connect = useCallback(() => {
    if (typeof window === 'undefined') return

    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string) as WsMessage
        handlerRef.current(msg)
      } catch {}
    }

    ws.onclose = () => {
      // Reconnect after 3s
      setTimeout(connect, 3000)
    }
  }, [])

  useEffect(() => {
    connect()
    return () => wsRef.current?.close()
  }, [connect])
}
