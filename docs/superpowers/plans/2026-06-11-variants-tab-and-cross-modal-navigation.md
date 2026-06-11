# Variants Tab & Cross-Modal Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `variants` tab to the product detail modal, make entity names clickable across modal tabs to navigate between modals, replace URL-driven modal opening with a per-tab modal stack, and move per-tab draft state from `useUIStore.tabState[entityType]` to `useTabStore.tabUIStates[tabId]`.

**Architecture:** Modal state lives in a per-tab `modalStack: ModalFrame[]` array in `useTabStore.tabUIStates[tabId]`. `ModalManager` reads the active tab's stack top, renders the right modal, and pops on close. `EntityNameLink` is a small reusable button-component that pushes a modal frame via `useOpenEntityModal`. Existing call sites (entity workspace, search dropdown) switch from `navigate({...})` to `pushModal({...})`. The mis-keyed `useUIStore.tabState[entityType]` draft slice is deleted; drafts move to the tab-uuid-keyed `useTabStore.tabUIStates[tabId]`.

**Tech Stack:** React 19, TanStack Router, TanStack Query, Zustand v5, Vitest, Testing Library, TypeScript, Tauri v2. No new external dependencies.

---

## File Map

### New files

- `src/lib/types/modal-frame.ts` — shared `ModalFrame` type.
- `src/hooks/use-open-entity-modal.ts` — hook returning `openProduct`, `openVariant`, `openWarehouse`, `openCreateProduct`, `openCreateWarehouse`, `openCreateVariant`.
- `src/hooks/use-current-modal-frame.ts` — read-only selector for the top of the active tab's stack.
- `src/components/entity/EntityNameLink.tsx` — clickable name button.
- `src/components/entity/VariantsListForProduct.tsx` — shared list component with `mode: 'whole-row' | 'name-only'`.
- `src/components/modal/UnloadGuard.tsx` — `beforeunload` guard driven by store subscription.
- `src/hooks/__tests__/use-open-entity-modal.test.ts` — hook tests.
- `src/hooks/__tests__/use-current-modal-frame.test.tsx` — hook tests.
- `src/components/entity/__tests__/EntityNameLink.test.tsx` — component tests.
- `src/components/entity/__tests__/VariantsListForProduct.test.tsx` — component tests.

### Modified files

- `src/store/workspace-store.ts` — add `modalStack`, `createDraft`, `editDraft`, `isDirty` to `TabUIState`; add actions `pushModal`, `popModal`, `clearModalStack`, `setCreateDraft`, `setEditDraft`, `setIsDirty`, `clearTabDrafts`. Keep `removeTab` cleanup as-is.
- `src/store/workspace-store.test.ts` — extend tests.
- `src/store/ui-store.ts` — delete `tabState` slice and all `setTab*` / `clearTab*` functions. Keep UI prefs, `interceptedNavigation`.
- `src/store/__tests__/ui-store.test.ts` — remove tests for deleted functions.
- `src/lib/utils/tab-switch-guard.ts` — change signature to take a `TabUIState | undefined`.
- `src/lib/utils/__tests__/tab-switch-guard.test.ts` — update for new signature.
- `src/components/modal/ModalManager.tsx` — read from `useTabStore` stack; render via `useCurrentModalFrame`; `onClose` calls `popModal`.
- `src/components/modal/__tests__/ModalManager.test.tsx` — rewrite for stack-driven rendering.
- `src/components/layout/MainWindowContent.tsx` — delete the URL-capture effect; mount `<UnloadGuard />`; clean up imports.
- `src/components/layout/TabBar.tsx` — replace `useUIStore.tabState`/`clearTabState` with `useTabStore` selectors and `clearTabDrafts`; update `shouldInterceptTabSwitch` call.
- `src/components/layout/search/SearchDropdown.tsx` — replace `navigate({...})` calls with `pushModal`.
- `src/components/entity/EntityWorkspace.tsx` — replace all `navigate({...})` calls with `pushModal`; pass `product_id` in `handleVariantClick`.
- `src/components/entity/ProductModal.tsx` — add `variants` tab; switch draft writes from `useUIStore` to `useTabStore`; remove `entityType` prop dependency (read from `useCurrentModalFrame`).
- `src/components/entity/VariantModal.tsx` — switch draft writes; add parent-product `EntityNameLink` in details tab.
- `src/components/entity/WarehouseModal.tsx` — switch draft writes.
- `src/components/entity/StockLevelsTable.tsx` — accept optional `productId` prop; render `EntityNameLink` for variant names and warehouse names in pivot + variant views.
- `src/components/entity/VariantsSubTable.tsx` — refactor to a thin wrapper around `<VariantsListForProduct mode="whole-row" />`.
- `src/components/entity/__tests__/ProductModal.test.tsx` — new `variants` tab test; updated draft tests.
- `src/components/entity/__tests__/VariantModal.test.tsx` — product link test; updated draft tests.
- `src/components/entity/__tests__/WarehouseModal.test.tsx` — updated draft tests.
- `locales/en.json`, `locales/ar.json` — add `entity.detail.tabs.variants` translation.
- `docs/developer/` — append a new short doc on the modal-stack convention (one file).

### Deleted (per phase)

- `src/components/layout/modal-handle-registry.ts` — **kept** for now. The registry is still used by `TabBar` for `saveAndClose` on tab switch and by the modals to register their handle. Out of scope.

---

# Phase 1: Store Foundation

Goal: add the modal stack and per-tab-uuid draft fields to `useTabStore`; delete the mis-keyed `useUIStore.tabState` slice. No UI changes yet — the store additions are pure additions; the deletions are the *target* end state but the code that calls them is migrated in Phases 2–3.

**Why first:** every later phase depends on `pushModal`, `popModal`, `useCurrentModalFrame`. Removing the `useUIStore.tabState` slice last would block the build, so we remove the *callers* gradually, then remove the slice at the end of Phase 3. This phase adds the new store, leaves the old one in place, and the existing tests still pass.

## Task 1.1: Add `ModalFrame` type

**Files:**
- Create: `src/lib/types/modal-frame.ts`

- [ ] **Step 1: Create the type file**

Write the following to `src/lib/types/modal-frame.ts`:

```ts
import type { ModalType } from '@/lib/utils'

export interface ModalFrame {
  entity_modal: ModalType
  entity_id: string | null
  product_id?: string
}
```

- [ ] **Step 2: Verify typecheck**

Run: `pnpm run typecheck`
Expected: passes (no consumers yet).

- [ ] **Step 3: Commit**

```bash
git add src/lib/types/modal-frame.ts
git commit -m "feat(types): add ModalFrame type"
```

---

## Task 1.2: Extend `TabUIState` with modal stack + drafts

**Files:**
- Modify: `src/store/workspace-store.ts:17-34`

- [ ] **Step 1: Add new fields to `TabUIState`**

In `src/store/workspace-store.ts`, replace the `TabUIState` interface (lines 17-34) with:

```ts
interface TabUIState {
  page: number
  pageSize: number
  totalCount: number
  totalPages: number

  sort?: SortState
  filters: FilterState[]
  searchValue?: string
  localColumns: ColumnDef[]

  filterDialogOpen: boolean
  columnDialogOpen: boolean
  deleteDialogOpen: boolean

  selectedIds: Record<string, boolean>
  expandedIds: Record<string, boolean>

  modalStack: ModalFrame[]
  createDraft?: Record<string, unknown>
  editDraft?: Record<string, unknown>
  isDirty: boolean
}
```

- [ ] **Step 2: Add the import**

Add to the import block at the top of `src/store/workspace-store.ts` (after the existing type imports):

```ts
import type { ModalFrame } from '@/lib/types/modal-frame'
```

- [ ] **Step 3: Update `defaultUIState`**

Replace `defaultUIState` (lines 36-51) with:

```ts
export const defaultUIState: TabUIState = {
  page: 1,
  pageSize: 10,
  totalCount: 0,
  totalPages: 1,

  filters: [],
  localColumns: [],

  filterDialogOpen: false,
  columnDialogOpen: false,
  deleteDialogOpen: false,

  selectedIds: {},
  expandedIds: {},

  modalStack: [],
  isDirty: false,
}
```

- [ ] **Step 4: Verify typecheck and tests**

Run: `pnpm run typecheck && pnpm run test:run`
Expected: typecheck passes; existing workspace-store tests pass (no test references the new fields yet).

- [ ] **Step 5: Commit**

```bash
git add src/store/workspace-store.ts
git commit -m "feat(store): add modalStack and draft fields to TabUIState"
```

---

## Task 1.3: Add stack + draft actions to `useTabStore`

**Files:**
- Modify: `src/store/workspace-store.ts:53-81` (state interface)
- Modify: `src/store/workspace-store.ts` (implementation block, after existing actions)

- [ ] **Step 1: Extend `WorkspaceState` with new actions**

In `src/store/workspace-store.ts`, add the following methods to the `WorkspaceState` interface (after the existing action list, around line 81):

```ts
  pushModal: (frame: ModalFrame) => void
  popModal: () => void
  clearModalStack: () => void

  setCreateDraft: (draft: Record<string, unknown> | undefined) => void
  setEditDraft: (draft: Record<string, unknown> | undefined) => void
  setIsDirty: (dirty: boolean) => void
  clearTabDrafts: () => void
```

- [ ] **Step 2: Add a helper**

Right above the `useTabStore` `create` call, add this helper (used by all the new actions to keep the slice-update logic DRY):

```ts
function ensureTabUIState(
  state: WorkspaceState,
  tabId: string
): TabUIState {
  return state.tabUIStates[tabId] ?? { ...defaultUIState }
}

function shallowEqualFrame(a: ModalFrame, b: ModalFrame): boolean {
  return (
    a.entity_modal === b.entity_modal &&
    a.entity_id === b.entity_id &&
    (a.product_id ?? undefined) === (b.product_id ?? undefined)
  )
}
```

- [ ] **Step 3: Implement the actions**

Add the following inside the `useTabStore` `create` callback, after `setLocalColumns` (around line 342):

```ts
  pushModal: frame => {
    set(state => {
      const tabId = state.activeTabId
      const current = ensureTabUIState(state, tabId)
      const stack = current.modalStack
      if (stack.length > 0 && shallowEqualFrame(stack[stack.length - 1], frame)) {
        return state
      }
      return {
        tabUIStates: {
          ...state.tabUIStates,
          [tabId]: { ...current, modalStack: [...stack, frame] },
        },
      }
    })
  },

  popModal: () => {
    set(state => {
      const tabId = state.activeTabId
      const current = state.tabUIStates[tabId]
      if (!current || current.modalStack.length === 0) return state
      return {
        tabUIStates: {
          ...state.tabUIStates,
          [tabId]: {
            ...current,
            modalStack: current.modalStack.slice(0, -1),
          },
        },
      }
    })
  },

  clearModalStack: () => {
    set(state => {
      const tabId = state.activeTabId
      const current = state.tabUIStates[tabId]
      if (!current) return state
      return {
        tabUIStates: {
          ...state.tabUIStates,
          [tabId]: { ...current, modalStack: [] },
        },
      }
    })
  },

  setCreateDraft: draft => {
    set(state => {
      const tabId = state.activeTabId
      const current = ensureTabUIState(state, tabId)
      return {
        tabUIStates: {
          ...state.tabUIStates,
          [tabId]: { ...current, createDraft: draft },
        },
      }
    })
  },

  setEditDraft: draft => {
    set(state => {
      const tabId = state.activeTabId
      const current = ensureTabUIState(state, tabId)
      return {
        tabUIStates: {
          ...state.tabUIStates,
          [tabId]: { ...current, editDraft: draft },
        },
      }
    })
  },

  setIsDirty: dirty => {
    set(state => {
      const tabId = state.activeTabId
      const current = ensureTabUIState(state, tabId)
      return {
        tabUIStates: {
          ...state.tabUIStates,
          [tabId]: { ...current, isDirty: dirty },
        },
      }
    })
  },

  clearTabDrafts: () => {
    set(state => {
      const tabId = state.activeTabId
      const current = state.tabUIStates[tabId]
      if (!current) return state
      return {
        tabUIStates: {
          ...state.tabUIStates,
          [tabId]: {
            ...current,
            createDraft: undefined,
            editDraft: undefined,
            isDirty: false,
          },
        },
      }
    })
  },
```

- [ ] **Step 4: Verify typecheck**

Run: `pnpm run typecheck`
Expected: passes.

- [ ] **Step 5: Commit**

```bash
git add src/store/workspace-store.ts
git commit -m "feat(store): add pushModal, popModal, draft actions to useTabStore"
```

---

## Task 1.4: Tests for stack + draft actions

**Files:**
- Modify: `src/store/workspace-store.test.ts`

- [ ] **Step 1: Add the test cases**

Append the following to the bottom of `src/store/workspace-store.test.ts` (before the closing `})` of the `describe` block):

```ts
  describe('modal stack', () => {
    it('pushModal appends a frame to the active tab stack', () => {
      const { addTab, pushModal } = useTabStore.getState()
      const tabId = addTab({ title: 'P', type: 'new-tab', closable: true })
      pushModal({ entity_modal: 'product', entity_id: 'P1' })
      const stack = useTabStore.getState().tabUIStates[tabId]?.modalStack
      expect(stack).toEqual([{ entity_modal: 'product', entity_id: 'P1' }])
    })

    it('popModal removes the top frame', () => {
      const { addTab, pushModal, popModal } = useTabStore.getState()
      const tabId = addTab({ title: 'P', type: 'new-tab', closable: true })
      pushModal({ entity_modal: 'product', entity_id: 'P1' })
      pushModal({ entity_modal: 'variant', entity_id: 'V1' })
      popModal()
      const stack = useTabStore.getState().tabUIStates[tabId]?.modalStack
      expect(stack).toEqual([{ entity_modal: 'product', entity_id: 'P1' }])
    })

    it('popModal is a no-op on empty stack', () => {
      const { popModal } = useTabStore.getState()
      popModal()
      const state = useTabStore.getState()
      expect(state.tabUIStates.dashboard?.modalStack ?? []).toEqual([])
    })

    it('pushModal dedupes when top frame is shallow-equal to incoming frame', () => {
      const { addTab, pushModal } = useTabStore.getState()
      const tabId = addTab({ title: 'P', type: 'new-tab', closable: true })
      pushModal({ entity_modal: 'product', entity_id: 'P1' })
      pushModal({ entity_modal: 'product', entity_id: 'P1' })
      const stack = useTabStore.getState().tabUIStates[tabId]?.modalStack
      expect(stack).toHaveLength(1)
    })

    it('pushModal pushes when the new frame differs from the top', () => {
      const { addTab, pushModal } = useTabStore.getState()
      const tabId = addTab({ title: 'P', type: 'new-tab', closable: true })
      pushModal({ entity_modal: 'product', entity_id: 'P1' })
      pushModal({ entity_modal: 'product', entity_id: 'P2' })
      const stack = useTabStore.getState().tabUIStates[tabId]?.modalStack
      expect(stack).toHaveLength(2)
    })

    it('stacks are isolated per tab', () => {
      const { addTab, pushModal, setActiveTab } = useTabStore.getState()
      const tabA = addTab({ title: 'A', type: 'new-tab', closable: true })
      const tabB = addTab({ title: 'B', type: 'new-tab', closable: true })
      setActiveTab(tabA)
      pushModal({ entity_modal: 'product', entity_id: 'A1' })
      setActiveTab(tabB)
      pushModal({ entity_modal: 'product', entity_id: 'B1' })
      expect(
        useTabStore.getState().tabUIStates[tabA]?.modalStack
      ).toEqual([{ entity_modal: 'product', entity_id: 'A1' }])
      expect(
        useTabStore.getState().tabUIStates[tabB]?.modalStack
      ).toEqual([{ entity_modal: 'product', entity_id: 'B1' }])
    })

    it('removeTab wipes the tab modalStack', () => {
      const { addTab, pushModal, removeTab } = useTabStore.getState()
      const tabId = addTab({ title: 'X', type: 'new-tab', closable: true })
      pushModal({ entity_modal: 'product', entity_id: 'P1' })
      removeTab(tabId)
      expect(useTabStore.getState().tabUIStates[tabId]).toBeUndefined()
    })

    it('clearModalStack empties the active tab stack', () => {
      const { addTab, pushModal, clearModalStack } = useTabStore.getState()
      const tabId = addTab({ title: 'C', type: 'new-tab', closable: true })
      pushModal({ entity_modal: 'product', entity_id: 'P1' })
      clearModalStack()
      expect(
        useTabStore.getState().tabUIStates[tabId]?.modalStack
      ).toEqual([])
    })
  })

  describe('tab drafts (active-tab scoped)', () => {
    it('setCreateDraft writes to the active tab', () => {
      const { addTab, setCreateDraft } = useTabStore.getState()
      const tabId = addTab({ title: 'D', type: 'new-tab', closable: true })
      setCreateDraft({ name: 'Draft' })
      expect(useTabStore.getState().tabUIStates[tabId]?.createDraft).toEqual({
        name: 'Draft',
      })
    })

    it('setEditDraft and setIsDirty update independent fields', () => {
      const { addTab, setEditDraft, setIsDirty } = useTabStore.getState()
      const tabId = addTab({ title: 'D', type: 'new-tab', closable: true })
      setEditDraft({ name: 'Edit' })
      setIsDirty(true)
      const ui = useTabStore.getState().tabUIStates[tabId]
      expect(ui?.editDraft).toEqual({ name: 'Edit' })
      expect(ui?.isDirty).toBe(true)
    })

    it('clearTabDrafts wipes drafts and resets isDirty', () => {
      const { addTab, setCreateDraft, setIsDirty, clearTabDrafts } =
        useTabStore.getState()
      const tabId = addTab({ title: 'D', type: 'new-tab', closable: true })
      setCreateDraft({ name: 'X' })
      setIsDirty(true)
      clearTabDrafts()
      const ui = useTabStore.getState().tabUIStates[tabId]
      expect(ui?.createDraft).toBeUndefined()
      expect(ui?.editDraft).toBeUndefined()
      expect(ui?.isDirty).toBe(false)
    })
  })
```

- [ ] **Step 2: Run the tests**

Run: `pnpm run test:run src/store/workspace-store.test.ts`
Expected: all pass (including the existing 8 tests + 10 new tests).

- [ ] **Step 3: Commit**

```bash
git add src/store/workspace-store.test.ts
git commit -m "test(store): cover modal stack and tab-scoped drafts"
```

---

# Phase 2: Stack-Driven ModalManager + Unload Guard

Goal: `ModalManager` reads from the store, not the URL. `UnloadGuard` adds the `beforeunload` browser confirmation. Existing call sites (entity workspace, search dropdown) still use `navigate({...})` for now — they'll be migrated in Phase 3. The Phase 2 modal opening path is: open via `navigate({...})` → URL still has params → MainWindowContent's old effect captures them → `setTabModal` (still alive) → `ModalManager` still reads from URL. Wait — we want the store to be the source of truth.

**Refined Phase 2 plan:** `ModalManager` reads from URL AND falls back to the store stack (Phase 2 dual-read). All existing call sites continue to work. New stack-only opening will start in Phase 3. This keeps every existing test green.

Actually re-reading the spec: the URL capture in `MainWindowContent` writes to `useUIStore.tabState[entityType]` via `setTabModal(entityType, ...)`, which is *deleted* in Phase 3. To migrate cleanly, Phase 2 should:
1. `ModalManager` reads from `useTabStore.tabUIStates[activeTabId].modalStack` top frame. Empty stack = no modal.
2. `MainWindowContent` URL-capture effect (a) now writes to `useTabStore.pushModal` instead of `useUIStore.setTabModal`, (b) keeps the existing `setTabIsDirty`/`setTabCreateDraft`/`setTabEditDraft` calls (which still exist on `useUIStore` until Phase 3).
3. Modal close calls `popModal()`.
4. Add `UnloadGuard`.

This way the migration is "store becomes the source of truth, URL params still drive `pushModal`" — clean and the store is now authoritative.

## Task 2.1: Add `useCurrentModalFrame` hook

**Files:**
- Create: `src/hooks/use-current-modal-frame.ts`
- Create: `src/hooks/__tests__/use-current-modal-frame.test.tsx`

- [ ] **Step 1: Write the hook**

Create `src/hooks/use-current-modal-frame.ts`:

```ts
import { useTabStore } from '@/store/workspace-store'
import type { ModalFrame } from '@/lib/types/modal-frame'

export function useCurrentModalFrame(): ModalFrame | null {
  return useTabStore(state => {
    const stack = state.tabUIStates[state.activeTabId]?.modalStack
    if (!stack || stack.length === 0) return null
    return stack[stack.length - 1]
  })
}
```

- [ ] **Step 2: Write the test file**

Create `src/hooks/__tests__/use-current-modal-frame.test.tsx`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useTabStore } from '@/store/workspace-store'
import { useCurrentModalFrame } from '../use-current-modal-frame'

describe('useCurrentModalFrame', () => {
  beforeEach(() => {
    useTabStore.setState({
      tabs: [
        { id: 'dashboard', title: 'D', type: 'dashboard', closable: false },
      ],
      activeTabId: 'dashboard',
      tabUIStates: {},
    })
  })

  it('returns null when the active tab has no modal stack', () => {
    const { result } = renderHook(() => useCurrentModalFrame())
    expect(result.current).toBeNull()
  })

  it('returns the top frame of the active tab stack', () => {
    const { addTab, pushModal, setActiveTab } = useTabStore.getState()
    const tabId = addTab({ title: 'P', type: 'new-tab', closable: true })
    pushModal({ entity_modal: 'product', entity_id: 'P1' })
    pushModal({ entity_modal: 'variant', entity_id: 'V1' })
    setActiveTab(tabId)
    const { result } = renderHook(() => useCurrentModalFrame())
    expect(result.current).toEqual({
      entity_modal: 'variant',
      entity_id: 'V1',
    })
  })
})
```

- [ ] **Step 3: Run the test**

Run: `pnpm run test:run src/hooks/__tests__/use-current-modal-frame.test.tsx`
Expected: 2 passing tests.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/use-current-modal-frame.ts src/hooks/__tests__/use-current-modal-frame.test.tsx
git commit -m "feat(hooks): add useCurrentModalFrame"
```

---

## Task 2.2: Rewrite `ModalManager` to read from the store

**Files:**
- Modify: `src/components/modal/ModalManager.tsx`

- [ ] **Step 1: Replace the file contents**

Write the following to `src/components/modal/ModalManager.tsx` (full file replacement):

```tsx
import { useQueryClient } from '@tanstack/react-query'
import { useTabStore } from '@/store/workspace-store'
import { ProductModal } from '@/components/entity/ProductModal'
import { VariantModal } from '@/components/entity/VariantModal'
import { WarehouseModal } from '@/components/entity/WarehouseModal'
import type { ModalType } from '@/lib/utils'

export function ModalManager() {
  const queryClient = useQueryClient()
  const top = useTabStore(state => {
    const stack = state.tabUIStates[state.activeTabId]?.modalStack
    return stack && stack.length > 0 ? stack[stack.length - 1] : null
  })

  function handleClose() {
    useTabStore.getState().popModal()
  }

  if (!top) return null

  switch (top.entity_modal) {
    case 'product':
      if (!top.entity_id) return null
      return (
        <ProductModal
          entityId={top.entity_id}
          queryClient={queryClient}
          mode="view"
          onDeleted={handleClose}
        />
      )
    case 'variant':
      if (!top.entity_id) return null
      return (
        <VariantModal
          entityId={top.entity_id}
          productId={top.product_id}
          queryClient={queryClient}
          mode="view"
          onDeleted={handleClose}
        />
      )
    case 'warehouse':
      if (!top.entity_id) return null
      return (
        <WarehouseModal
          entityId={top.entity_id}
          queryClient={queryClient}
          mode="view"
          onDeleted={handleClose}
        />
      )
    case 'create-product':
      return (
        <ProductModal
          queryClient={queryClient}
          mode="create"
          onDeleted={handleClose}
        />
      )
    case 'create-warehouse':
      return (
        <WarehouseModal
          queryClient={queryClient}
          mode="create"
          onDeleted={handleClose}
        />
      )
    case 'create-variant':
      if (!top.product_id) return null
      return (
        <VariantModal
          productId={top.product_id}
          queryClient={queryClient}
          mode="create"
          onDeleted={handleClose}
        />
      )
    default: {
      const _exhaustive: never = top.entity_modal as ModalType
      return _exhaustive
    }
  }
}
```

Note: `create-variant` now reads from `top.product_id` instead of `top.entity_id` (the spec's cleanup).

- [ ] **Step 2: Run the typecheck**

Run: `pnpm run typecheck`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/components/modal/ModalManager.tsx
git commit -m "feat(modal): ModalManager reads from per-tab stack"
```

---

## Task 2.3: Update `MainWindowContent` URL-capture effect to push to the store

**Files:**
- Modify: `src/components/layout/MainWindowContent.tsx`

- [ ] **Step 1: Replace the effect's body**

In `src/components/layout/MainWindowContent.tsx`, replace the `useEffect` (lines 36-90) with:

```tsx
  useEffect(() => {
    const activeTab = tabs.find(t => t.id === activeTabId)
    if (!activeTab) return

    const prevTabId = prevTabIdRef.current
    const prevTab = prevTabId ? tabs.find(t => t.id === prevTabId) : undefined
    const prevEntityType = prevTab?.entityType

    if (prevTabId && prevEntityType) {
      const handle = getModalHandle(prevEntityType)
      if (handle) {
        const search = new URLSearchParams(location.search)
        const rawEntityModal = search.get('entity_modal') as ModalType
        const entity_modal =
          rawEntityModal && ModalTypes.includes(rawEntityModal)
            ? (rawEntityModal as ModalType)
            : null
        if (!entity_modal) return

        const raw_entity_id = decodeURIComponent(search.get('entity_id') || '')
        const entity_id = raw_entity_id.replace(/["\\]/g, '')
        const raw_product_id = decodeURIComponent(
          search.get('product_id') || ''
        )
        const product_id = raw_product_id.replace(/["\\]/g, '') || undefined

        const frame = {
          entity_modal,
          entity_id: entity_id || null,
          ...(product_id ? { product_id } : {}),
        }
        useTabStore.getState().pushModal(frame)
        useUIStore.getState().setTabIsDirty(prevEntityType, handle.getIsDirty())
        const createDraft = handle.getCreateDraft()
        const editDraft = handle.getEditDraft()
        if (createDraft)
          useUIStore.getState().setTabCreateDraft(prevEntityType, createDraft)
        if (editDraft)
          useUIStore.getState().setTabEditDraft(prevEntityType, editDraft)
      }
    }

    prevTabIdRef.current = activeTabId
  }, [activeTabId, tabs, location.search])
```

- [ ] **Step 2: Add the `useTabStore` import**

At the top of `src/components/layout/MainWindowContent.tsx`, the `useTabStore` import is already present. Add to the imports near line 4:

```ts
import { useTabStore } from '@/store/workspace-store'
```

(It is already imported; double-check the existing line says exactly this. If not, add it.)

- [ ] **Step 3: Remove the now-dead "Compute new path" block**

The "Compute the new path and search." block (lines 72-89 of the original, which navigated on tab switch using stored modal state) is now dead. Delete it. After your edit the file should look like:

```tsx
    prevTabIdRef.current = activeTabId
  }, [activeTabId, tabs, location.search])
```

followed by:

```tsx
  const handleInterceptedDiscard = () => { ... }
```

- [ ] **Step 4: Update the dependency array**

The `useEffect` dependency array should no longer include `navigate`, `setTabModal`, etc. (they're not in the body anymore). Use `[activeTabId, tabs, location.search]`.

- [ ] **Step 5: Remove unused imports**

`useNavigate` is no longer used in this file. Remove the import.

- [ ] **Step 6: Verify typecheck and tests**

Run: `pnpm run typecheck && pnpm run test:run`
Expected: passes.

- [ ] **Step 7: Commit**

```bash
git add src/components/layout/MainWindowContent.tsx
git commit -m "refactor(layout): push URL-driven modals into the store stack"
```

---

## Task 2.4: Add `UnloadGuard` component

**Files:**
- Create: `src/components/modal/UnloadGuard.tsx`
- Modify: `src/components/layout/MainWindowContent.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/modal/UnloadGuard.tsx`:

```tsx
import { useEffect } from 'react'
import { useTabStore } from '@/store/workspace-store'

function shouldGuard(
  tabCount: number,
  stackLengths: number[]
): boolean {
  if (tabCount > 1) return true
  return stackLengths.some(len => len > 0)
}

export function UnloadGuard() {
  const tabCount = useTabStore(state => state.tabs.length)
  const stackLengths = useTabStore(state =>
    state.tabs.map(t => state.tabUIStates[t.id]?.modalStack.length ?? 0)
  )

  useEffect(() => {
    if (!shouldGuard(tabCount, stackLengths)) return

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [tabCount, stackLengths])

  return null
}
```

- [ ] **Step 2: Mount it**

In `src/components/layout/MainWindowContent.tsx`, after the `<ModalManager />` element, add:

```tsx
<UnloadGuard />
```

Add the import at the top of the file:

```ts
import { UnloadGuard } from '@/components/modal/UnloadGuard'
```

- [ ] **Step 3: Verify typecheck and tests**

Run: `pnpm run typecheck && pnpm run test:run`
Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add src/components/modal/UnloadGuard.tsx src/components/layout/MainWindowContent.tsx
git commit -m "feat(modal): add beforeunload guard for non-trivial navigation history"
```

---

## Task 2.5: Update ModalManager tests for stack-driven rendering

**Files:**
- Modify: `src/components/modal/__tests__/ModalManager.test.tsx`

- [ ] **Step 1: Replace the test file**

Write the following to `src/components/modal/__tests__/ModalManager.test.tsx` (full file replacement):

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { QueryWrapper } from '@/lib/test-utils/query-wrapper'
import { ModalManager } from '../ModalManager'
import { useTabStore } from '@/store/workspace-store'
import { commands } from '@/lib/tauri-bindings'

vi.mock('@/lib/tauri-bindings', () => ({
  commands: {
    getById: vi.fn(),
    variantsGetById: vi.fn(),
    warehousesGetById: vi.fn(),
    stockLevelsGetByProduct: vi.fn(),
    stockLevelsGetByVariant: vi.fn(),
    stockMovementsGetByProduct: vi.fn(),
    stockMovementsGetByVariant: vi.fn(),
    stockMovementsGetByWarehouse: vi.fn(),
    variantsGetByProductWithStock: vi.fn(),
    warehousesGetAll: vi.fn(),
  },
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const mockOk = <T,>(data: T) => ({ status: 'ok' as const, data })

function resetStore() {
  useTabStore.setState({
    tabs: [
      { id: 'dashboard', title: 'D', type: 'dashboard', closable: false },
    ],
    activeTabId: 'dashboard',
    tabUIStates: {},
  })
}

describe('ModalManager (stack-driven)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetStore()
    vi.mocked(commands.getById).mockResolvedValue(
      mockOk({
        id: 'P1',
        company: 'ACME',
        name: 'Widget',
        category: 'A',
        created_at: '2025-01-01',
        updated_at: '2025-01-01',
        deleted_at: null,
      })
    )
    vi.mocked(commands.warehousesGetAll).mockResolvedValue(mockOk([]))
    vi.mocked(commands.stockLevelsGetByProduct).mockResolvedValue(mockOk([]))
    vi.mocked(commands.variantsGetByProductWithStock).mockResolvedValue(
      mockOk([])
    )
    vi.mocked(commands.stockMovementsGetByVariant).mockResolvedValue(mockOk([]))
  })

  it('renders nothing when the active tab stack is empty', () => {
    const { container } = render(<ModalManager />, {
      wrapper: QueryWrapper,
    })
    expect(container).toBeEmptyDOMElement()
  })

  it('renders the product modal when the top frame is a product', async () => {
    const { addTab, pushModal, setActiveTab } = useTabStore.getState()
    const tabId = addTab({ title: 'P', type: 'new-tab', closable: true })
    pushModal({ entity_modal: 'product', entity_id: 'P1' })
    setActiveTab(tabId)

    render(<ModalManager />, { wrapper: QueryWrapper })
    await waitFor(
      () => {
        const title = document.querySelector('[data-slot="dialog-title"]')
        const desc = document.querySelector('[data-slot="dialog-description"]')
        const text = `${title?.textContent ?? ''} ${desc?.textContent ?? ''}`
        expect(text).toMatch(/ACME|Widget/)
      },
      { timeout: 3000 }
    )
  })

  it('X button on the rendered modal pops the stack', async () => {
    const { addTab, pushModal, setActiveTab } = useTabStore.getState()
    const tabId = addTab({ title: 'P', type: 'new-tab', closable: true })
    pushModal({ entity_modal: 'product', entity_id: 'P1' })
    setActiveTab(tabId)

    const { default: userEvent } = await import('@testing-library/user-event')
    render(<ModalManager />, { wrapper: QueryWrapper })
    await waitFor(
      () =>
        expect(
          document.querySelector('[data-slot="dialog-title"]')
        ).toBeInTheDocument(),
      { timeout: 3000 }
    )

    await userEvent.setup().click(
      document.querySelector(
        '[data-slot="dialog"] [aria-label="Close"]'
      ) as HTMLElement
    )

    const stack = useTabStore.getState().tabUIStates[tabId]?.modalStack
    expect(stack).toEqual([])
  })
})
```

Note: the close-button selector may need adjustment based on the headless-ui Dialog close button aria-label. If `aria-label="Close"` doesn't match, fall back to clicking the first close button in the dialog or use the onClose prop directly via a test render.

- [ ] **Step 2: Run the tests**

Run: `pnpm run test:run src/components/modal/__tests__/ModalManager.test.tsx`
Expected: 3 passing tests.

If the close-button selector fails, update the selector to match whatever the actual Dialog close button is. Check `src/components/ui/dialog.tsx` for the rendered close button class/aria-label and adjust.

- [ ] **Step 3: Commit**

```bash
git add src/components/modal/__tests__/ModalManager.test.tsx
git commit -m "test(modal): rewrite ModalManager tests for stack-driven rendering"
```

---

# Phase 3: Open via Hook + Delete `useUIStore.tabState`

Goal: callers (`EntityWorkspace`, `SearchDropdown`) call `pushModal` directly instead of `navigate({...})`. Then delete the `useUIStore.tabState` slice and the corresponding call sites in modals / `TabBar`. End state: modals read drafts from the active tab's `tabUIState` via `useTabStore`.

## Task 3.1: Add `useOpenEntityModal` hook

**Files:**
- Create: `src/hooks/use-open-entity-modal.ts`
- Create: `src/hooks/__tests__/use-open-entity-modal.test.ts`

- [ ] **Step 1: Write the hook**

Create `src/hooks/use-open-entity-modal.ts`:

```ts
import { useCallback } from 'react'
import { useTabStore } from '@/store/workspace-store'

export function useOpenEntityModal() {
  const openProduct = useCallback(
    (id: string) => {
      useTabStore.getState().pushModal({
        entity_modal: 'product',
        entity_id: id,
      })
    },
    []
  )

  const openVariant = useCallback((id: string, productId?: string) => {
    useTabStore.getState().pushModal({
      entity_modal: 'variant',
      entity_id: id,
      ...(productId ? { product_id: productId } : {}),
    })
  }, [])

  const openWarehouse = useCallback((id: string) => {
    useTabStore.getState().pushModal({
      entity_modal: 'warehouse',
      entity_id: id,
    })
  }, [])

  const openCreateProduct = useCallback(() => {
    useTabStore.getState().pushModal({
      entity_modal: 'create-product',
      entity_id: null,
    })
  }, [])

  const openCreateWarehouse = useCallback(() => {
    useTabStore.getState().pushModal({
      entity_modal: 'create-warehouse',
      entity_id: null,
    })
  }, [])

  const openCreateVariant = useCallback((productId: string) => {
    useTabStore.getState().pushModal({
      entity_modal: 'create-variant',
      entity_id: null,
      product_id: productId,
    })
  }, [])

  return {
    openProduct,
    openVariant,
    openWarehouse,
    openCreateProduct,
    openCreateWarehouse,
    openCreateVariant,
  }
}
```

- [ ] **Step 2: Write the test file**

Create `src/hooks/__tests__/use-open-entity-modal.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useTabStore } from '@/store/workspace-store'
import { useOpenEntityModal } from '../use-open-entity-modal'

describe('useOpenEntityModal', () => {
  beforeEach(() => {
    useTabStore.setState({
      tabs: [
        { id: 'dashboard', title: 'D', type: 'dashboard', closable: false },
      ],
      activeTabId: 'dashboard',
      tabUIStates: {},
    })
  })

  it('openProduct pushes a product frame', () => {
    const { result } = renderHook(() => useOpenEntityModal())
    result.current.openProduct('P1')
    expect(
      useTabStore.getState().tabUIStates.dashboard?.modalStack
    ).toEqual([{ entity_modal: 'product', entity_id: 'P1' }])
  })

  it('openVariant includes product_id when provided', () => {
    const { result } = renderHook(() => useOpenEntityModal())
    result.current.openVariant('V1', 'P1')
    expect(
      useTabStore.getState().tabUIStates.dashboard?.modalStack
    ).toEqual([
      { entity_modal: 'variant', entity_id: 'V1', product_id: 'P1' },
    ])
  })

  it('openVariant omits product_id when not provided', () => {
    const { result } = renderHook(() => useOpenEntityModal())
    result.current.openVariant('V1')
    expect(
      useTabStore.getState().tabUIStates.dashboard?.modalStack
    ).toEqual([{ entity_modal: 'variant', entity_id: 'V1' }])
  })

  it('openCreateVariant sets entity_id: null and product_id', () => {
    const { result } = renderHook(() => useOpenEntityModal())
    result.current.openCreateVariant('P1')
    expect(
      useTabStore.getState().tabUIStates.dashboard?.modalStack
    ).toEqual([
      { entity_modal: 'create-variant', entity_id: null, product_id: 'P1' },
    ])
  })

  it('openWarehouse pushes a warehouse frame', () => {
    const { result } = renderHook(() => useOpenEntityModal())
    result.current.openWarehouse('W1')
    expect(
      useTabStore.getState().tabUIStates.dashboard?.modalStack
    ).toEqual([{ entity_modal: 'warehouse', entity_id: 'W1' }])
  })
})
```

- [ ] **Step 3: Run the tests**

Run: `pnpm run test:run src/hooks/__tests__/use-open-entity-modal.test.ts`
Expected: 5 passing tests.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/use-open-entity-modal.ts src/hooks/__tests__/use-open-entity-modal.test.ts
git commit -m "feat(hooks): add useOpenEntityModal"
```

---

## Task 3.2: Migrate `EntityWorkspace` click handlers to `pushModal`

**Files:**
- Modify: `src/components/entity/EntityWorkspace.tsx:118-159`

- [ ] **Step 1: Replace the click handlers**

In `src/components/entity/EntityWorkspace.tsx`, replace the four handlers (`handleAddNewClick`, `handleProductClick`, `handleVariantClick`, `handleAddVariant`) with:

```tsx
  const pushModal = useTabStore(state => state.pushModal)

  const handleAddNewClick = useCallback(() => {
    if (!entityType) return
    const entity_modal = `create-${entityType}` as
      | 'create-product'
      | 'create-warehouse'
    if (entityType === productEntity) {
      pushModal({ entity_modal: 'create-product', entity_id: null })
    } else if (entityType === warehouseEntity) {
      pushModal({ entity_modal: 'create-warehouse', entity_id: null })
    }
  }, [pushModal, entityType])

  const handleProductClick = useCallback(
    (productId: string) => {
      pushModal({ entity_modal: 'product', entity_id: productId })
    },
    [pushModal]
  )

  const handleVariantClick = useCallback(
    (variantId: string, productId: string) => {
      pushModal({
        entity_modal: 'variant',
        entity_id: variantId,
        product_id: productId,
      })
    },
    [pushModal]
  )

  const handleAddVariant = useCallback(
    (productId: string) => {
      pushModal({
        entity_modal: 'create-variant',
        entity_id: null,
        product_id: productId,
      })
    },
    [pushModal]
  )
```

- [ ] **Step 2: Remove unused imports**

Remove these imports from `src/components/entity/EntityWorkspace.tsx` if they are now unused:

- `useNavigate` from `@tanstack/react-router`
- `ModalType`, `ModalTypes` from `@/lib/utils`

(Keep `useParams` and `productEntity`/`warehouseEntity`.)

- [ ] **Step 3: Verify typecheck and tests**

Run: `pnpm run typecheck && pnpm run test:run`
Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add src/components/entity/EntityWorkspace.tsx
git commit -m "refactor(workspace): open modals via pushModal instead of navigate"
```

---

## Task 3.3: Migrate `SearchDropdown` to `pushModal`

**Files:**
- Modify: `src/components/layout/search/SearchDropdown.tsx:37-77`

- [ ] **Step 1: Replace `openHit`**

In `src/components/layout/search/SearchDropdown.tsx`, replace the `openHit` function (lines 37-77) with:

```tsx
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
      })
    }
    useTabStore.getState().pushModal({
      entity_modal,
      entity_id: hit.id,
      ...(hit.parent_id ? { product_id: hit.parent_id } : {}),
    })
    if (liveQueryEnabled && userId) record.mutate(trimmed)
    onClose()
  }
```

Note: when `inNewTab` is true, we still call `addTab` + `navigate` so the underlying tab route is set; then `pushModal` adds the modal to the new tab's stack. The modal now comes from the store, not the URL.

- [ ] **Step 2: Add the `useTabStore` import**

Verify the import at line 4 is `import { useTabStore } from '@/store/workspace-store'`. (It is.) Add the `pushModal` selector near the top of the component if you prefer the hook style; the `getState()` call above is also fine.

- [ ] **Step 3: Remove unused imports**

The `matchRoute` import is no longer used. Remove the `useMatchRoute` import.

- [ ] **Step 4: Verify typecheck and tests**

Run: `pnpm run typecheck && pnpm run test:run`
Expected: passes.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/search/SearchDropdown.tsx
git commit -m "refactor(search): open hit modals via pushModal"
```

---

## Task 3.4: Update `tab-switch-guard.ts` to take `TabUIState`

**Files:**
- Modify: `src/lib/utils/tab-switch-guard.ts`
- Modify: `src/lib/utils/__tests__/tab-switch-guard.test.ts`
- Modify: `src/components/layout/TabBar.tsx`

- [ ] **Step 1: Replace `tab-switch-guard.ts`**

Write the following to `src/lib/utils/tab-switch-guard.ts` (full file replacement):

```ts
import type { Tab } from '@/lib/utils'
import type { TabUIState } from '@/store/workspace-store'

export function shouldInterceptTabSwitch(
  tabUIState: TabUIState | undefined,
  _currentTab: Tab | undefined
): boolean {
  return tabUIState?.isDirty === true
}
```

- [ ] **Step 2: Replace the test file**

Write the following to `src/lib/utils/__tests__/tab-switch-guard.test.ts` (full file replacement):

```ts
import { describe, it, expect } from 'vitest'
import { shouldInterceptTabSwitch } from '../tab-switch-guard'
import type { Tab } from '@/lib/utils'
import type { TabUIState } from '@/store/workspace-store'
import { defaultUIState } from '@/store/workspace-store'

const productsTab: Tab = {
  id: 'tab-1',
  title: 'Products',
  type: 'entity',
  closable: true,
  entityType: 'products',
}

const dashboardTab: Tab = {
  id: 'tab-dash',
  title: 'Dashboard',
  type: 'dashboard',
  closable: false,
}

describe('shouldInterceptTabSwitch', () => {
  it('returns false when tabUIState is undefined', () => {
    expect(shouldInterceptTabSwitch(undefined, undefined)).toBe(false)
  })

  it('returns false when current tab has no entityType', () => {
    expect(shouldInterceptTabSwitch(defaultUIState, dashboardTab)).toBe(false)
  })

  it('returns false when isDirty is false', () => {
    const ui: TabUIState = { ...defaultUIState, isDirty: false }
    expect(shouldInterceptTabSwitch(ui, productsTab)).toBe(false)
  })

  it('returns true when isDirty is true', () => {
    const ui: TabUIState = { ...defaultUIState, isDirty: true }
    expect(shouldInterceptTabSwitch(ui, productsTab)).toBe(true)
  })
})
```

- [ ] **Step 3: Update `TabBar.tsx`**

In `src/components/layout/TabBar.tsx`, replace the `tabState` selector (line 17) and the `shouldInterceptTabSwitch` call (line 29) and the `clearTabState` call (line 41) with:

```tsx
  const activeTabUIState = useTabStore(
    state => state.tabUIStates[state.activeTabId] ?? defaultUIState
  )
  const clearTabDrafts = useTabStore(state => state.clearTabDrafts)
```

(Remove the `useUIStore` import. Add `defaultUIState` to the existing `useTabStore` import.)

Update `handleTabClick`:

```tsx
  const handleTabClick = (tabId: string) => {
    if (tabId === activeTabId) {
      setActiveTab(tabId)
      return
    }
    const currentTab = tabs.find(t => t.id === activeTabId)
    if (!shouldInterceptTabSwitch(activeTabUIState, currentTab)) {
      setActiveTab(tabId)
      return
    }
    const currentEntityType = currentTab?.entityType as EntityType
    if (!currentEntityType) {
      setActiveTab(tabId)
      return
    }
    setInterceptedNavigation({
      targetTabId: tabId,
      onDiscard: () => {
        clearTabDrafts()
        setActiveTab(tabId)
      },
      onSaveAndClose: async () => {
        const handle = getModalHandle(currentEntityType)
        await handle?.saveAndClose?.()
        setActiveTab(tabId)
      },
    })
  }
```

- [ ] **Step 4: Run the tests**

Run: `pnpm run test:run src/lib/utils/__tests__/tab-switch-guard.test.ts`
Expected: 4 passing tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/utils/tab-switch-guard.ts src/lib/utils/__tests__/tab-switch-guard.test.ts src/components/layout/TabBar.tsx
git commit -m "refactor(tab-bar): read dirty state from useTabStore"
```

---

## Task 3.5: Migrate modal draft writes from `useUIStore` to `useTabStore`

**Files:**
- Modify: `src/components/entity/ProductModal.tsx` (8 call sites)
- Modify: `src/components/entity/VariantModal.tsx` (8 call sites)
- Modify: `src/components/entity/WarehouseModal.tsx` (8 call sites)

- [ ] **Step 1: Migrate `ProductModal.tsx`**

In `src/components/entity/ProductModal.tsx`, replace every `useUIStore.getState().setTabCreateDraft(entityType, ...)` with `useTabStore.getState().setCreateDraft(...)`, every `useUIStore.getState().setTabEditDraft(entityType, ...)` with `useTabStore.getState().setEditDraft(...)`, every `useUIStore.getState().setTabIsDirty(entityType, ...)` with `useTabStore.getState().setIsDirty(...)`, every `useUIStore.getState().clearTabState(entityType)` with `useTabStore.getState().clearTabDrafts()`.

Add the `useTabStore` import (next to the existing `useUIStore` import):

```ts
import { useTabStore } from '@/store/workspace-store'
```

Remove the `useUIStore` import (no longer used in this file).

The full list of replacements (file-line:old → new):

- L159: `useUIStore.getState().clearTabState(entityType)` → `useTabStore.getState().clearTabDrafts()`
- L173: `useUIStore.getState().setTabIsDirty(entityType, false)` → `useTabStore.getState().setIsDirty(false)`
- L174: `useUIStore.getState().setTabEditDraft(entityType, undefined)` → `useTabStore.getState().setEditDraft(undefined)`
- L184: `useUIStore.getState().clearTabState(entityType)` → `useTabStore.getState().clearTabDrafts()`
- L226-228: three calls → `useTabStore.getState().setIsDirty(false)`, `useTabStore.getState().setEditDraft(undefined)`, `useTabStore.getState().setCreateDraft(undefined)`
- L317-320: `useUIStore.getState().setTabCreateDraft(entityType, values as ...)` → `useTabStore.getState().setCreateDraft(values as ...)`
- L390-393: `useUIStore.getState().setTabEditDraft(entityType, values as ...)` → `useTabStore.getState().setEditDraft(values as ...)`

Note: the `discardDrafts` callback in the `registerModalHandle` body also has a `useUIStore.getState().clearTabState(entityType)` call — change that too.

- [ ] **Step 2: Migrate `VariantModal.tsx`**

Same migration. The full list:

- L200: `useUIStore.getState().clearTabState(entityType)` → `useTabStore.getState().clearTabDrafts()`
- L214: `useUIStore.getState().setTabIsDirty(entityType, false)` → `useTabStore.getState().setIsDirty(false)`
- L215: `useUIStore.getState().setTabEditDraft(entityType, undefined)` → `useTabStore.getState().setEditDraft(undefined)`
- L223: `useUIStore.getState().clearTabState(entityType)` → `useTabStore.getState().clearTabDrafts()`
- L273-275: three calls → `useTabStore.getState().setIsDirty(false)`, `useTabStore.getState().setEditDraft(undefined)`, `useTabStore.getState().setCreateDraft(undefined)`
- L388-391: `useUIStore.getState().setTabCreateDraft(entityType, values as ...)` → `useTabStore.getState().setCreateDraft(values as ...)`
- L458-461: `useUIStore.getState().setTabEditDraft(entityType, values as ...)` → `useTabStore.getState().setEditDraft(values as ...)`

Add `useTabStore` import; remove `useUIStore` import.

- [ ] **Step 3: Migrate `WarehouseModal.tsx`**

Same migration. The full list:

- L139: `useUIStore.getState().clearTabState(entityType)` → `useTabStore.getState().clearTabDrafts()`
- L153: `useUIStore.getState().setTabIsDirty(entityType, false)` → `useTabStore.getState().setIsDirty(false)`
- L154: `useUIStore.getState().setTabEditDraft(entityType, undefined)` → `useTabStore.getState().setEditDraft(undefined)`
- L164: `useUIStore.getState().clearTabState(entityType)` → `useTabStore.getState().clearTabDrafts()`
- L207-209: three calls → `useTabStore.getState().setIsDirty(false)`, `useTabStore.getState().setEditDraft(undefined)`, `useTabStore.getState().setCreateDraft(undefined)`
- L294-297: `useUIStore.getState().setTabCreateDraft(entityType, values as ...)` → `useTabStore.getState().setCreateDraft(values as ...)`
- L365-368: `useUIStore.getState().setTabEditDraft(entityType, values as ...)` → `useTabStore.getState().setEditDraft(values as ...)`

Add `useTabStore` import; remove `useUIStore` import.

- [ ] **Step 4: Verify typecheck and tests**

Run: `pnpm run typecheck && pnpm run test:run`
Expected: passes.

- [ ] **Step 5: Commit**

```bash
git add src/components/entity/ProductModal.tsx src/components/entity/VariantModal.tsx src/components/entity/WarehouseModal.tsx
git commit -m "refactor(modals): write drafts to useTabStore instead of useUIStore"
```

---

## Task 3.6: Delete `useUIStore.tabState` slice and its tests

**Files:**
- Modify: `src/store/ui-store.ts`
- Modify: `src/store/__tests__/ui-store.test.ts`

- [ ] **Step 1: Strip the slice from `ui-store.ts`**

In `src/store/ui-store.ts`, delete the following:

- `TabModalState` interface (lines 4-10)
- `TabStateSlice` type alias (line 12)
- `EntityTabKey` (in the test file, not the store — leave alone in store; the type alias `EntityTabKey` lives in `ui-store.ts:2` of the test file; we'll delete that in step 2)
- `tabState: TabStateSlice` field (line 27)
- `setTabModal`, `setTabCreateDraft`, `setTabEditDraft`, `setTabIsDirty`, `clearTabState`, `clearAllTabState` (lines 41-55 in the interface and 108-176 in the implementation)
- `tabState: {} as TabStateSlice` initializer (line 77)

The remaining `UIState` interface fields, the `set*` actions for them, and the `create` call stay. Adjust the imports: `EntityType` and `ModalType` may no longer be needed in the imports if no field uses them.

The full `ui-store.ts` after edits should look roughly like:

```ts
import { create } from 'zustand'

export interface InterceptedNavigation {
  targetTabId: string
  onDiscard: () => void
  onSaveAndClose?: () => Promise<void> | void
}

export interface UserPreferences {
  language: 'ar' | 'en'
  theme?: 'light' | 'dark' | 'system'
  dateFormat?: string
}

interface UIState {
  isAppReady: boolean
  sidebarVisible: boolean
  commandPaletteOpen: boolean
  preferencesOpen: boolean
  lastQuickPaneEntry: string | null
  userPreferences: UserPreferences
  interceptedNavigation: InterceptedNavigation | null

  setAppReady: (isAppReady: boolean) => void
  toggleSidebar: () => void
  setSidebarVisible: (visible: boolean) => void
  toggleCommandPalette: () => void
  setCommandPaletteOpen: (open: boolean) => void
  togglePreferences: () => void
  setPreferencesOpen: (open: boolean) => void
  setLastQuickPaneEntry: (text: string) => void
  setSquareCorners: (enabled: boolean) => void
  setUserPreferences: (prefs: UserPreferences) => void
  updateUserPreferences: (partial: Partial<UserPreferences>) => void
  setInterceptedNavigation: (nav: InterceptedNavigation | null) => void
}

export const useUIStore = create<UIState>()(set => ({
  isAppReady: false,
  setAppReady: ready => set({ isAppReady: ready }),
  sidebarVisible: true,
  commandPaletteOpen: false,
  preferencesOpen: false,
  lastQuickPaneEntry: null,
  userPreferences: {
    language: 'ar',
    theme: 'system',
    dateFormat: 'yyyy-MM-dd',
  },
  interceptedNavigation: null,

  toggleSidebar: () =>
    set(state => ({ sidebarVisible: !state.sidebarVisible })),
  setSidebarVisible: visible => set({ sidebarVisible: visible }),
  toggleCommandPalette: () =>
    set(state => ({ commandPaletteOpen: !state.commandPaletteOpen })),
  setCommandPaletteOpen: open => set({ commandPaletteOpen: open }),
  togglePreferences: () =>
    set(state => ({ preferencesOpen: !state.preferencesOpen })),
  setPreferencesOpen: open => set({ preferencesOpen: open }),
  setLastQuickPaneEntry: text => set({ lastQuickPaneEntry: text }),

  setSquareCorners: (enabled: boolean) => {
    document.documentElement.classList.toggle('square-corners', enabled)
  },

  setUserPreferences: prefs => set({ userPreferences: prefs }),

  updateUserPreferences: partial =>
    set(state => ({
      userPreferences: { ...state.userPreferences, ...partial },
    })),

  setInterceptedNavigation: nav => set({ interceptedNavigation: nav }),
}))
```

(Plus the `cn` utility if the original had one. Strip whatever's not needed.)

- [ ] **Step 2: Strip the tests for deleted functions from `ui-store.test.ts`**

In `src/store/__tests__/ui-store.test.ts`, delete all tests that reference `tabState`, `setTabModal`, `setTabCreateDraft`, `setTabEditDraft`, `setTabIsDirty`, `clearTabState`, `clearAllTabState`, `TabModalState`, `TabStateSlice`, `EntityTabKey`. The file should be left with (or completely empty if the store has no other tests; check by reading the file post-edit).

- [ ] **Step 3: Update modal test setup calls**

In `src/components/modal/__tests__/ModalManager.test.tsx`, `src/components/entity/__tests__/ProductModal.test.tsx`, `src/components/entity/__tests__/VariantModal.test.tsx`, `src/components/entity/__tests__/WarehouseModal.test.tsx`, remove the `useUIStore.setState({ tabState: {} })` lines from `beforeEach` (they reset state that no longer exists). The setup line is harmless if you keep it (it'll just be a no-op), but the lint rule "no unused" may not flag it. Remove for cleanliness.

- [ ] **Step 4: Verify typecheck and tests**

Run: `pnpm run typecheck && pnpm run test:run`
Expected: passes.

- [ ] **Step 5: Commit**

```bash
git add src/store/ui-store.ts src/store/__tests__/ui-store.test.ts src/components/modal/__tests__/ModalManager.test.tsx src/components/entity/__tests__/ProductModal.test.tsx src/components/entity/__tests__/VariantModal.test.tsx src/components/entity/__tests__/WarehouseModal.test.tsx
git commit -m "refactor(ui-store): remove entity-type-keyed tabState slice"
```

---

# Phase 4: Cross-Link UI

Goal: add `EntityNameLink`; apply it in `StockLevelsTable` (pivot + variant view); add the `variants` tab to `ProductModal`; add the parent product link in `VariantModal` details. Extract the variants list into a shared component.

## Task 4.1: Add `EntityNameLink` component

**Files:**
- Create: `src/components/entity/EntityNameLink.tsx`
- Create: `src/components/entity/__tests__/EntityNameLink.test.tsx`

- [ ] **Step 1: Write the component**

Create `src/components/entity/EntityNameLink.tsx`:

```tsx
import type { ReactNode } from 'react'
import { useOpenEntityModal } from '@/hooks/use-open-entity-modal'
import { cn } from '@/lib/utils'

type LinkKind = 'product' | 'variant' | 'warehouse'

interface EntityNameLinkProps {
  kind: LinkKind
  id: string
  productId?: string
  className?: string
  children: ReactNode
}

export function EntityNameLink({
  kind,
  id,
  productId,
  className,
  children,
}: EntityNameLinkProps) {
  const { openProduct, openVariant, openWarehouse } = useOpenEntityModal()

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (kind === 'product') openProduct(id)
    else if (kind === 'variant') openVariant(id, productId)
    else openWarehouse(id)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'text-secondary cursor-pointer hover:underline bg-transparent border-0 p-0 font-inherit',
        className
      )}
    >
      {children}
    </button>
  )
}
```

- [ ] **Step 2: Write the test file**

Create `src/components/entity/__tests__/EntityNameLink.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { QueryWrapper } from '@/lib/test-utils/query-wrapper'
import { EntityNameLink } from '../EntityNameLink'
import { useTabStore } from '@/store/workspace-store'

function resetStore() {
  useTabStore.setState({
    tabs: [
      { id: 'dashboard', title: 'D', type: 'dashboard', closable: false },
    ],
    activeTabId: 'dashboard',
    tabUIStates: {},
  })
}

describe('EntityNameLink', () => {
  beforeEach(() => {
    resetStore()
  })

  it('renders its children', () => {
    render(<EntityNameLink kind="product" id="P1">Widget</EntityNameLink>, {
      wrapper: QueryWrapper,
    })
    expect(screen.getByRole('button', { name: 'Widget' })).toBeInTheDocument()
  })

  it('click pushes a product frame', async () => {
    render(<EntityNameLink kind="product" id="P1">Widget</EntityNameLink>, {
      wrapper: QueryWrapper,
    })
    await userEvent.setup().click(screen.getByRole('button', { name: 'Widget' }))
    expect(
      useTabStore.getState().tabUIStates.dashboard?.modalStack
    ).toEqual([{ entity_modal: 'product', entity_id: 'P1' }])
  })

  it('click pushes a variant frame with product_id when provided', async () => {
    render(
      <EntityNameLink kind="variant" id="V1" productId="P1">
        Red
      </EntityNameLink>,
      { wrapper: QueryWrapper }
    )
    await userEvent.setup().click(screen.getByRole('button', { name: 'Red' }))
    expect(
      useTabStore.getState().tabUIStates.dashboard?.modalStack
    ).toEqual([
      { entity_modal: 'variant', entity_id: 'V1', product_id: 'P1' },
    ])
  })

  it('click pushes a warehouse frame', async () => {
    render(
      <EntityNameLink kind="warehouse" id="W1">Main</EntityNameLink>,
      { wrapper: QueryWrapper }
    )
    await userEvent.setup().click(
      screen.getByRole('button', { name: 'Main' })
    )
    expect(
      useTabStore.getState().tabUIStates.dashboard?.modalStack
    ).toEqual([{ entity_modal: 'warehouse', entity_id: 'W1' }])
  })

  it('stopPropagation is called on click', async () => {
    const parentClick = vi.fn()
    render(
      <div onClick={parentClick}>
        <EntityNameLink kind="product" id="P1">Widget</EntityNameLink>
      </div>,
      { wrapper: QueryWrapper }
    )
    await userEvent.setup().click(screen.getByRole('button', { name: 'Widget' }))
    expect(parentClick).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 3: Run the tests**

Run: `pnpm run test:run src/components/entity/__tests__/EntityNameLink.test.tsx`
Expected: 5 passing tests.

- [ ] **Step 4: Commit**

```bash
git add src/components/entity/EntityNameLink.tsx src/components/entity/__tests__/EntityNameLink.test.tsx
git commit -m "feat(entity): add EntityNameLink"
```

---

## Task 4.2: Extract `VariantsListForProduct`

**Files:**
- Create: `src/components/entity/VariantsListForProduct.tsx`
- Create: `src/components/entity/__tests__/VariantsListForProduct.test.tsx`
- Modify: `src/components/entity/VariantsSubTable.tsx`

- [ ] **Step 1: Write the component**

Create `src/components/entity/VariantsListForProduct.tsx`:

```tsx
import type { VariantRow } from '@/lib/types/entity'
import { useTranslation } from 'react-i18next'
import { getEntityLayout } from '@/lib/entity-layout'
import { formatCurrency, productEntity } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { commands } from '@/lib/tauri-bindings'
import { EntityNameLink } from './EntityNameLink'

export type VariantsListMode = 'whole-row' | 'name-only'

interface VariantsListForProductProps {
  productId: string
  mode: VariantsListMode
  onVariantClick?: (variantId: string, productId: string) => void
  onAddVariant?: (productId: string) => void
}

export function VariantsListForProduct({
  productId,
  mode,
  onVariantClick,
  onAddVariant,
}: VariantsListForProductProps) {
  const { data: variants = [], isLoading } = useQuery({
    queryKey: ['entity', productEntity, 'variants', productId],
    queryFn: async () => {
      const result = await commands.variantsGetByProductWithStock(productId)
      if (result.status === 'ok') {
        return result.data as VariantRow[]
      }
      console.error('Failed to load variants:', result.error)
      return []
    },
    staleTime: Infinity,
  })
  const { t } = useTranslation()

  const columns = useMemo(() => getEntityLayout('variant', t), [t])

  if (isLoading) {
    return (
      <div className="pl-8 py-3 bg-surface-container-low">
        <Skeleton className="h-16 w-full" />
      </div>
    )
  }

  if (variants.length === 0) {
    return (
      <div className="pl-8 py-3 bg-surface-container-low text-on-surface-variant text-body-sm flex justify-between items-center pr-4">
        <span>{t('entity.layout.variant.none')}</span>
        {onAddVariant && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onAddVariant(productId)}
            className="text-secondary"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            {t('entity.create.variant.button')}
          </Button>
        )}
      </div>
    )
  }

  const showNameLink = mode === 'name-only'
  const nameColumnIndex = columns.findIndex(c => c.id === 'variant_name')

  return (
    <div className="pl-8 py-2 bg-surface-container-low">
      <div className="flex justify-between items-center pr-4 mb-2">
        <table className="w-full text-body-sm">
          <thead>
            <tr className="border-b border-outline-variant">
              {columns.map(col => (
                <th
                  key={col.id}
                  className={`px-3 py-2 text-start text-on-surface-variant font-label-caps ${
                    col.type === 'currency' ? 'text-end' : ''
                  }`}
                >
                  {col.label}
                </th>
              ))}
              {onAddVariant && (
                <th className="size-0.5 py-2 text-start text-on-surface-variant font-label-caps">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onAddVariant(productId)}
                    className="text-secondary"
                  >
                    <span className="material-symbols-outlined text-sm">add</span>
                    {t('entity.create.variant.button')}
                  </Button>
                </th>
              )}
            </tr>
          </thead>

          <tbody>
            {variants.map(variant => (
              <tr
                key={variant.id}
                className={`border-t border-outline-variant/30 transition-colors ${
                  mode === 'whole-row'
                    ? 'hover:bg-surface-container-high cursor-pointer'
                    : ''
                }`}
                onClick={
                  mode === 'whole-row'
                    ? () => onVariantClick?.(variant.id, productId)
                    : undefined
                }
              >
                {columns.map((col, idx) => {
                  const isNameColumn =
                    showNameLink && idx === nameColumnIndex
                  const cellValue =
                    col.type === 'currency'
                      ? formatCurrency(
                          variant[col.id as keyof VariantRow] as number
                        )
                      : String(variant[col.id as keyof VariantRow] ?? '-')
                  return (
                    <td
                      key={col.id}
                      className={`px-3 py-2 text-on-surface ${
                        col.type === 'currency'
                          ? 'text-right text-on-surface font-data-tabular tabular-nums'
                          : ''
                      }`}
                    >
                      {isNameColumn ? (
                        <EntityNameLink
                          kind="variant"
                          id={variant.id}
                          productId={productId}
                        >
                          {cellValue}
                        </EntityNameLink>
                      ) : (
                        cellValue
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Write the test file**

Create `src/components/entity/__tests__/VariantsListForProduct.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { QueryWrapper } from '@/lib/test-utils/query-wrapper'
import { VariantsListForProduct } from '../VariantsListForProduct'
import { commands } from '@/lib/tauri-bindings'
import { useTabStore } from '@/store/workspace-store'

vi.mock('@/lib/tauri-bindings', () => ({
  commands: {
    variantsGetByProductWithStock: vi.fn(),
  },
}))

const mockOk = <T,>(data: T) => ({ status: 'ok' as const, data })

const fakeVariants = [
  {
    id: 'V1',
    sku: 'SKU-1',
    variant_name: 'Red',
    uom_id: 'pcs',
    quantity: 5,
    retail_price: 10,
    wholesale_price: 8,
    distribution_price: 6,
  },
  {
    id: 'V2',
    sku: 'SKU-2',
    variant_name: 'Blue',
    uom_id: 'pcs',
    quantity: 7,
    retail_price: 12,
    wholesale_price: 9,
    distribution_price: 7,
  },
]

function resetStore() {
  useTabStore.setState({
    tabs: [
      { id: 'dashboard', title: 'D', type: 'dashboard', closable: false },
    ],
    activeTabId: 'dashboard',
    tabUIStates: {},
  })
}

describe('VariantsListForProduct', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetStore()
    vi.mocked(commands.variantsGetByProductWithStock).mockResolvedValue(
      mockOk(fakeVariants)
    )
  })

  it('whole-row mode: row click invokes onVariantClick and name is plain text', async () => {
    const onVariantClick = vi.fn()
    render(
      <QueryWrapper>
        <VariantsListForProduct
          productId="P1"
          mode="whole-row"
          onVariantClick={onVariantClick}
        />
      </QueryWrapper>
    )
    await waitFor(() => screen.getByText('Red'))
    await userEvent.setup().click(screen.getByText('Red'))
    expect(onVariantClick).toHaveBeenCalledWith('V1', 'P1')
  })

  it('name-only mode: name cell is an EntityNameLink, row has no onClick', async () => {
    const onVariantClick = vi.fn()
    render(
      <QueryWrapper>
        <VariantsListForProduct
          productId="P1"
          mode="name-only"
          onVariantClick={onVariantClick}
        />
      </QueryWrapper>
    )
    await waitFor(() => screen.getByText('Red'))
    await userEvent.setup().click(screen.getByText('Red'))
    expect(onVariantClick).not.toHaveBeenCalled()
    expect(
      useTabStore.getState().tabUIStates.dashboard?.modalStack
    ).toEqual([
      { entity_modal: 'variant', entity_id: 'V1', product_id: 'P1' },
    ])
  })
})
```

- [ ] **Step 3: Run the tests**

Run: `pnpm run test:run src/components/entity/__tests__/VariantsListForProduct.test.tsx`
Expected: 2 passing tests.

- [ ] **Step 4: Refactor `VariantsSubTable.tsx`**

Replace the body of `src/components/entity/VariantsSubTable.tsx` with a thin wrapper:

```tsx
import { VariantsListForProduct } from './VariantsListForProduct'

interface VariantsSubTableProps {
  productId: string
  onVariantClick?: (variantId: string, productId: string) => void
  onAddVariant?: (productId: string) => void
}

export function VariantsSubTable({
  productId,
  onVariantClick,
  onAddVariant,
}: VariantsSubTableProps) {
  return (
    <VariantsListForProduct
      productId={productId}
      mode="whole-row"
      onVariantClick={onVariantClick}
      onAddVariant={onAddVariant}
    />
  )
}
```

- [ ] **Step 5: Run the typecheck and tests**

Run: `pnpm run typecheck && pnpm run test:run`
Expected: passes; `VariantsSubTable` is unchanged from the caller's perspective.

- [ ] **Step 6: Commit**

```bash
git add src/components/entity/VariantsListForProduct.tsx src/components/entity/__tests__/VariantsListForProduct.test.tsx src/components/entity/VariantsSubTable.tsx
git commit -m "refactor(entity): extract VariantsListForProduct with row/name modes"
```

---

## Task 4.3: Add the `variants` tab to `ProductModal`

**Files:**
- Modify: `src/components/entity/ProductModal.tsx`
- Modify: `locales/en.json`, `locales/ar.json`
- Modify: `src/components/entity/__tests__/ProductModal.test.tsx`

- [ ] **Step 1: Add the i18n string**

In `locales/en.json`, after `"entity.detail.tabs.audits"`, add:

```json
"entity.detail.tabs.variants": "Variants",
```

In `locales/ar.json`, add the Arabic translation in the matching location. Use whatever translation is consistent with the rest of the file (e.g. "الفئات" or "المتغيرات"). The translator can refine.

- [ ] **Step 2: Add the tab to `EntityModalTabs`**

`EntityModalTabs` is exported from `src/lib/utils.ts:38-44`. The `ProductModal` and `VariantModal` consume it directly. To avoid touching the shared constant (which would also affect `VariantModal` where `variants` is not a sensible tab), introduce a per-modal local tab list.

In `src/components/entity/ProductModal.tsx`, near the top after the imports, add:

```ts
const PRODUCT_TABS = ['details', 'variants', 'stock', 'audits', 'insights'] as const
type ProductTab = (typeof PRODUCT_TABS)[number]
```

Then in the render, replace `EntityModalTabs.map(...)` with `PRODUCT_TABS.map(...)` and use the new `ProductTab` type for `activeTab`.

The original line 91 reads:
```ts
const [activeTab, setActiveTab] = useState<EntityModalTab>('details')
```

Change to:
```ts
const [activeTab, setActiveTab] = useState<ProductTab>('details')
```

Add the import for `VariantsListForProduct` and `useOpenEntityModal`:

```ts
import { VariantsListForProduct } from './VariantsListForProduct'
import { useOpenEntityModal } from '@/hooks/use-open-entity-modal'
```

- [ ] **Step 3: Add the new tab content**

Inside the JSX, after the `{activeTab === 'details' && (...)}` block and before `{activeTab === 'stock' && (...)}`, add:

```tsx
{activeTab === 'variants' && (
  <VariantsListForProduct
    productId={entityId ?? ''}
    mode="name-only"
    onAddVariant={onAddVariant}
  />
)}
```

`onAddVariant` is a new optional prop on `ProductModal`. Add it to the `ProductModalProps` interface:

```ts
interface ProductModalProps {
  entityId?: string
  queryClient: QueryClient
  mode: 'view' | 'create'
  onDeleted?: () => void
  container?: HTMLElement
  entityType?: EntityType
  onAddVariant?: (productId: string) => void
}
```

In `ModalManager.tsx` (the stack-driven one from Phase 2), `ProductModal` is rendered without `onAddVariant` for view mode. That means the add-variant button will not appear in the new tab when the modal is opened from the list. To match the spec ("Add Variant header button still works the same way via the existing onAddVariant callback wired from EntityWorkspace"), the wiring is: `EntityWorkspace` passes `onAddVariant` to `DataTableShell` which passes it to `DataTable` which passes it to `VariantsSubTable`. The new modal tab needs the same handler. Wire it in `ModalManager.tsx`:

In `src/components/modal/ModalManager.tsx`, in the `'product'` case, add a handler:

```tsx
case 'product': {
  if (!top.entity_id) return null
  const { openCreateVariant } = useOpenEntityModalStandalone()
  return (
    <ProductModal
      entityId={top.entity_id}
      queryClient={queryClient}
      mode="view"
      onDeleted={handleClose}
      onAddVariant={() =>
        useTabStore.getState().pushModal({
          entity_modal: 'create-variant',
          entity_id: null,
          product_id: top.entity_id,
        })
      }
    />
  )
}
```

But hooks can't be called inside a `case` — `useOpenEntityModal` is a hook. Refactor: pull `useOpenEntityModal` at the top of `ModalManager` once and reference the functions in the switch cases (they're stable callback refs).

Modify `src/components/modal/ModalManager.tsx`:

```tsx
export function ModalManager() {
  const queryClient = useQueryClient()
  const top = useTabStore(...)
  const { openCreateVariant } = useOpenEntityModal()

  function handleClose() {
    useTabStore.getState().popModal()
  }

  // ...switch...
  case 'product':
    if (!top.entity_id) return null
    return (
      <ProductModal
        entityId={top.entity_id}
        queryClient={queryClient}
        mode="view"
        onDeleted={handleClose}
        onAddVariant={() => openCreateVariant(top.entity_id!)}
      />
    )
  // ...
}
```

- [ ] **Step 4: Add the i18n import (if not already)**

Verify `useTranslation` is imported in `ProductModal.tsx`. (It is.) The tab label is read via `t('entity.detail.tabs.' + id)` (line 359 originally), so the new `'variants'` id will look up `entity.detail.tabs.variants` automatically.

- [ ] **Step 5: Add a test**

In `src/components/entity/__tests__/ProductModal.test.tsx`, add a new test:

```tsx
  it('renders the variants tab with a name-only list', async () => {
    vi.mocked(commands.getById).mockResolvedValue(
      mockOk({
        id: 'P1',
        company: 'ACME',
        name: 'Widget',
        category: 'A',
        created_at: null,
        updated_at: null,
        deleted_at: null,
      } as never)
    )
    vi.mocked(commands.warehousesGetAll).mockResolvedValue(mockOk([]))
    vi.mocked(commands.stockLevelsGetByProduct).mockResolvedValue(mockOk([]))
    vi.mocked(commands.variantsGetByProductWithStock).mockResolvedValue(
      mockOk([
        {
          id: 'V1',
          sku: 'SKU-1',
          variant_name: 'Red',
          uom_id: 'pcs',
          quantity: 5,
          retail_price: 10,
          wholesale_price: 8,
          distribution_price: 6,
        },
      ])
    )
    vi.mocked(commands.stockMovementsGetByVariant).mockResolvedValue(mockOk([]))

    renderModal()
    await waitFor(() => screen.getByRole('heading', { name: 'Widget' }))
    await userEvent.setup().click(screen.getByRole('tab', { name: /variants/i }))
    await waitFor(() => screen.getByText('Red'))
    // Red is now an EntityNameLink (button)
    expect(screen.getByRole('button', { name: 'Red' })).toBeInTheDocument()
  })
```

- [ ] **Step 6: Run the tests**

Run: `pnpm run test:run src/components/entity/__tests__/ProductModal.test.tsx`
Expected: 4 passing tests (3 existing + 1 new).

- [ ] **Step 7: Commit**

```bash
git add src/components/entity/ProductModal.tsx src/components/modal/ModalManager.tsx locales/en.json locales/ar.json src/components/entity/__tests__/ProductModal.test.tsx
git commit -m "feat(product-modal): add variants tab with clickable variant names"
```

---

## Task 4.4: Add `EntityNameLink` cross-links in `StockLevelsTable`

**Files:**
- Modify: `src/components/entity/StockLevelsTable.tsx`

- [ ] **Step 1: Add an optional `productId` prop**

Add to `StockLevelsTableProps` (line 18-23):

```ts
interface StockLevelsTableProps {
  stockLevels: StockLevelWithVariant[]
  isLoading?: boolean
  entity: StockScope
  onTransferSuccess?: () => void
  productId?: string
}
```

Destructure it: `function StockLevelsTable({ stockLevels, isLoading, entity, onTransferSuccess, productId })`.

Pass it through to `ProductStockPivot`:

```tsx
if (entity === productEntity) {
  return (
    <ProductStockPivot
      stockLevels={stockLevels}
      warehouseNames={warehouseNames}
      transferState={transferState}
      setTransferState={setTransferState}
      onTransferSuccess={onTransferSuccess}
      productId={productId}
    />
  )
}
```

Add `productId` to the `ProductStockPivot` props type:

```ts
function ProductStockPivot({
  stockLevels,
  warehouseNames,
  transferState,
  setTransferState,
  onTransferSuccess,
  productId,
}: {
  stockLevels: StockLevelWithVariant[]
  warehouseNames?: Map<string, string>
  transferState: transferState | null
  setTransferState: React.Dispatch<React.SetStateAction<transferState | null>>
  onTransferSuccess?: () => void
  productId?: string
}) {
```

- [ ] **Step 2: Wrap warehouse `<th>` in the pivot**

In `ProductStockPivot`, replace the warehouse header columns block (lines 251-258):

```tsx
{columns.map(wId => (
  <th
    key={wId}
    className="px-3 py-2 text-end text-on-surface-variant font-label-caps"
  >
    {wId ? (warehouseNames?.get(wId) ?? wId) : '-'}
  </th>
))}
```

with:

```tsx
{columns.map(wId => (
  <th
    key={wId}
    className="px-3 py-2 text-end text-on-surface-variant font-label-caps"
  >
    {wId ? (
      <EntityNameLink kind="warehouse" id={wId}>
        {warehouseNames?.get(wId) ?? wId}
      </EntityNameLink>
    ) : (
      '-'
    )}
  </th>
))}
```

- [ ] **Step 3: Wrap the variant name `<td>` in the pivot**

Replace the variant name `<td>` (line 269):

```tsx
<td className="px-3 py-2 text-on-surface">{row.variantName}</td>
```

with:

```tsx
<td className="px-3 py-2 text-on-surface">
  <EntityNameLink
    kind="variant"
    id={row.variantId}
    productId={productId}
  >
    {row.variantName}
  </EntityNameLink>
</td>
```

- [ ] **Step 4: Wrap warehouse names in `VariantStockView`**

Replace the warehouse name `<td>` (line 124-127):

```tsx
<td className="px-3 py-2 text-on-surface">
  {level.warehouse_id
    ? (warehouseNames?.get(level.warehouse_id) ??
      level.warehouse_id)
    : '-'}
</td>
```

with:

```tsx
<td className="px-3 py-2 text-on-surface">
  {level.warehouse_id ? (
    <EntityNameLink kind="warehouse" id={level.warehouse_id}>
      {warehouseNames?.get(level.warehouse_id) ?? level.warehouse_id}
    </EntityNameLink>
  ) : (
    '-'
  )}
</td>
```

- [ ] **Step 5: Add the import**

In `src/components/entity/StockLevelsTable.tsx`, add:

```ts
import { EntityNameLink } from './EntityNameLink'
```

- [ ] **Step 6: Pass `productId` from `ProductModal`**

In `src/components/entity/ProductModal.tsx`, find the `<StockLevelsTable ... />` usage and add `productId={entityId}`.

- [ ] **Step 7: Run typecheck and tests**

Run: `pnpm run typecheck && pnpm run test:run`
Expected: passes.

- [ ] **Step 8: Commit**

```bash
git add src/components/entity/StockLevelsTable.tsx src/components/entity/ProductModal.tsx
git commit -m "feat(stock): make warehouse and variant names clickable"
```

---

## Task 4.5: Add parent product link in `VariantModal` details

**Files:**
- Modify: `src/components/entity/VariantModal.tsx`

- [ ] **Step 1: Add the link above the details grid**

After the `entity ? ( ... ) : null` check inside the `details` tab (around line 444, just before the `<EntityFieldGrid>` or `<VariantForm>`), add a row showing the parent product. Find a good spot — right at the top of the details section.

Insert this JSX before the `<div className="space-y-4">` block (line 445):

```tsx
{entity.product_id && (
  <div className="flex items-center gap-2 text-body-sm">
    <span className="text-on-surface-variant">
      {t('entity.variant.product')}:
    </span>
    <EntityNameLink kind="product" id={entity.product_id}>
      {entity.product_name ?? entity.product_id}
    </EntityNameLink>
  </div>
)}
```

`entity.product_id` and `entity.product_name` come from the variant query response. If the query does not currently return `product_name`, fall back to showing the id; the click still works because the link uses `product_id`.

(Verify in `src/lib/bindings.ts` or the type for `Variant` returned by `variantsGetById`. If `product_name` is not in the binding, drop that field; the link still works.)

- [ ] **Step 2: Add the i18n key**

In `locales/en.json`, add `entity.variant.product: "Product"` next to the other variant keys. Add the Arabic translation in `locales/ar.json`.

- [ ] **Step 3: Add the import**

In `src/components/entity/VariantModal.tsx`, add:

```ts
import { EntityNameLink } from './EntityNameLink'
```

- [ ] **Step 4: Add a test**

In `src/components/entity/__tests__/VariantModal.test.tsx`, add a test:

```tsx
  it('shows the parent product as a clickable link', async () => {
    vi.mocked(commands.variantsGetById).mockResolvedValue(
      mockOk({
        id: 'V1',
        product_id: 'P1',
        product_name: 'Widget',
        sku: 'SKU-1',
        variant_name: 'Red',
        uom_id: 'pcs',
        retail_price: 10,
        wholesale_price: 8,
        distribution_price: 6,
        created_at: null,
        updated_at: null,
        deleted_at: null,
      } as never)
    )
    vi.mocked(commands.warehousesGetAll).mockResolvedValue(mockOk([]))
    vi.mocked(commands.stockLevelsGetByVariant).mockResolvedValue(mockOk([]))
    vi.mocked(commands.stockMovementsGetByVariant).mockResolvedValue(mockOk([]))
    vi.mocked(commands.variantsGetByProductWithStock).mockResolvedValue(
      mockOk([])
    )

    renderModal()
    await waitFor(() => screen.getByRole('heading', { name: 'Red' }))
    const link = screen.getByRole('button', { name: 'Widget' })
    expect(link).toBeInTheDocument()
  })
```

- [ ] **Step 5: Run the tests**

Run: `pnpm run test:run src/components/entity/__tests__/VariantModal.test.tsx`
Expected: passes.

- [ ] **Step 6: Commit**

```bash
git add src/components/entity/VariantModal.tsx locales/en.json locales/ar.json src/components/entity/__tests__/VariantModal.test.tsx
git commit -m "feat(variant-modal): show clickable parent product in details"
```

---

# Phase 5: Polish & Final Checks

## Task 5.1: Add developer docs for the modal stack

**Files:**
- Create: `docs/developer/modal-stack.md`

- [ ] **Step 1: Write the doc**

Create `docs/developer/modal-stack.md`:

````markdown
# Modal Stack Convention

Modals in this app are driven by a per-tab stack in `useTabStore.tabUIStates[tabId].modalStack: ModalFrame[]`. The top frame is what `ModalManager` renders.

## Opening a modal

Use the `useOpenEntityModal()` hook (see `src/hooks/use-open-entity-modal.ts`):

```ts
const { openProduct, openVariant, openWarehouse, openCreateVariant } =
  useOpenEntityModal()

openProduct('P1')                     // open product modal for P1
openVariant('V1', 'P1')               // open variant modal, parent product known
openCreateVariant('P1')               // open create-variant under product P1
```

These functions call `useTabStore.getState().pushModal(frame)` internally.

## Why not URL search params?

URL search params can only describe one modal at a time. With the stack:
- Modals can be opened on top of modals (variant modal opens product modal from a link).
- Closing returns to the previous modal in the stack.
- Tab switching preserves each tab's stack independently.

The URL still reflects the active tab's underlying route (`/entity/products` etc.) for shareability. Modal state is not URL-serialized.

## Modal frame shape

```ts
interface ModalFrame {
  entity_modal: ModalType        // 'product' | 'variant' | 'warehouse' | 'create-...'
  entity_id: string | null       // the entity this modal is ABOUT
  product_id?: string            // parent product, when context requires it
}
```

Conventions:
- `entity_id` is the id of the entity the modal is about (= variant id for VariantModal).
- `product_id` is set when the modal was opened from a context that knows the parent product (e.g. clicking a variant name in a product's stock tab).
- For `create-variant`: `entity_id: null`, `product_id: <parentId>`.

## Dedupe

`pushModal` is a no-op when the incoming frame is shallow-equal to the current top. This prevents accidental double-opens (e.g. clicking the same link twice).

## Unload guard

`UnloadGuard` (mounted next to `ModalManager`) installs a `beforeunload` listener when the user has more than the bare dashboard open (multiple tabs, or any modal on the stack). The browser shows its native "Leave site?" dialog on refresh/close.
````

- [ ] **Step 2: Commit**

```bash
git add docs/developer/modal-stack.md
git commit -m "docs(developer): document the modal-stack convention"
```

---

## Task 5.2: Full quality gate

- [ ] **Step 1: Run check:all**

Run: `pnpm run check:all`
Expected: passes (typecheck, lint, ast:lint, format:check, rust:fmt:check, rust:clippy, test:run, rust:test all green).

If format:check fails, run `pnpm run format` and re-stage. If lint fails, run `pnpm run lint:fix` and re-stage.

- [ ] **Step 2: Manual smoke**

The plan completes with these smoke checks already enumerated in the spec; the implementer should perform at least these on the dev build:

- Open a product modal → click a variant name in the new `variants` tab → variant modal opens. Click X → product modal returns.
- Open a product modal's `stock` tab → click a warehouse column header → warehouse modal opens. X returns to product modal.
- Open a variant modal → click the parent product name in details → product modal opens. X returns to variant modal.
- Refresh with 2 tabs open → browser confirms. Refresh with 1 tab + no modals → no prompt.
- Click the same variant name twice in a row → no double-modal.

- [ ] **Step 3: Commit any format/lint fixes**

```bash
git add -A
git commit -m "chore: apply format and lint fixes"
```

(Only if step 1 produced changes.)

---

## Self-Review

**Spec coverage** — checked against `docs/superpowers/specs/2026-06-11-variants-tab-and-cross-modal-navigation-design.md`:

| Spec section | Task |
|---|---|
| Modal frame shape | 1.1 |
| Per-tab stack in workspace store | 1.2, 1.3, 1.4 |
| Modal stack dedupe | 1.3 (shallowEqualFrame), 1.4 (test) |
| Browser unload guard | 2.4 |
| `useCurrentModalFrame` | 2.1 |
| `useOpenEntityModal` | 3.1 |
| `EntityNameLink` | 4.1 |
| New `variants` tab in ProductModal | 4.3 |
| `VariantsListForProduct` shared component | 4.2 |
| `StockLevelsTable` cross-links (pivot + variant view) | 4.4 |
| `VariantModal` parent product link | 4.5 |
| Migrate `EntityWorkspace` to `pushModal` | 3.2 |
| Migrate `SearchDropdown` to `pushModal` | 3.3 |
| Migrate `tab-switch-guard` | 3.4 |
| Migrate modal draft writes | 3.5 |
| Delete `useUIStore.tabState` slice | 3.6 |
| ModalManager reads from store | 2.2 |
| ModalManager tests rewritten | 2.5 |
| Per-tab-uuid keying | 1.2, 3.5, 3.6 |
| `create-variant` uses `product_id` | 2.2 |
| Dedupe guard | 1.3 + tests |
| 1-entity-type=1-tab invariant preserved (no changes to `addTab` logic) | (intentional — flagged in spec as future work) |
| Developer docs | 5.1 |
| Quality gates | 5.2 |

**Placeholder scan:** no TBDs; no "implement later"; all code blocks are concrete; no "similar to task N" without restating.

**Type consistency:** `ModalFrame` is the same shape across Task 1.1, 1.3, 1.4, 2.1, 2.2, 2.4, 3.1, 4.1, 4.2, 5.1. `pushModal`/`popModal`/`clearModalStack`/`setCreateDraft`/`setEditDraft`/`setIsDirty`/`clearTabDrafts` action names are consistent across 1.3, 1.4, 2.4, 3.2, 3.3, 3.4, 3.5. `EntityNameLink` props `kind`/`id`/`productId`/`children`/`className` are consistent in 4.1, 4.2, 4.4, 4.5.
