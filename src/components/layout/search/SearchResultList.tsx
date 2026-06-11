import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ProductResultRow } from './result-rows/ProductResultRow'
import { VariantResultRow } from './result-rows/VariantResultRow'
import { WarehouseResultRow } from './result-rows/WarehouseResultRow'
import {
  PER_GROUP_VISIBLE,
  STALE_ROW_TIMEOUT_MS,
  type SearchHit,
} from './types'

const GROUP_LABELS: Record<string, string> = {
  product: 'search.group.products',
  variant: 'search.group.variants',
  warehouse: 'search.group.warehouses',
}

function rowKey(hit: SearchHit) {
  return `${hit.entity_type}:${hit.id}`
}

export function SearchResultList({
  query,
  hits,
  totalCount,
  hasMore,
  onLoadMore,
  isFetchingMore,
  onActivate,
  activeIndex,
  setActiveIndex,
  staleHitIds,
}: {
  query: string
  hits: SearchHit[]
  totalCount: number
  hasMore: boolean
  onLoadMore: () => void
  isFetchingMore: boolean
  onActivate: (hit: SearchHit) => void
  activeIndex: number
  setActiveIndex: (n: number) => void
  staleHitIds?: Set<string>
}) {
  const { t } = useTranslation()
  const [staleIds, setStaleIds] = useState<Set<string>>(new Set())

  const groups = useMemo(() => {
    const order: string[] = []
    const map: Record<string, SearchHit[]> = {}
    for (const hit of hits) {
      if (!(hit.entity_type in map)) {
        order.push(hit.entity_type)
        map[hit.entity_type] = []
      }
      map[hit.entity_type]!.push(hit)
    }
    return order.map(type => ({ type, items: map[type]! }))
  }, [hits])

  useEffect(() => {
    if (staleIds.size === 0) return
    const timer = setTimeout(() => {
      setStaleIds(new Set())
    }, STALE_ROW_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [staleIds])

  const isStale = useCallback(
    (hit: SearchHit) => {
      const key = rowKey(hit)
      return staleHitIds?.has(key) || staleIds.has(key)
    },
    [staleHitIds, staleIds]
  )

  if (hits.length === 0) {
    return (
      <div className="px-4 py-6 text-body-sm text-on-surface-variant text-center">
        {t('search.noResults', { query })}
      </div>
    )
  }

  let runningIndex = 0
  return (
    <div className="flex flex-col" data-testid="search-result-list">
      {groups.map(group => {
        return (
          <div key={group.type} className="flex flex-col">
            <div className="px-4 py-2 text-label-caps text-on-surface-variant uppercase">
              {t(GROUP_LABELS[group.type] ?? group.type)} ({group.items.length})
            </div>
            {group.items.slice(0, PER_GROUP_VISIBLE).map(hit => {
              const idx = runningIndex++
              const isActive = idx === activeIndex
              const stale = isStale(hit)
              return (
                <button
                  key={rowKey(hit)}
                  type="button"
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => onActivate(hit)}
                  data-active={isActive}
                  data-testid="search-result-row"
                  className={[
                    'flex items-center px-4 py-2 text-start',
                    isActive
                      ? 'bg-surface-container-high'
                      : 'hover:bg-surface-container',
                    stale ? 'opacity-60' : '',
                  ].join(' ')}
                >
                  <div className="flex-1 min-w-0">
                    {group.type === 'product' && <ProductResultRow hit={hit} />}
                    {group.type === 'variant' && <VariantResultRow hit={hit} />}
                    {group.type === 'warehouse' && (
                      <WarehouseResultRow hit={hit} />
                    )}
                  </div>
                  {stale && (
                    <span className="text-[10px] text-on-surface-variant ms-2">
                      {t('search.justDeleted')}
                    </span>
                  )}
                </button>
              )
            })}
            {group.items.length > PER_GROUP_VISIBLE && (
              <button
                type="button"
                onClick={onLoadMore}
                className="px-4 py-2 text-label-caps text-primary text-start"
              >
                {t('search.showMoreInGroup', {
                  count: group.items.length - PER_GROUP_VISIBLE,
                  group: t(GROUP_LABELS[group.type] ?? group.type),
                })}
              </button>
            )}
          </div>
        )
      })}
      {hasMore && (
        <button
          type="button"
          onClick={onLoadMore}
          disabled={isFetchingMore}
          className="px-4 py-3 text-label-caps text-primary text-center"
        >
          {isFetchingMore ? t('common.loading') : t('search.showMore')}
        </button>
      )}
      <div className="px-4 py-2 text-[10px] text-on-surface-variant text-end">
        {t('search.totalCount', { count: totalCount })}
      </div>
    </div>
  )
}
