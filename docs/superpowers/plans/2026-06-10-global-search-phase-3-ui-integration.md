# Global Search — Phase 3: UI Integration

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Compose the Phase 2 hooks/rows into the actual user-facing UI: the result list with grouping, dedupe, "Show more" and stale-row state; the history list with prefix filter and clear-all; the dropdown that switches between them; the navbar wiring; the variant deep-link via the router and `ModalManager`; the modal-level `EntityMissingState`; and the i18n strings.

**Architecture:** `GlobalSearch` (navbar) owns the input value, focus shortcuts, and the `SearchDropdown`. `SearchDropdown` switches between `SearchHistoryList` (empty/short query) and `SearchResultList` (≥3 chars). Clicks navigate via TanStack Router search params (`entity_modal`, `entity_id`, `product_id`); the existing `ModalManager` reads them and opens the right modal. The three entity modals render `EntityMissingState` if the underlying data fetch resolves to `undefined` after open.

**Tech Stack:** React 19, TanStack Router, TanStack Query (consumed via the Phase 2 hooks), react-i18next, Material Symbols (project standard).

**Spec:** `docs/superpowers/specs/2026-06-10-global-search-design.md`

**Phase 1 (prerequisite):** `docs/superpowers/plans/2026-06-10-global-search-phase-1-backend.md`
**Phase 2 (prerequisite):** `docs/superpowers/plans/2026-06-10-global-search-phase-2-frontend-foundation.md`
**Phase 4 (next):** `docs/superpowers/plans/2026-06-10-global-search-phase-4-tests-and-docs.md`

---

## Files Touched in This Phase

**New files (frontend):**

- `src/components/layout/search/SearchResultList.tsx` — groups, dedupes, "Show more", stale-row state.
- `src/components/layout/search/SearchHistoryList.tsx` — recent + filtered-by-prefix.
- `src/components/layout/search/SearchDropdown.tsx` — the dropdown panel that switches between history and results.
- `src/components/layout/GlobalSearch.tsx` — input + dropdown shell with keyboard shortcuts.
- `src/components/entity/EntityMissingState.tsx` — modal-level fallback.

**Modified files:**

- `src/components/layout/Navbar.tsx` — replace inline search markup with `<GlobalSearch />`.
- `src/router/index.tsx` — extend `entitySearchSchema` with `product_id`.
- `src/components/modal/ModalManager.tsx` — read `product_id` param; pass through to `VariantModal`.
- `src/components/entity/ProductModal.tsx` — render `EntityMissingState` when data is `undefined` after open.
- `src/components/entity/VariantModal.tsx` — same.
- `src/components/entity/WarehouseModal.tsx` — same.
- `locales/en.json` — add `search.*` and `entity.missing.*` keys.
- `locales/ar.json` — Arabic translations for the same keys.

---

## Task 1: Create `SearchResultList.tsx`

**Files:**

- Create: `src/components/layout/search/SearchResultList.tsx`

- [ ] **Step 1: Create the file**

Create `src/components/layout/search/SearchResultList.tsx` with:

```tsx
import { useEffect, useMemo, useState } from 'react'
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
  hits,
  totalCount,
  hasMore,
  onLoadMore,
  isFetchingMore,
  onActivate,
  activeIndex,
  setActiveIndex,
}: {
  hits: SearchHit[]
  totalCount: number
  hasMore: boolean
  onLoadMore: () => void
  isFetchingMore: boolean
  onActivate: (hit: SearchHit) => void
  activeIndex: number
  setActiveIndex: (n: number) => void
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
      map[hit.entity_type].push(hit)
    }
    return order.map(type => ({ type, items: map[type] }))
  }, [hits])

  // Stale rows are auto-removed after the timeout.
  useEffect(() => {
    if (staleIds.size === 0) return
    const timer = setTimeout(() => {
      setStaleIds(new Set())
    }, STALE_ROW_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [staleIds])

  if (hits.length === 0) {
    return (
      <div className="px-4 py-6 text-body-sm text-on-surface-variant text-center">
        {t('search.noResults', { query: '' })}
      </div>
    )
  }

  let runningIndex = 0
  return (
    <div className="flex flex-col" data-testid="search-result-list">
      {groups.map(group => {
        const visible = group.items.filter(h => !staleIds.has(rowKey(h)))
        const hidden = group.items.length - visible.length
        return (
          <div key={group.type} className="flex flex-col">
            <div className="px-4 py-2 text-label-caps text-on-surface-variant uppercase">
              {t(GROUP_LABELS[group.type] ?? group.type)} ({group.items.length})
            </div>
            {visible.slice(0, PER_GROUP_VISIBLE).map(hit => {
              const idx = runningIndex++
              const isActive = idx === activeIndex
              const stale = staleIds.has(rowKey(hit))
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
                    isActive ? 'bg-surface-container-high' : 'hover:bg-surface-container',
                    stale ? 'opacity-60' : '',
                  ].join(' ')}
                >
                  <div className="flex-1 min-w-0">
                    {group.type === 'product' && <ProductResultRow hit={hit} />}
                    {group.type === 'variant' && <VariantResultRow hit={hit} />}
                    {group.type === 'warehouse' && <WarehouseResultRow hit={hit} />}
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
            {hidden > 0 && (
              <div className="px-4 py-1 text-[10px] text-on-surface-variant">
                {t('search.removedDuringStale', { count: hidden })}
              </div>
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
```

- [ ] **Step 2: Typecheck**

Run: `pnpm run typecheck`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/search/SearchResultList.tsx
git commit -m "feat(search): SearchResultList with grouping, stale rows, show more"
```

---

## Task 2: Create `SearchHistoryList.tsx`

**Files:**

- Create: `src/components/layout/search/SearchHistoryList.tsx`

- [ ] **Step 1: Create the file**

Create `src/components/layout/search/SearchHistoryList.tsx` with:

```tsx
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
```

- [ ] **Step 2: Typecheck**

Run: `pnpm run typecheck`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/search/SearchHistoryList.tsx
git commit -m "feat(search): SearchHistoryList with filter and clear-all"
```

---

## Task 3: Create `EntityMissingState.tsx`

**Files:**

- Create: `src/components/entity/EntityMissingState.tsx`

- [ ] **Step 1: Create the file**

Create `src/components/entity/EntityMissingState.tsx` with:

```tsx
import { useTranslation } from 'react-i18next'

export function EntityMissingState({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  return (
    <div
      className="flex flex-col items-center justify-center text-center gap-4 p-8"
      data-testid="entity-missing-state"
    >
      <span className="material-symbols-outlined text-on-surface-variant text-[48px]">
        delete
      </span>
      <p className="text-body-md text-on-surface">{t('entity.missing.message')}</p>
      <button
        type="button"
        onClick={onClose}
        className="px-4 py-2 rounded-md bg-primary text-on-primary"
      >
        {t('common.close')}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/entity/EntityMissingState.tsx
git commit -m "feat(search): EntityMissingState for modal-level fallback"
```

---

## Task 4: Wire `product_id` into the router schema and `ModalManager`

**Files:**

- Modify: `src/router/index.tsx`
- Modify: `src/components/modal/ModalManager.tsx`

- [ ] **Step 1: Add `product_id` to `entitySearchSchema`**

In `src/router/index.tsx`, change `entitySearchSchema` to:

```ts
const entitySearchSchema = z.object({
  entity_modal: z.enum(ModalTypes).optional(),
  entity_id: z.string().optional(),
  product_id: z.string().optional(),
})
```

- [ ] **Step 2: Read `product_id` in `ModalManager` and forward to `VariantModal`**

In `src/components/modal/ModalManager.tsx`, add the following near the top of the function (next to the `entity_id` parsing):

```tsx
const product_id = searchParams.get('product_id') || undefined
```

In the `case 'variant':` branch, change the `<VariantModal ... />` props to include `productId={product_id}`:

```tsx
return (
  <VariantModal
    entityId={entity_id}
    productId={product_id}
    queryClient={queryClient}
    mode="view"
    onDeleted={handleClose}
  />
)
```

- [ ] **Step 3: Typecheck**

Run: `pnpm run typecheck`
Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add src/router/index.tsx src/components/modal/ModalManager.tsx
git commit -m "feat(search): add product_id to entity search schema and ModalManager"
```

---

## Task 5: Render `EntityMissingState` in the three modals

**Files:**

- Modify: `src/components/entity/ProductModal.tsx`
- Modify: `src/components/entity/VariantModal.tsx`
- Modify: `src/components/entity/WarehouseModal.tsx`

- [ ] **Step 1: Modify `ProductModal.tsx`**

Add the import at the top of the file (alongside the other local component imports):

```tsx
import { EntityMissingState } from './EntityMissingState'
```

Find the section where the modal's body decides what to render based on the `useGetProduct` query state (look for the `isLoading` / `entity === undefined` / `entity` truthy check, around the early returns for missing data). Add a guard before the normal form render:

```tsx
if (mode === 'view' && !isLoading && entity === undefined) {
  return <EntityMissingState onClose={() => onDeleted?.()} />
}
```

Use the actual local variable names from this file (the variable holding the query result is typically `entity` and the loading flag is `isLoading` — adjust to match the file's naming).

- [ ] **Step 2: Modify `VariantModal.tsx`**

Same pattern as ProductModal: import `EntityMissingState`, find the equivalent guard spot for `useGetVariant` (around the `entity` / `isLoading` checks), and add:

```tsx
if (mode === 'view' && !isLoading && entity === undefined) {
  return <EntityMissingState onClose={() => onDeleted?.()} />
}
```

- [ ] **Step 3: Modify `WarehouseModal.tsx`**

Same pattern: import `EntityMissingState`, find the equivalent guard spot for the warehouse query, and add the same guard.

- [ ] **Step 4: Typecheck**

Run: `pnpm run typecheck`
Expected: passes.

- [ ] **Step 5: Commit**

```bash
git add src/components/entity/ProductModal.tsx src/components/entity/VariantModal.tsx src/components/entity/WarehouseModal.tsx
git commit -m "feat(search): render EntityMissingState when modal data resolves to undefined"
```

---

## Task 6: Create `SearchDropdown.tsx`

**Files:**

- Create: `src/components/layout/search/SearchDropdown.tsx`

- [ ] **Step 1: Create the file**

Create `src/components/layout/search/SearchDropdown.tsx` with:

```tsx
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
    const search = {
      entity_modal: hit.entity_type as never,
      entity_id: hit.id,
      product_id: hit.parent_id ?? undefined,
    }
    if (inNewTab) {
      addTab({
        id: `${hit.entity_type}-${hit.id}-${Date.now()}`,
        title: hit.match_title,
        type: 'entity',
        entityType: hit.entity_type,
        closable: true,
      })
      navigate({
        to: '/entity/$entityType',
        params: { entityType: hit.entity_type },
        search,
      })
    } else {
      navigate({ search })
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
```

- [ ] **Step 2: Typecheck**

Run: `pnpm run typecheck`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/search/SearchDropdown.tsx
git commit -m "feat(search): SearchDropdown that switches between history and results"
```

---

## Task 7: Create `GlobalSearch.tsx` and wire it into `Navbar.tsx`

**Files:**

- Create: `src/components/layout/GlobalSearch.tsx`
- Modify: `src/components/layout/Navbar.tsx`

- [ ] **Step 1: Create `GlobalSearch.tsx`**

Create `src/components/layout/GlobalSearch.tsx` with:

```tsx
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/hooks/useAuth'
import { SearchDropdown } from './search/SearchDropdown'

export function GlobalSearch() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const userId = user?.id ?? null
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      const inField =
        target && ['INPUT', 'TEXTAREA'].includes(target.tagName) && target !== inputRef.current
      if (inField) return
      if (e.key === '/' || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) {
        e.preventDefault()
        inputRef.current?.focus()
        setOpen(true)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  return (
    <div ref={containerRef} className="relative w-full">
      <span className="material-symbols-outlined absolute inset-inline-start-1 top-1/2 -translate-y-1/2 me-2 text-on-surface-variant text-[20px]">
        search
      </span>
      <input
        ref={inputRef}
        value={query}
        onChange={e => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={e => {
          if (e.key === 'Escape') {
            setOpen(false)
            inputRef.current?.blur()
          }
        }}
        className="bg-surface-container-high border border-outline-variant/30 rounded-lg ps-10 pe-4 py-2 text-body-sm font-body-sm text-on-surface focus:ring-1 focus:ring-primary w-full transition-all"
        placeholder={t('nav.globalSearchPlaceholder')}
        type="text"
        data-testid="global-search-input"
      />
      {open && (
        <SearchDropdown
          query={query}
          userId={userId}
          onPickQuery={setQuery}
          onClose={() => {
            setOpen(false)
            inputRef.current?.blur()
          }}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Replace the inline search markup in `Navbar.tsx`**

In `src/components/layout/Navbar.tsx`, replace the entire `{/* Center: Global Search */}` block (lines 27–39) with:

```tsx
{/* Center: Global Search */}
<div className="flex-1 flex items-center justify-center max-w-xl mx-auto">
  <GlobalSearch />
</div>
```

And add the import at the top:

```tsx
import { GlobalSearch } from './GlobalSearch'
```

- [ ] **Step 3: Typecheck**

Run: `pnpm run typecheck`
Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/GlobalSearch.tsx src/components/layout/Navbar.tsx
git commit -m "feat(search): extract GlobalSearch component, wire into Navbar"
```

---

## Task 8: Add i18n keys to `locales/en.json` and `locales/ar.json`

**Files:**

- Modify: `locales/en.json`
- Modify: `locales/ar.json`

- [ ] **Step 1: Add keys to `locales/en.json`**

Open `locales/en.json` and add a new `search` namespace (or extend it if it already exists) with the keys below. Also add `entity.missing.message` if it doesn't exist:

```json
"search": {
  "noResults": "No results for \"{{query}}\"",
  "justDeleted": "Just deleted",
  "showMore": "Show more results",
  "showMoreInGroup": "+{{count}} more in {{group}}",
  "removedDuringStale": "{{count}} row(s) just removed",
  "totalCount": "{{count}} total",
  "unavailable": "Search is unavailable",
  "recentSearches": "Recent searches",
  "recentMatches": "Recent matches",
  "noRecentMatches": "No matching recent searches",
  "noHistory": "No recent searches",
  "deleteEntry": "Delete this entry",
  "clearAll": "Clear all",
  "group": {
    "products": "Products",
    "variants": "Variants",
    "warehouses": "Warehouses"
  },
  "matchedColumn": {
    "name": "name",
    "category": "category",
    "company": "company",
    "sku": "sku",
    "variant_name": "variant name",
    "location": "location"
  }
},
"entity": {
  "missing": {
    "message": "This item is no longer available."
  }
}
```

If `entity` or `common` already exist in the file, merge the new keys into the existing objects instead of overwriting.

- [ ] **Step 2: Add Arabic translations to `locales/ar.json`**

Mirror the same structure with Arabic strings (approximate translations are fine; follow the project's existing Arabic tone):

```json
"search": {
  "noResults": "لا توجد نتائج لـ \"{{query}}\"",
  "justDeleted": "تم الحذف للتو",
  "showMore": "عرض المزيد من النتائج",
  "showMoreInGroup": "+{{count}} أخرى في {{group}}",
  "removedDuringStale": "تم حذف {{count}} صف/صفوف للتو",
  "totalCount": "{{count}} إجمالي",
  "unavailable": "البحث غير متاح",
  "recentSearches": "عمليات البحث الأخيرة",
  "recentMatches": "مطابقات حديثة",
  "noRecentMatches": "لا توجد عمليات بحث حديثة مطابقة",
  "noHistory": "لا توجد عمليات بحث حديثة",
  "deleteEntry": "حذف هذا العنصر",
  "clearAll": "مسح الكل",
  "group": {
    "products": "المنتجات",
    "variants": "المتغيرات",
    "warehouses": "المخازن"
  },
  "matchedColumn": {
    "name": "الاسم",
    "category": "الفئة",
    "company": "الشركة",
    "sku": "رمز SKU",
    "variant_name": "اسم المتغير",
    "location": "الموقع"
  }
},
"entity": {
  "missing": {
    "message": "هذا العنصر لم يعد متاحًا."
  }
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm run typecheck`
Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add locales/en.json locales/ar.json
git commit -m "feat(search): i18n keys for search UI and entity missing state"
```

---

## Phase 3 Done

After completing all eight tasks:

- `pnpm run typecheck` should pass.
- The navbar's search input is replaced by `<GlobalSearch />`.
- Pressing `/` or `Cmd/Ctrl+K` anywhere in the app focuses the search input.
- Clicking a result navigates the current tab to the right entity modal.
- The variant modal opens with both `entityId` (variant) and `productId` (parent).
- If a modal's data fetch resolves to `undefined` after a successful click-time check, `EntityMissingState` renders with a "Close" button.

Move on to Phase 4 (`docs/superpowers/plans/2026-06-10-global-search-phase-4-tests-and-docs.md`) for tests, smoke verification, full `check:all`, and developer docs.
