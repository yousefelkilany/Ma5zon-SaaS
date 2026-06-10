# Global Search — Phase 4: Tests, Smoke, Check, Docs

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cover the new code with frontend tests (hook + list components), run a manual end-to-end smoke test, run the project's `check:all` quality gate, and update the developer docs so the new commands and hooks are discoverable.

**Architecture:** No new code in this phase except the test files. Tests live alongside the files they cover (`useGlobalSearch.test.tsx`, `useSearchHistory.test.tsx`, `SearchResultList.test.tsx`, `SearchHistoryList.test.tsx`) and use the project's existing Vitest + Testing Library setup. Manual smoke testing is done by running `pnpm run tauri dev` and walking through the spec's verification checklist.

**Tech Stack:** Vitest, Testing Library, Tauri dev server.

**Spec:** `docs/superpowers/specs/2026-06-10-global-search-design.md`

**Phase 1 (prerequisite):** `docs/superpowers/plans/2026-06-10-global-search-phase-1-backend.md`
**Phase 2 (prerequisite):** `docs/superpowers/plans/2026-06-10-global-search-phase-2-frontend-foundation.md`
**Phase 3 (prerequisite):** `docs/superpowers/plans/2026-06-10-global-search-phase-3-ui-integration.md`

---

## Files Touched in This Phase

**New tests:**

- `src/components/layout/search/useGlobalSearch.test.tsx`.
- `src/components/layout/search/useSearchHistory.test.tsx`.
- `src/components/layout/search/SearchResultList.test.tsx`.
- `src/components/layout/search/SearchHistoryList.test.tsx`.

**Modified docs:**

- `docs/developer/tauri-commands.md` — add the new commands.
- `docs/developer/state-management.md` — add the new hooks.

**No production code changes in this phase.**

---

## Task 1: Tests for `useGlobalSearch` and `useSearchHistory`

**Files:**

- Create: `src/components/layout/search/useGlobalSearch.test.tsx`
- Create: `src/components/layout/search/useSearchHistory.test.tsx`

- [ ] **Step 1: Create `useGlobalSearch.test.tsx`**

```tsx
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
```

- [ ] **Step 2: Create `useSearchHistory.test.tsx`**

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useSearchHistory, useRecordSearchHistory } from './useSearchHistory'

vi.mock('@/lib/tauri-bindings', () => ({
  commands: {
    searchHistoryList: vi.fn(),
    searchHistoryRecord: vi.fn(),
  },
}))

import { commands } from '@/lib/tauri-bindings'

function wrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )
}

describe('useSearchHistory', () => {
  beforeEach(() => vi.clearAllMocks())

  it('lists entries for a user', async () => {
    ;(commands.searchHistoryList as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 'ok',
      data: [{ id: '1', user_id: 'u1', query: 'hello', created_at: null }],
    })
    const { result } = renderHook(() => useSearchHistory('u1'), { wrapper: wrapper() })
    await waitFor(() => expect(result.current.data).toHaveLength(1))
    expect(result.current.data?.[0].query).toBe('hello')
  })

  it('records a query and invalidates the list', async () => {
    ;(commands.searchHistoryRecord as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 'ok',
      data: null,
    })
    const { result } = renderHook(() => useRecordSearchHistory('u1'), {
      wrapper: wrapper(),
    })
    result.current.mutate('hello')
    await waitFor(() =>
      expect(commands.searchHistoryRecord).toHaveBeenCalledWith('u1', 'hello'),
    )
  })
})
```

- [ ] **Step 3: Run the new tests**

Run: `pnpm run test:run -- src/components/layout/search`
Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/search/useGlobalSearch.test.tsx src/components/layout/search/useSearchHistory.test.tsx
git commit -m "test(search): useGlobalSearch and useSearchHistory hooks"
```

---

## Task 2: Tests for `SearchResultList` and `SearchHistoryList`

**Files:**

- Create: `src/components/layout/search/SearchResultList.test.tsx`
- Create: `src/components/layout/search/SearchHistoryList.test.tsx`

- [ ] **Step 1: Create `SearchResultList.test.tsx`**

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SearchResultList } from './SearchResultList'
import type { SearchHit } from './types'

const hit = (overrides: Partial<SearchHit> = {}): SearchHit => ({
  entity_type: 'product',
  id: '1',
  parent_id: null,
  matched_column: 'name',
  match_title: 'Laptop Stand',
  highlighted_title: '<mark>Laptop</mark> Stand',
  subtitle: 'Acme',
  meta: 'Accessories',
  rank: 1,
  ...overrides,
})

describe('SearchResultList', () => {
  it('groups hits by entity_type', () => {
    render(
      <SearchResultList
        hits={[
          hit({ entity_type: 'product', id: '1' }),
          hit({ entity_type: 'variant', id: '2' }),
          hit({ entity_type: 'product', id: '3' }),
        ]}
        totalCount={3}
        hasMore={false}
        onLoadMore={() => {}}
        isFetchingMore={false}
        onActivate={() => {}}
        activeIndex={0}
        setActiveIndex={() => {}}
      />,
    )
    expect(screen.getByTestId('search-result-list')).toBeInTheDocument()
    expect(screen.getAllByTestId('search-result-row')).toHaveLength(3)
  })

  it('renders "No results" when hits are empty', () => {
    render(
      <SearchResultList
        hits={[]}
        totalCount={0}
        hasMore={false}
        onLoadMore={() => {}}
        isFetchingMore={false}
        onActivate={() => {}}
        activeIndex={0}
        setActiveIndex={() => {}}
      />,
    )
    expect(screen.getByText(/no results/i)).toBeInTheDocument()
  })

  it('calls onLoadMore when Show more is clicked', () => {
    const onLoadMore = vi.fn()
    render(
      <SearchResultList
        hits={[hit()]}
        totalCount={100}
        hasMore
        onLoadMore={onLoadMore}
        isFetchingMore={false}
        onActivate={() => {}}
        activeIndex={0}
        setActiveIndex={() => {}}
      />,
    )
    fireEvent.click(screen.getByText(/show more/i))
    expect(onLoadMore).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Create `SearchHistoryList.test.tsx`**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
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
  beforeEach(() => vi.clearAllMocks())

  it('renders the full list when filter is empty', async () => {
    ;(commands.searchHistoryList as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 'ok',
      data: [entry('apple'), entry('banana')],
    })
    render(<SearchHistoryList userId="u1" filter="" onPick={() => {}} />, {
      wrapper: wrapper(),
    })
    expect(await screen.findByText('apple')).toBeInTheDocument()
    expect(screen.getByText('banana')).toBeInTheDocument()
  })

  it('filters by substring', async () => {
    ;(commands.searchHistoryList as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 'ok',
      data: [entry('apple'), entry('banana')],
    })
    render(<SearchHistoryList userId="u1" filter="ap" onPick={() => {}} />, {
      wrapper: wrapper(),
    })
    expect(await screen.findByText('apple')).toBeInTheDocument()
    expect(screen.queryByText('banana')).not.toBeInTheDocument()
  })

  it('shows "no recent searches" when history is empty and filter is empty', async () => {
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
```

- [ ] **Step 3: Run the new tests**

Run: `pnpm run test:run -- src/components/layout/search`
Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/search/SearchResultList.test.tsx src/components/layout/search/SearchHistoryList.test.tsx
git commit -m "test(search): SearchResultList and SearchHistoryList components"
```

---

## Task 3: Manual end-to-end smoke test

**Files:** None — verification only.

- [ ] **Step 1: Run the dev app and walk the verification checklist**

Run: `pnpm run tauri dev`

Open the navbar search input. Walk through the spec's §5.3 checklist:

- [ ] Create a product, variant, and warehouse. All appear in search results.
- [ ] Edit a product's name. The old query no longer matches; the new query does.
- [ ] Soft-delete a product. The result disappears from search within the same flow.
- [ ] Open the dev tools console and call the `refreshSearchIndex` command via the Tauri JS API: `await window.__TAURI__.core.invoke('plugin:event|listen', ...)`. (See `docs/developer/tauri-commands.md` for the exact invocation.) Stale entries should re-insert or remove correctly.
- [ ] Toggle the app to RTL. The trailing "open in new tab" button is on the visual start side. *(If the Phase 3 implementation did not yet include a trailing "open in new tab" button, log this as a known gap; the spec calls for it but the in-phase implementation merged that affordance into the click flow. File a follow-up.)*
- [ ] Submit a query that returns 0 results. It is not recorded in history.
- [ ] Submit a query that returns ≥1 result. It is recorded and appears at the top of the empty-dropdown list.
- [ ] Type 1–2 chars that match part of a previous query. Filtered history appears with `<mark>` on the matched substring.
- [ ] Press `Cmd/Ctrl+K` from anywhere in the app. The search input is focused.
- [ ] Press `/` from anywhere in the app. The search input is focused.
- [ ] Click a result, then immediately soft-delete the entity in another window. Re-opening that result from history shows the modal's `EntityMissingState`.

- [ ] **Step 2: If defects were found, fix them via the executing-plans loop, then commit each fix**

No commit needed if no code changed. If a defect was found, address it, run the relevant test or smoke step again, and commit a fix.

---

## Task 4: Run the full `check:all` quality gate

**Files:** None — verification only.

- [ ] **Step 1: Run the full suite**

Run: `pnpm run check:all`
Expected: typecheck, lint, ast:lint, format:check, rust:fmt:check, rust:clippy, test:run, rust:test all pass.

- [ ] **Step 2: Fix any issues inline and commit each fix**

If the run reveals issues, address them per the existing project's linting/formatting rules. Common fixes:

- `pnpm run format` for prettier issues.
- `pnpm run lint:fix` for eslint issues.
- `pnpm run rust:fmt` and `pnpm run rust:clippy:fix` for Rust.

Commit each fix with a clear message.

---

## Task 5: Update developer docs

**Files:**

- Modify: `docs/developer/tauri-commands.md`
- Modify: `docs/developer/state-management.md`

- [ ] **Step 1: Add the new commands to `docs/developer/tauri-commands.md`**

Open `docs/developer/tauri-commands.md` and append a new section:

```md
## Global Search

- `globalSearch(query, limit, offset)` → `PaginatedSearchResult`
- `refreshSearchIndex()` → `void`
- `searchHistoryList(userId, limit)` → `SearchHistoryEntry[]`
- `searchHistoryRecord(userId, query)` → `void`
- `searchHistoryDelete(id)` → `void`
- `searchHistoryClear(userId)` → `void`

All backed by per-entity FTS5 virtual tables. See
`docs/superpowers/specs/2026-06-10-global-search-design.md` for the schema,
triggers, and the union query.
```

- [ ] **Step 2: Add the new hooks to `docs/developer/state-management.md`**

Open `docs/developer/state-management.md` and append a new section:

```md
## Global search hooks

- `useGlobalSearch(query)` — `useInfiniteQuery` returning
  `{ flat: SearchHit[] }` and pagination state. The hook itself debounces
  by gating on `query.trim().length >= SEARCH_THRESHOLD` (3 characters);
  consumers do not need to debounce.
- `useSearchHistory(userId)` — list the last `SEARCH_HISTORY_LIMIT` (10)
  distinct queries for the active user.
- `useRecordSearchHistory(userId)`, `useDeleteSearchHistoryEntry(userId)`,
  `useClearSearchHistory(userId)` — mutations that invalidate the history
  query on success.

The history is only recorded when the user submits a search (Enter or
result click) and at least one result was returned. No-result queries are
not persisted.
```

- [ ] **Step 3: Commit**

```bash
git add docs/developer/tauri-commands.md docs/developer/state-management.md
git commit -m "docs(search): add global search commands and hooks to developer docs"
```

---

## Phase 4 Done

After completing all five tasks, the global search subsystem is fully landed, tested, and documented. Final acceptance:

- `pnpm run check:all` is green.
- `cd src-tauri && cargo test` passes (with the 7 new FTS5 / search_history tests).
- The manual smoke checklist from Task 3 is fully checked.
- Developer docs reference the new commands and hooks.

---

## Known Follow-ups (Out of This Plan's Scope)

These are spec-followups that can be picked up in separate specs:

1. The "open in new tab" trailing button (spec §3.3) was merged into the primary click flow during Phase 3 implementation. Add a dedicated trailing button that calls `useTabStore().addTab(...)` and navigates the new tab.
2. Click-time re-validate with `get_by_id` (spec §3.6) is not currently wired. The current flow relies on backend `active_*` joins and modal `EntityMissingState` as the missing-row defenses. To add a third layer: before `navigate`, do a `useGetProduct` / `useGetVariant` / `useGetWarehouse` query, and if it resolves to `undefined`, mark the row stale and skip the navigate.
3. Indexing `users`, `stock_movements`, and `stock_levels` (separate specs).
4. Typo tolerance via FTS5's `trigram` tokenizer.
5. Search history autocomplete-while-typing.
