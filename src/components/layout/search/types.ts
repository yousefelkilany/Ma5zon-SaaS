import type {
  SearchHit,
  PaginatedSearchResult,
  SearchHistoryEntry,
} from '@/lib/bindings'

export type { SearchHit, PaginatedSearchResult, SearchHistoryEntry }

export const SEARCH_PAGE_SIZE = 20
export const SEARCH_HISTORY_LIMIT = 10
export const SEARCH_THRESHOLD = 3
export const STALE_ROW_TIMEOUT_MS = 2000
export const PER_GROUP_VISIBLE = 5
