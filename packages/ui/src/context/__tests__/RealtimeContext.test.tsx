import { render, screen, act } from '@testing-library/react'
import { vi, describe, test, expect, beforeEach } from 'vitest'
import { RealtimeProvider, useDevices, useSystemState } from '../RealtimeContext'
import type { Device } from '@/lib/api'

const mockHandler = vi.fn()

vi.mock('@/hooks/useRealtime', () => ({
  useRealtime: (handler: unknown) => {
    mockHandler.mockImplementation(handler as () => void)
  },
}))

vi.mock('@/lib/api', () => ({
  fetchDevices: vi.fn().mockResolvedValue([]),
  fetchState: vi.fn().mockResolvedValue({ system: 'home', rooms: [] }),
}))

function Consumer() {
  const devices = useDevices()
  const { systemState, connected } = useSystemState()
  return (
    <div>
      <span data-testid="state">{systemState}</span>
      <span data-testid="count">{devices.length}</span>
      <span data-testid="connected">{String(connected)}</span>
    </div>
  )
}

describe('RealtimeContext', () => {
  beforeEach(() => { mockHandler.mockReset() })

  test('renders with default home state', async () => {
    render(<RealtimeProvider><Consumer /></RealtimeProvider>)
    await screen.findByTestId('state')
    expect(screen.getByTestId('state')).toHaveTextContent('home')
    expect(screen.getByTestId('count')).toHaveTextContent('0')
    expect(screen.getByTestId('connected')).toHaveTextContent('false')
  })

  test('snapshot message replaces devices and state', async () => {
    render(<RealtimeProvider><Consumer /></RealtimeProvider>)
    await screen.findByTestId('state')

    const device: Device = {
      id: 'd1', name: 'Light', type: 'light', room: 'living_room',
      capabilities: ['toggle'], snapshot: null,
    }

    act(() => {
      mockHandler({ type: 'snapshot', data: { systemState: 'away', devices: [device] } })
    })

    expect(screen.getByTestId('state')).toHaveTextContent('away')
    expect(screen.getByTestId('count')).toHaveTextContent('1')
    expect(screen.getByTestId('connected')).toHaveTextContent('true')
  })

  test('state_change message patches matching device', async () => {
    const device: Device = {
      id: 'd1', name: 'Light', type: 'light', room: 'living_room',
      capabilities: ['toggle'],
      snapshot: { id: 'd1', state: 'off', payload: {}, lastSeen: 0 },
    }

    render(<RealtimeProvider><Consumer /></RealtimeProvider>)
    await screen.findByTestId('state')

    act(() => {
      mockHandler({ type: 'snapshot', data: { systemState: 'home', devices: [device] } })
    })
    expect(screen.getByTestId('count')).toHaveTextContent('1')

    act(() => {
      mockHandler({
        type: 'state_change',
        data: { type: 'light', id: 'd1', previousState: 'off', currentState: 'on', payload: { brightness: 80 } },
      })
    })
    expect(screen.getByTestId('count')).toHaveTextContent('1')
  })
})
