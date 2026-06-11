import { useEffect, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useTabStore } from '@/store/workspace-store'
import { SearchHistoryList } from './SearchHistoryList'
import { SearchResultList } from './SearchResultList'
import { useGlobalSearch } from './useGlobalSearch'
import { useRecordSearchHistory } from './useSearchHistory'
import { SEARCH_THRESHOLD } from './types'
import type { SearchHit } from './types'
import { ModalTypes, type ModalType } from '@/lib/utils'

export function SearchDropdown({
  query,
  userId,
  onPickQuery,
  onClose,
}: {
  query: string
  userId: string | null | undefined
  onPickQuery: (q: string) => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const record = useRecordSearchHistory(userId)
  const addTab = useTabStore(s => s.addTab)
  const [activeIndex, setActiveIndex] = useState(0)

  const trimmed = query.trim()
  const liveQueryEnabled = trimmed.length >= SEARCH_THRESHOLD
  const live = useGlobalSearch(query)
  const hits = live.data?.flat ?? []

  function openHit(hit: SearchHit, inNewTab: boolean) {
    const entity_modal = hit.entity_type as ModalType
    if (!entity_modal || !ModalTypes.includes(entity_modal)) return
    if (inNewTab) {
      addTab({
        title: hit.match_title,
        type: 'entity',
        entityType: hit.entity_type,
        closable: true,
      })
      navigate({
        to: '/entity/$entityType',
        params: { entityType: hit.entity_type },
        search: { entity_modal, entity_id: hit.id, product_id: hit.parent_id ?? undefined },
      })
    } else {
      navigate({
        to: '/entity/$entityType',
        params: { entityType: hit.entity_type },
        search: { entity_modal, entity_id: hit.id, product_id: hit.parent_id ?? undefined },
      })
    }
    if (liveQueryEnabled && userId) record.mutate(trimmed)
    onClose()
  }

  useEffect(() => setActiveIndex(0), [hits.length, trimmed])

  const containerRef = useRef<HTMLDivElement>(null)
  return (
    <div
      ref={containerRef}
      className="absolute start-0 end-0 top-full mt-2 bg-surface-container border border-outline-variant rounded-lg shadow-xl max-h-[60vh] overflow-y-auto z-50"
      data-testid="search-dropdown"
    >
      {liveQueryEnabled ? (
        <SearchResultList
          query={query}
          hits={hits}
          totalCount={live.data?.pages.at(-1)?.total_count ?? 0}
          hasMore={Boolean(live.hasNextPage)}
          onLoadMore={() => live.fetchNextPage()}
          isFetchingMore={live.isFetchingNextPage}
          activeIndex={activeIndex}
          setActiveIndex={setActiveIndex}
          onActivate={hit => openHit(hit, false)}
        />
      ) : (
        <SearchHistoryList userId={userId} filter={trimmed} onPick={onPickQuery} />
      )}
      {live.isError && (
        <div className="px-4 py-3 text-body-sm text-error">
          {t('search.unavailable')}
        </div>
      )}
    </div>
  )
}