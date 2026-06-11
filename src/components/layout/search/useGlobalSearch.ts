import { useInfiniteQuery } from '@tanstack/react-query'
import { commands } from '@/lib/tauri-bindings'
import { SEARCH_PAGE_SIZE, SEARCH_THRESHOLD } from './types'
import type { SearchHit, PaginatedSearchResult } from './types'

export function useGlobalSearch(query: string) {
  const trimmed = query.trim()
  return useInfiniteQuery<
    PaginatedSearchResult,
    Error,
    { pages: PaginatedSearchResult[]; flat: SearchHit[] },
    readonly unknown[],
    number
  >({
    queryKey: ['globalSearch', trimmed] as const,
    queryFn: ({ pageParam }) =>
      commands.globalSearch(trimmed, SEARCH_PAGE_SIZE, pageParam).then(r => {
        if (r.status === 'error') throw new Error(r.error)
        return r.data
      }),
    enabled: trimmed.length >= SEARCH_THRESHOLD,
    staleTime: 30_000,
    initialPageParam: 0,
    getNextPageParam: (last, _all, lastPageParam) => {
      const next = lastPageParam + last.data.length
      return next < last.total_count ? next : undefined
    },
    select: data => {
      const seen = new Set<string>()
      const flat: SearchHit[] = []
      for (const page of data.pages) {
        for (const hit of page.data) {
          const key = `${hit.entity_type}:${hit.id}`
          if (seen.has(key)) continue
          seen.add(key)
          flat.push(hit)
        }
      }
      return { pages: data.pages, flat }
    },
  })
}
