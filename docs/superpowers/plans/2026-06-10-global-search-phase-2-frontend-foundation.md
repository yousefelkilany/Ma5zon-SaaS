# Global Search — Phase 2: Frontend Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the frontend building blocks for the global search dropdown: shared types/constants, the highlight-HTML sanitizer, the data hooks (`useGlobalSearch`, `useSearchHistory`), and the per-entity result-row components.

**Architecture:** The dropdown (Phase 3) is a thin coordinator over three layers: data hooks (this phase), the row UI components (this phase), and the dropdown shell (Phase 3). All result-row rendering is per-entity; grouping, dedupe, "Show more", and stale-row UX are in `SearchResultList` (Phase 3).

**Tech Stack:** React 19, TanStack Query 5 (`useInfiniteQuery`, `useMutation`), Vitest + Testing Library, the project's existing `@/lib/bindings` tauri-specta output.

**Spec:** `docs/superpowers/specs/2026-06-10-global-search-design.md`

**Phase 1 (prerequisite):** `docs/superpowers/plans/2026-06-10-global-search-phase-1-backend.md`
**Phase 3 (next):** `docs/superpowers/plans/2026-06-10-global-search-phase-3-ui-integration.md`
**Phase 4 (last):** `docs/superpowers/plans/2026-06-10-global-search-phase-4-tests-and-docs.md`

---

## Files Touched in This Phase

**New files (frontend):**

- `src/components/layout/search/types.ts` — `SearchHit`, `PaginatedSearchResult`, `SearchHistoryEntry` re-exports + constants.
- `src/lib/sanitize.ts` — `sanitizeHighlight` allowlist helper.
- `src/components/layout/search/useGlobalSearch.ts` — `useInfiniteQuery` wrapper.
- `src/components/layout/search/useSearchHistory.ts` — list / record / delete / clear hooks.
- `src/components/layout/search/result-rows/ProductResultRow.tsx`.
- `src/components/layout/search/result-rows/VariantResultRow.tsx`.
- `src/components/layout/search/result-rows/WarehouseResultRow.tsx`.

**New tests:**

- `src/lib/sanitize.test.ts`.

**No modified files in this phase.**

---

## Task 1: Create `src/components/layout/search/types.ts`

**Files:**

- Create: `src/components/layout/search/types.ts`

- [ ] **Step 1: Create the file**

Create `src/components/layout/search/types.ts` with:

```ts
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
```

- [ ] **Step 2: Verify it typechecks**

Run: `pnpm run typecheck`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/search/types.ts
git commit -m "feat(search): shared frontend types and constants"
```

---

## Task 2: Create `src/lib/sanitize.ts` (with tests)

**Files:**

- Create: `src/lib/sanitize.ts`
- Create: `src/lib/sanitize.test.ts`

- [ ] **Step 1: Create `sanitize.ts`**

Create `src/lib/sanitize.ts` with:

```ts
/**
 * Allowlist sanitizer for FTS5 `highlight()` HTML.
 *
 * FTS5's highlight() emits <mark>...</mark> around matches. The backend is
 * trusted, but we still pass the result through this allowlist so a future
 * backend change can't accidentally inject arbitrary HTML.
 */
export function sanitizeHighlight(html: string): string {
  if (!html) return ''
  // Strip everything but <mark>...</mark> and their text content.
  return html.replace(/<(?!\/?mark\b)[^>]*>/gi, '')
}
```

- [ ] **Step 2: Create the test file**

Create `src/lib/sanitize.test.ts` with:

```ts
import { describe, it, expect } from 'vitest'
import { sanitizeHighlight } from './sanitize'

describe('sanitizeHighlight', () => {
  it('keeps <mark> tags intact', () => {
    expect(sanitizeHighlight('Hello <mark>world</mark>')).toBe('Hello <mark>world</mark>')
  })

  it('strips arbitrary tags', () => {
    expect(sanitizeHighlight('<script>x</script><mark>ok</mark>')).toBe('<mark>ok</mark>')
  })

  it('strips dangerous attributes', () => {
    expect(sanitizeHighlight('<mark onclick="x">a</mark>')).toBe('<mark>a</mark>')
  })

  it('returns empty string for empty input', () => {
    expect(sanitizeHighlight('')).toBe('')
  })
})
```

- [ ] **Step 3: Run the tests**

Run: `pnpm run test:run -- src/lib/sanitize.test.ts`
Expected: 4 tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/lib/sanitize.ts src/lib/sanitize.test.ts
git commit -m "feat(search): allowlist sanitizer for highlight HTML"
```

---

## Task 3: Create `src/components/layout/search/useGlobalSearch.ts`

**Files:**

- Create: `src/components/layout/search/useGlobalSearch.ts`

- [ ] **Step 1: Create the file**

Create `src/components/layout/search/useGlobalSearch.ts` with:

```ts
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
      commands
        .globalSearch(trimmed, SEARCH_PAGE_SIZE, pageParam)
        .then(r => {
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
```

- [ ] **Step 2: Verify it typechecks**

Run: `pnpm run typecheck`
Expected: passes (uses the generated `PaginatedSearchResult` from Phase 1).

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/search/useGlobalSearch.ts
git commit -m "feat(search): useGlobalSearch infinite query hook"
```

---

## Task 4: Create `src/components/layout/search/useSearchHistory.ts`

**Files:**

- Create: `src/components/layout/search/useSearchHistory.ts`

- [ ] **Step 1: Create the file**

Create `src/components/layout/search/useSearchHistory.ts` with:

```ts
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
```

- [ ] **Step 2: Verify it typechecks**

Run: `pnpm run typecheck`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/search/useSearchHistory.ts
git commit -m "feat(search): useSearchHistory list/record/delete/clear hooks"
```

---

## Task 5: Create the three per-entity result-row components

**Files:**

- Create: `src/components/layout/search/result-rows/ProductResultRow.tsx`
- Create: `src/components/layout/search/result-rows/VariantResultRow.tsx`
- Create: `src/components/layout/search/result-rows/WarehouseResultRow.tsx`

- [ ] **Step 1: Create `ProductResultRow.tsx`**

```tsx
import { useTranslation } from 'react-i18next'
import { sanitizeHighlight } from '@/lib/sanitize'
import type { SearchHit } from '../types'

export function ProductResultRow({ hit }: { hit: SearchHit }) {
  const { t } = useTranslation()
  return (
    <div className="flex items-center gap-3">
      <span className="material-symbols-outlined text-on-surface-variant">inventory_2</span>
      <div className="flex flex-col flex-1 min-w-0">
        <span
          className="text-body-sm text-on-surface truncate"
          dangerouslySetInnerHTML={{ __html: sanitizeHighlight(hit.highlighted_title) }}
        />
        <span className="text-label-caps text-on-surface-variant truncate">
          {hit.subtitle}
          {hit.meta ? ` · ${hit.meta}` : ''}
        </span>
      </div>
      <span className="text-[10px] uppercase text-on-surface-variant">
        {t('search.matchedColumn.' + hit.matched_column, { defaultValue: hit.matched_column })}
      </span>
    </div>
  )
}
```

- [ ] **Step 2: Create `VariantResultRow.tsx`**

```tsx
import { useTranslation } from 'react-i18next'
import { sanitizeHighlight } from '@/lib/sanitize'
import type { SearchHit } from '../types'

export function VariantResultRow({ hit }: { hit: SearchHit }) {
  const { t } = useTranslation()
  return (
    <div className="flex items-center gap-3">
      <span className="material-symbols-outlined text-on-surface-variant">style</span>
      <div className="flex flex-col flex-1 min-w-0">
        <span
          className="text-body-sm text-on-surface truncate"
          dangerouslySetInnerHTML={{ __html: sanitizeHighlight(hit.highlighted_title) }}
        />
        <span className="text-label-caps text-on-surface-variant truncate">
          {hit.subtitle}
          {hit.meta ? ` · ${hit.meta}` : ''}
        </span>
      </div>
      <span className="text-[10px] uppercase text-on-surface-variant">
        {t('search.matchedColumn.' + hit.matched_column, { defaultValue: hit.matched_column })}
      </span>
    </div>
  )
}
```

- [ ] **Step 3: Create `WarehouseResultRow.tsx`**

```tsx
import { useTranslation } from 'react-i18next'
import { sanitizeHighlight } from '@/lib/sanitize'
import type { SearchHit } from '../types'

export function WarehouseResultRow({ hit }: { hit: SearchHit }) {
  const { t } = useTranslation()
  return (
    <div className="flex items-center gap-3">
      <span className="material-symbols-outlined text-on-surface-variant">warehouse</span>
      <div className="flex flex-col flex-1 min-w-0">
        <span
          className="text-body-sm text-on-surface truncate"
          dangerouslySetInnerHTML={{ __html: sanitizeHighlight(hit.highlighted_title) }}
        />
        <span className="text-label-caps text-on-surface-variant truncate">{hit.subtitle}</span>
      </div>
      <span className="text-[10px] uppercase text-on-surface-variant">
        {t('search.matchedColumn.' + hit.matched_column, { defaultValue: hit.matched_column })}
      </span>
    </div>
  )
}
```

- [ ] **Step 4: Typecheck**

Run: `pnpm run typecheck`
Expected: passes.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/search/result-rows/
git commit -m "feat(search): per-entity result-row components"
```

---

## Phase 2 Done

After completing all five tasks:

- `pnpm run typecheck` should pass.
- `pnpm run test:run -- src/lib/sanitize.test.ts` should pass with 4 tests.

The data hooks and row components are ready to be composed into the dropdown in Phase 3 (`docs/superpowers/plans/2026-06-10-global-search-phase-3-ui-integration.md`).
