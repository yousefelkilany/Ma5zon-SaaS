# Phase 3: Open via Hook + Delete `useUIStore.tabState`

**Goal:** All callers (`EntityWorkspace`, `SearchDropdown`, modals) write to `useTabStore` only. The mis-keyed `useUIStore.tabState` slice is deleted.

**Why after Phase 2:** the store is the source of truth for modals and the new draft fields exist. This phase is the migration of every remaining caller and the cleanup.

## Verification at end of phase

```bash
pnpm run typecheck && pnpm run test:run
```

Expected: passes; `ui-store.test.ts` is reduced to (or empty of) the deleted-slice tests; all other tests pass.

---

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

Note: when `inNewTab` is true, we still call `addTab` + `navigate` so the underlying tab route is set; then `pushModal` adds the modal to the new tab's stack.

- [ ] **Step 2: Add the `useTabStore` import**

Verify the import at line 4 is `import { useTabStore } from '@/store/workspace-store'`. (It is.) `useTabStore.getState()` is called inside the function so no selector is needed.

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
- Modify: `src/components/modal/__tests__/ModalManager.test.tsx` (cleanup)
- Modify: `src/components/entity/__tests__/ProductModal.test.tsx` (cleanup)
- Modify: `src/components/entity/__tests__/VariantModal.test.tsx` (cleanup)
- Modify: `src/components/entity/__tests__/WarehouseModal.test.tsx` (cleanup)

- [ ] **Step 1: Strip the slice from `ui-store.ts`**

In `src/store/ui-store.ts`, delete the following:

- `TabModalState` interface (lines 4-10)
- `TabStateSlice` type alias (line 12)
- `tabState: TabStateSlice` field (line 27)
- `setTabModal`, `setTabCreateDraft`, `setTabEditDraft`, `setTabIsDirty`, `clearTabState`, `clearAllTabState` (lines 41-55 in the interface and 108-176 in the implementation)
- `tabState: {} as TabStateSlice` initializer (line 77)

Adjust the imports: `EntityType` and `ModalType` may no longer be needed in the imports if no field uses them.

The full `ui-store.ts` after edits should look like:

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

- [ ] **Step 2: Strip the tests for deleted functions from `ui-store.test.ts`**

In `src/store/__tests__/ui-store.test.ts`, delete all tests that reference `tabState`, `setTabModal`, `setTabCreateDraft`, `setTabEditDraft`, `setTabIsDirty`, `clearTabState`, `clearAllTabState`, `TabModalState`, `TabStateSlice`, `EntityTabKey`. If the file has no other tests, delete it entirely.

- [ ] **Step 3: Update modal test setup calls**

In `src/components/modal/__tests__/ModalManager.test.tsx`, `src/components/entity/__tests__/ProductModal.test.tsx`, `src/components/entity/__tests__/VariantModal.test.tsx`, `src/components/entity/__tests__/WarehouseModal.test.tsx`, remove the `useUIStore.setState({ tabState: {} })` lines from `beforeEach` (and the `useUIStore` import if no longer used).

- [ ] **Step 4: Verify typecheck and tests**

Run: `pnpm run typecheck && pnpm run test:run`
Expected: passes.

- [ ] **Step 5: Commit**

```bash
git add src/store/ui-store.ts src/store/__tests__/ui-store.test.ts src/components/modal/__tests__/ModalManager.test.tsx src/components/entity/__tests__/ProductModal.test.tsx src/components/entity/__tests__/VariantModal.test.tsx src/components/entity/__tests__/WarehouseModal.test.tsx
git commit -m "refactor(ui-store): remove entity-type-keyed tabState slice"
```
