# Phase 2: Stack-Driven ModalManager + Unload Guard

**Goal:** `ModalManager` reads from the `useTabStore` stack (not URL). The URL-capture effect in `MainWindowContent` now calls `pushModal` so the store is the source of truth. `UnloadGuard` is added.

**Why after Phase 1:** `pushModal` / `popModal` exist. The migration is mechanical: replace URL reads with store reads, and route URL-driven opens through `pushModal`.

**Migration note:** the existing call sites in `EntityWorkspace` and `SearchDropdown` still call `navigate({...})` in this phase. They are migrated in Phase 3. This phase only changes the *consumer* (`ModalManager`) and the *adapter* (`MainWindowContent`'s URL-capture effect).

## Verification at end of phase

```bash
pnpm run typecheck && pnpm run test:run
```

Expected: passes; `ModalManager` test now has 3 passing tests instead of 2.

---

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

```tsx
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

At the top of `src/components/layout/MainWindowContent.tsx`, the `useTabStore` import is already present. Verify the import line says exactly:

```ts
import { useTabStore } from '@/store/workspace-store'
```

If not, add it.

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

Note: the close-button selector may need adjustment based on the headless-ui Dialog close button aria-label. If `aria-label="Close"` doesn't match, check `src/components/ui/dialog.tsx` for the rendered close button class/aria-label and adjust.

- [ ] **Step 2: Run the tests**

Run: `pnpm run test:run src/components/modal/__tests__/ModalManager.test.tsx`
Expected: 3 passing tests.

- [ ] **Step 3: Commit**

```bash
git add src/components/modal/__tests__/ModalManager.test.tsx
git commit -m "test(modal): rewrite ModalManager tests for stack-driven rendering"
```
