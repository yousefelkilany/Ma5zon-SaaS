# Phase 1: Store Foundation

**Goal:** Add the modal stack and per-tab-uuid draft fields to `useTabStore`. Add a `ModalFrame` type. No UI changes. The existing `useUIStore.tabState` slice is left in place; its callers are migrated in Phase 3.

**Why first:** every later phase depends on `pushModal`, `popModal`, `useCurrentModalFrame`. The new store fields and actions are added in this phase, then exercised in Phase 2 (`ModalManager` reading from them).

## Verification at end of phase

```bash
pnpm run typecheck && pnpm run test:run
```

Expected: passes; existing 8 tests in `workspace-store.test.ts` continue to pass; 10 new tests pass.

---

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
