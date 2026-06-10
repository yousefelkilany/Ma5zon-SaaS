import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SearchHistoryList } from './SearchHistoryList'

vi.mock('@/lib/tauri-bindings', () => ({
  commands: {
    searchHistoryList: vi.fn(),
    searchHistoryDelete: vi.fn(),
    searchHistoryClear: vi.fn(),
  },
}))

import { commands } from '@/lib/tauri-bindings'

function wrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )
}

const entry = (q: string) => ({ id: q, user_id: 'u1', query: q, created_at: null })

describe('SearchHistoryList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(commands.searchHistoryList as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 'ok',
      data: [],
    })
  })

  it('renders entries when history exists', async () => {
    ;(commands.searchHistoryList as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 'ok',
      data: [entry('apple'), entry('banana')],
    })
    render(<SearchHistoryList userId="u1" filter="" onPick={() => {}} />, {
      wrapper: wrapper(),
    })
    await waitFor(() => {
      expect(screen.getByTestId('search-history-list')).toBeInTheDocument()
      expect(screen.getAllByRole('button', { name: /Delete this entry/i })).toHaveLength(2)
    })
  })

  it('filters entries by substring in filter', async () => {
    ;(commands.searchHistoryList as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 'ok',
      data: [entry('apple'), entry('banana')],
    })
    render(<SearchHistoryList userId="u1" filter="ap" onPick={() => {}} />, {
      wrapper: wrapper(),
    })
    await waitFor(() => {
      const deleteButtons = screen.getAllByRole('button', { name: /Delete this entry/i })
      expect(deleteButtons).toHaveLength(1)
    })
  })

  it('shows "no recent searches" when history is empty', async () => {
    ;(commands.searchHistoryList as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 'ok',
      data: [],
    })
    render(<SearchHistoryList userId="u1" filter="" onPick={() => {}} />, {
      wrapper: wrapper(),
    })
    expect(await screen.findByText(/no recent searches/i)).toBeInTheDocument()
  })
})