import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useGlobalSearch } from './useGlobalSearch'

vi.mock('@/lib/tauri-bindings', () => ({
  commands: {
    globalSearch: vi.fn(),
  },
}))

import { commands } from '@/lib/tauri-bindings'

function wrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )
}

describe('useGlobalSearch', () => {
  beforeEach(() => vi.clearAllMocks())

  it('does not fire when query is below threshold', async () => {
    renderHook(() => useGlobalSearch('ab'), { wrapper: wrapper() })
    await new Promise(r => setTimeout(r, 10))
    expect(commands.globalSearch).not.toHaveBeenCalled()
  })

  it('fires when query is at or above threshold', async () => {
    ;(commands.globalSearch as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 'ok',
      data: { data: [], total_count: 0, total_pages: 0 },
    })
    renderHook(() => useGlobalSearch('abc'), { wrapper: wrapper() })
    await waitFor(() => expect(commands.globalSearch).toHaveBeenCalled())
  })

  it('passes limit 20 and offset 0 on first call', async () => {
    ;(commands.globalSearch as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 'ok',
      data: { data: [], total_count: 0, total_pages: 0 },
    })
    renderHook(() => useGlobalSearch('abcd'), { wrapper: wrapper() })
    await waitFor(() =>
      expect(commands.globalSearch).toHaveBeenCalledWith('abcd', 20, 0),
    )
  })
})