import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { commands } from '@/lib/tauri-bindings'
import { SEARCH_HISTORY_LIMIT } from './types'
import type { SearchHistoryEntry } from './types'

export function useSearchHistory(userId: string | null | undefined) {
  return useQuery<SearchHistoryEntry[]>({
    queryKey: ['searchHistory', userId] as const,
    enabled: Boolean(userId),
    staleTime: 30_000,
    queryFn: async () => {
      if (!userId) return []
      const r = await commands.searchHistoryList(userId, SEARCH_HISTORY_LIMIT)
      if (r.status === 'error') throw new Error(r.error)
      return r.data
    },
  })
}

export function useRecordSearchHistory(userId: string | null | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (query: string) => {
      if (!userId) return
      const r = await commands.searchHistoryRecord(userId, query)
      if (r.status === 'error') throw new Error(r.error)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['searchHistory', userId] }),
  })
}

export function useDeleteSearchHistoryEntry(userId: string | null | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const r = await commands.searchHistoryDelete(id)
      if (r.status === 'error') throw new Error(r.error)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['searchHistory', userId] }),
  })
}

export function useClearSearchHistory(userId: string | null | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      if (!userId) return
      const r = await commands.searchHistoryClear(userId)
      if (r.status === 'error') throw new Error(r.error)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['searchHistory', userId] }),
  })
}