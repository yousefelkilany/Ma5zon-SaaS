import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { sanitizeHighlight } from '@/lib/sanitize'
import {
  useClearSearchHistory,
  useDeleteSearchHistoryEntry,
  useSearchHistory,
} from './useSearchHistory'
import type { SearchHistoryEntry } from './types'

function markMatch(query: string, target: string): string {
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(escaped, 'ig')
  return target.replace(re, m => `<mark>${m}</mark>`)
}

export function SearchHistoryList({
  userId,
  filter,
  onPick,
}: {
  userId: string | null | undefined
  filter: string
  onPick: (query: string) => void
}) {
  const { t } = useTranslation()
  const { data: entries = [] } = useSearchHistory(userId)
  const clear = useClearSearchHistory(userId)
  const del = useDeleteSearchHistoryEntry(userId)

  const trimmed = filter.trim().toLowerCase()
  const visible = useMemo(() => {
    if (!trimmed) return entries
    return entries.filter(e => e.query.toLowerCase().includes(trimmed))
  }, [entries, trimmed])

  const headerLabel = trimmed
    ? t('search.recentMatches')
    : t('search.recentSearches')

  return (
    <div className="flex flex-col" data-testid="search-history-list">
      <div className="px-4 py-2 text-label-caps text-on-surface-variant uppercase">
        {headerLabel}
      </div>
      {visible.length === 0 ? (
        <div className="px-4 py-6 text-body-sm text-on-surface-variant text-center">
          {trimmed ? t('search.noRecentMatches') : t('search.noHistory')}
        </div>
      ) : (
        visible.map((entry: SearchHistoryEntry) => (
          <div
            key={entry.id}
            className="flex items-center px-4 py-2 hover:bg-surface-container"
          >
            <button
              type="button"
              onClick={() => onPick(entry.query)}
              className="flex-1 text-start"
            >
              <span
                className="text-body-sm text-on-surface"
                dangerouslySetInnerHTML={{
                  __html: sanitizeHighlight(markMatch(trimmed, entry.query)),
                }}
              />
            </button>
            <button
              type="button"
              onClick={() => del.mutate(entry.id)}
              aria-label={t('search.deleteEntry')}
              className="ms-2 p-1 text-on-surface-variant"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        ))
      )}
      {!trimmed && entries.length > 0 && (
        <button
          type="button"
          onClick={() => clear.mutate()}
          className="px-4 py-2 text-label-caps text-primary text-start"
        >
          {t('search.clearAll')}
        </button>
      )}
    </div>
  )
}