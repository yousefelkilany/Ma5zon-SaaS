import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useSearchHistory, useRecordSearchHistory } from './useSearchHistory'

vi.mock('@/lib/tauri-bindings', () => ({
  commands: {
    searchHistoryList: vi.fn(),
    searchHistoryRecord: vi.fn(),
  },
}))

import { commands } from '@/lib/tauri-bindings'

function wrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )
}

describe('useSearchHistory', () => {
  beforeEach(() => vi.clearAllMocks())

  it('lists entries for a user', async () => {
    ;(commands.searchHistoryList as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 'ok',
      data: [{ id: '1', user_id: 'u1', query: 'hello', created_at: null }],
    })
    const { result } = renderHook(() => useSearchHistory('u1'), { wrapper: wrapper() })
    await waitFor(() => expect(result.current.data).toHaveLength(1))
    expect(result.current.data?.[0]?.query).toBe('hello')
  })

  it('records a query and invalidates the list', async () => {
    ;(commands.searchHistoryRecord as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 'ok',
      data: null,
    })
    const { result } = renderHook(() => useRecordSearchHistory('u1'), {
      wrapper: wrapper(),
    })
    result.current.mutate('hello')
    await waitFor(() =>
      expect(commands.searchHistoryRecord).toHaveBeenCalledWith('u1', 'hello'),
    )
  })
})