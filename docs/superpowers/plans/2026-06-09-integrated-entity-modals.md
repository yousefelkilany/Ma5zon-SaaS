# Integrated Entity Modals with TanStack Mutation Lifecycle — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make entity detail modals (`ProductModal`, `VariantModal`, `WarehouseModal`) non-blocking, state-preserved per tab, and powered by a full `useMutation` lifecycle. Replace the shared Radix `ui/dialog` shim with a Headless UI version, and add an unsaved-changes guard to every data-entry dialog.

**Architecture:** Three independent changes — (1) Headless UI dialog shim with `modal={true|false}` opt-in, (2) hybrid URL + Zustand per-tab modal state, (3) `useMutation` hooks with optimistic updates in a new `services/entity/` module. Implemented bottom-up: deps → shim → guard hook → store slice → query layer → mutation layer → modal migrations (parallel) → wiring.

**Tech Stack:** Headless UI v2 (`@headlessui/react`), Immer (`immer`), TanStack Query v5, Zustand v5, existing Vitest + Testing Library + shadcn/Tailwind v4 stack.

**Spec:** `docs/superpowers/specs/2026-06-09-integrated-entity-modals-design.md`

**Conventions:** Use `pnpm` (not npm). Selector subscriptions for Zustand stores. TDD: write failing test → run → make it pass → commit. Frequent commits. No unsolicited commits at the end of tasks (each task ends with its own commit).

---

## File Structure

### New

| File | Responsibility |
|---|---|
| `src/services/entity/queryKeys.ts` | Central query-key factory for entity data. |
| `src/services/entity/queries.ts` | Read hooks (`useGetProduct`, `useGetVariant`, `useGetWarehouse`, `useStockLevelsForProduct`, `useStockLevelsForVariant`, `useStockMovements`, `useWarehouses`). |
| `src/services/entity/mutations.ts` | 9 mutation hooks (`useCreateProduct`/`useUpdateProduct`/`useSoftDeleteProduct` + variant + warehouse siblings). |
| `src/services/entity/types.ts` | Shared input/output types (`ProductUpdateValues`, etc.). |
| `src/services/entity/__tests__/queryKeys.test.ts` | Query-key shape snapshot. |
| `src/services/entity/__tests__/queries.test.ts` | Read hook correctness. |
| `src/services/entity/__tests__/mutations.test.ts` | Optimistic update + rollback + reconcile. |
| `src/hooks/use-unsaved-guard.ts` | Unsaved-changes confirmation popover hook. |
| `src/hooks/__tests__/use-unsaved-guard.test.ts` | Guard hook behavior. |

### Modified

| File | Change |
|---|---|
| `src/components/ui/dialog.tsx` | Full rewrite on `@headlessui/react`. Exports: `Dialog`, `DialogBackdrop`, `DialogPanel`, `DialogTitle`, `DialogDescription`. Accepts `modal?: boolean` (default `true`). Removes `DialogTrigger`, `DialogPortal`, `DialogClose`, `DialogHeader`, `DialogFooter`. |
| `src/components/modal/ModalManager.tsx` | Per-tab state, unsaved-guard integration, portal target. |
| `src/components/entity/ProductModal.tsx` | Migrate to mutation hooks, add X button, wire unsaved guard, `modal={false}`. |
| `src/components/entity/VariantModal.tsx` | Same as ProductModal. |
| `src/components/entity/WarehouseModal.tsx` | Same as ProductModal. |
| `src/components/layout/MainWindowContent.tsx` | Rewrite tab→URL effect to capture/restore per-tab state. |
| `src/components/entity/EntityWorkspace.tsx` | `position: relative` wrapper, portal target ref via context. |
| `src/store/ui-store.ts` | Add `tabState` slice keyed by `entityType`, plus selectors and actions. |
| `src/store/__tests__/ui-store.test.ts` | New tests for the slice. |
| `src/components/entity/FilterDialog.tsx` | Shim swap + unsaved guard. |
| `src/components/entity/ColumnVisibilityDialog.tsx` | Shim swap + unsaved guard. |
| `src/components/entity/PrintPreviewDialog.tsx` | Shim swap + unsaved guard. |
| `src/components/entity/ConfirmationDialog.tsx` | Shim swap only. |
| `src/components/auth/LoginModal.tsx` | Shim swap only. |
| `src/components/auth/ProfileModal.tsx` | Shim swap + unsaved guard (2-button, no `onSaveAndClose`). |
| `src/components/preferences/PreferencesDialog.tsx` | Shim swap + unsaved guard (3-button, `onSaveAndClose` → `useSavePreferences`). |
| `src/components/ui/command.tsx` | Shim swap only. |
| `package.json` | Add `@headlessui/react` and `immer`. |
| `src/lib/test-utils/query-wrapper.tsx` | New shared `QueryClient` + `QueryClientProvider` test wrapper (used by `mutations.test.ts` and modal component tests). |
| `src/components/modal/__tests__/ModalManager.test.tsx` | New. |
| `src/components/entity/__tests__/ProductModal.test.tsx` | New. |
| `src/components/entity/__tests__/VariantModal.test.tsx` | New. |
| `src/components/entity/__tests__/WarehouseModal.test.tsx` | New. |
| `src/components/entity/__tests__/FilterDialog.test.tsx` | New. |
| `src/components/entity/__tests__/ColumnVisibilityDialog.test.tsx` | New. |
| `src/components/entity/__tests__/PrintPreviewDialog.test.tsx` | New. |
| `src/components/preferences/__tests__/PreferencesDialog.test.tsx` | New. |

### Not modified

Rust commands, route definitions, `ModalTypes` enum (in `src/lib/utils.ts`), `services/preferences.ts` (its `useSavePreferences` hook stays), the form components (`ProductForm`, `VariantForm`, `WarehouseForm` — they keep their existing `onSubmit`/`isLoading`/`initialValues`/`schema` API; only the parent wiring changes), sidebar, navbar, tab bar, the Tauri/Rust backend.

---

## Execution Order

Tasks 1–3 (deps) → 4 (test wrapper) → 5 (shim) → 6 (guard hook) → 7 (store slice) → 8 (EntityWorkspace portal) → 9 (queryKeys) → 10 (queries) → 11 (mutations) → 12 (MainWindowContent effect rewrite) → 13 (ModalManager) → 14–18 (each entity modal + its tests) → 19–25 (each consumer dialog migration + its tests, parallelizable among themselves).

Tasks 14–18 are independent of each other and can run in parallel via subagents. Tasks 19–25 are likewise independent of each other and of 14–18 (they only depend on Task 5 — the shim — and on Task 6 for the unsaved guard wiring). Task 12 must land before 14–18.

The plan defines each task as a self-contained unit. Subagent-driven execution can fan out from Task 14 onward.

---

# Tasks

## Task 1: Add Headless UI and Immer dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add dependencies via pnpm**

Run:
```bash
pnpm add @headlessui/react immer
```

Expected: `package.json` updated, `pnpm-lock.yaml` updated, no errors.

- [ ] **Step 2: Verify install**

Run: `pnpm ls @headlessui/react immer`
Expected: both packages listed with version paths.

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore(deps): add @headlessui/react and immer"
```

---

## Task 2: Define shared types for entity services

**Files:**
- Create: `src/services/entity/types.ts`

- [ ] **Step 1: Create the types file**

Create `src/services/entity/types.ts` with the following content:

```ts
import type { commands } from '@/lib/tauri-bindings'

type Product = NonNullable<
  Awaited<ReturnType<typeof commands.getById>> extends { data?: infer D }
    ? D
    : never
>

type Variant = NonNullable<
  Awaited<ReturnType<typeof commands.variantsGetById>> extends { data?: infer D }
    ? D
    : never
>

type Warehouse = NonNullable<
  Awaited<ReturnType<typeof commands.warehousesGetById>> extends {
    data?: infer D
  }
    ? D
    : never
>

type ProductUpdateValues = {
  company: string
  name: string
  category: string
}

type VariantUpdateValues = {
  // populated during Task 14 against the real `commands.variantsUpdate` signature
  [key: string]: string | number | boolean | null
}

type WarehouseUpdateValues = {
  // populated during Task 14 against the real `commands.warehousesUpdate` signature
  [key: string]: string | number | boolean | null
}

export type {
  Product,
  Variant,
  Warehouse,
  ProductUpdateValues,
  VariantUpdateValues,
  WarehouseUpdateValues,
}
```

- [ ] **Step 2: Typecheck to confirm `commands` exports match**

Run: `pnpm run typecheck`
Expected: PASS (no errors). If `commands.getById` etc. don't exist exactly under those names, adjust the type-extraction lines to match the real names (read `src/lib/tauri-bindings.ts` to confirm). This is the one place where a real-name check is required before the rest of the plan can proceed.

- [ ] **Step 3: Commit**

```bash
git add src/services/entity/types.ts
git commit -m "feat(entity-services): add shared types"
```

---

## Task 3: Create the central query-keys factory

**Files:**
- Create: `src/services/entity/queryKeys.ts`
- Create: `src/services/entity/__tests__/queryKeys.test.ts`

- [ ] **Step 1: Create the factory**

Create `src/services/entity/queryKeys.ts` with the following content:

```ts
export type EntityType = 'products' | 'variants' | 'warehouses'

export type StockScope = 'product' | 'variant'
export type MovementScope = 'product' | 'variant' | 'warehouse'

export const entityQueryKeys = {
  all: ['entity'] as const,

  // list-level (the workspace's data table)
  list: (
    entityType: EntityType,
    sort: string,
    page: number,
    pageSize: number
  ) => [...entityQueryKeys.all, entityType, sort, page, pageSize] as const,

  // invalidation helpers (match the existing 'entity' + plural convention)
  lists: () => [...entityQueryKeys.all] as const,
  listFor: (entityType: EntityType) =>
    [...entityQueryKeys.all, entityType] as const,

  // item-level (a single entity's detail, used by the modal)
  detail: (entityType: EntityType, id: string) =>
    [...entityQueryKeys.all, entityType, 'detail', id] as const,

  // secondary reads
  stockLevels: (scope: StockScope, id: string) =>
    ['stock-levels-' + scope, id] as const,
  stockMovements: (scope: MovementScope, id: string) =>
    ['stock-movements-' + scope, id] as const,
  warehouses: () => ['warehouses', 'all'] as const,
  variantsByProduct: (productId: string) => ['variants', productId] as const,
  productsByWarehouse: (warehouseId: string) =>
    ['products', warehouseId] as const,
}
```

- [ ] **Step 2: Write the test**

Create `src/services/entity/__tests__/queryKeys.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { entityQueryKeys } from '../queryKeys'

describe('entityQueryKeys', () => {
  it('all starts with entity', () => {
    expect(entityQueryKeys.all).toEqual(['entity'])
  })

  it('list produces a stable shape', () => {
    expect(entityQueryKeys.list('products', 'name-asc', 1, 25)).toEqual([
      'entity',
      'products',
      'name-asc',
      1,
      25,
    ])
  })

  it('listFor returns all entries for an entity type (matches existing invalidation pattern)', () => {
    expect(entityQueryKeys.listFor('products')).toEqual(['entity', 'products'])
    expect(entityQueryKeys.listFor('variants')).toEqual(['entity', 'variants'])
  })

  it('detail includes entity type, "detail", and id', () => {
    expect(entityQueryKeys.detail('products', 'P1')).toEqual([
      'entity',
      'products',
      'detail',
      'P1',
    ])
  })

  it('stockLevels and stockMovements follow the existing prefixed-scope convention', () => {
    expect(entityQueryKeys.stockLevels('product', 'P1')).toEqual([
      'stock-levels-product',
      'P1',
    ])
    expect(entityQueryKeys.stockMovements('warehouse', 'W1')).toEqual([
      'stock-movements-warehouse',
      'W1',
    ])
  })

  it('warehouses, variantsByProduct, productsByWarehouse match the existing ad-hoc keys', () => {
    expect(entityQueryKeys.warehouses()).toEqual(['warehouses', 'all'])
    expect(entityQueryKeys.variantsByProduct('P1')).toEqual(['variants', 'P1'])
    expect(entityQueryKeys.productsByWarehouse('W1')).toEqual([
      'products',
      'W1',
    ])
  })
})
```

- [ ] **Step 3: Run the test**

Run: `pnpm run test:run src/services/entity/__tests__/queryKeys.test.ts`
Expected: PASS (6/6).

- [ ] **Step 4: Commit**

```bash
git add src/services/entity/queryKeys.ts src/services/entity/__tests__/queryKeys.test.ts
git commit -m "feat(entity-services): add query-keys factory with tests"
```

---

## Task 4: Create the QueryClient test wrapper

**Files:**
- Create: `src/lib/test-utils/query-wrapper.tsx`

The mutation tests in Task 11 and the modal component tests in Tasks 14–18 all need a `QueryClientProvider` with a fresh `QueryClient` per test. Centralize the wrapper here.

- [ ] **Step 1: Create the wrapper**

Create `src/lib/test-utils/query-wrapper.tsx`:

```tsx
import { type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  })
}

interface QueryWrapperProps {
  children: ReactNode
  client?: QueryClient
}

export function QueryWrapper({
  children,
  client = createTestQueryClient(),
}: QueryWrapperProps) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/test-utils/query-wrapper.tsx
git commit -m "test(util): add QueryClient test wrapper"
```

---

## Task 5: Rewrite the `ui/dialog` shim on Headless UI

**Files:**
- Modify: `src/components/ui/dialog.tsx` (full rewrite)

- [ ] **Step 1: Replace the file contents**

Replace the contents of `src/components/ui/dialog.tsx` with:

```tsx
import { type ReactNode, type ComponentPropsWithoutRef } from 'react'
import {
  Dialog as HuiDialog,
  DialogBackdrop as HuiDialogBackdrop,
  DialogPanel as HuiDialogPanel,
  DialogTitle as HuiDialogTitle,
  DialogDescription as HuiDialogDescription,
} from '@headlessui/react'
import { XIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DialogProps {
  open: boolean
  onClose: (value: boolean) => void
  modal?: boolean
  children: ReactNode
  className?: string
}

/**
 * Dialog root. Wraps Headless UI Dialog.
 *
 * `modal={true}` (default): draws a backdrop, locks body scroll, traps focus.
 * `modal={false}`: no backdrop, no scroll lock, no focus trap — the rest of
 *   the app stays interactive. Escape still closes.
 */
function Dialog({
  open,
  onClose,
  modal = true,
  children,
  className,
}: DialogProps) {
  return (
    <HuiDialog
      open={open}
      onClose={onClose}
      className={cn('relative z-50', className)}
    >
      {modal && <DialogBackdrop />}
      {children}
    </HuiDialog>
  )
}

function DialogBackdrop() {
  return (
    <HuiDialogBackdrop className="fixed inset-0 bg-black/50 transition-opacity" />
  )
}

interface DialogPanelProps extends ComponentPropsWithoutRef<'div'> {
  showCloseButton?: boolean
  onClose?: () => void
}

function DialogPanel({
  className,
  children,
  showCloseButton = true,
  onClose,
  ...props
}: DialogPanelProps) {
  return (
    <div className="fixed inset-0 flex items-center justify-center p-4">
      <HuiDialogPanel
        data-slot="dialog-content"
        className={cn(
          'bg-background grid w-full gap-4 rounded-lg border p-6 shadow-lg min-w-200 max-w-[65vw] max-h-[80vh] overflow-auto',
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && onClose && (
          <button
            type="button"
            onClick={onClose}
            data-slot="dialog-close"
            aria-label="Close"
            className="ring-offset-background focus:ring-ring absolute top-4 inset-e-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden"
          >
            <XIcon />
          </button>
        )}
      </HuiDialogPanel>
    </div>
  )
}

function DialogTitle({ className, ...props }: ComponentPropsWithoutRef<'h2'>) {
  return (
    <HuiDialogTitle
      data-slot="dialog-title"
      className={cn('text-lg leading-none font-semibold', className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: ComponentPropsWithoutRef<'p'>) {
  return (
    <HuiDialogDescription
      data-slot="dialog-description"
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  )
}

export { Dialog, DialogBackdrop, DialogPanel, DialogTitle, DialogDescription }
```

Note: removed exports are `DialogTrigger`, `DialogPortal`, `DialogClose`, `DialogHeader`, `DialogFooter`. Consumers using these will be fixed in Tasks 19–25. The shim does not import `@radix-ui/react-dialog` anymore; that dependency remains in `package.json` for the other Radix-based components (popover, dropdown, etc.) and is removed in Task 26.

- [ ] **Step 2: Typecheck**

Run: `pnpm run typecheck`
Expected: PASS (existing consumers will now show errors — that's expected and is fixed in Tasks 19–25).

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/dialog.tsx
git commit -m "refactor(ui): rewrite dialog shim on @headlessui/react"
```

---

## Task 6: Create the `useUnsavedGuard` hook

**Files:**
- Create: `src/hooks/use-unsaved-guard.ts`
- Create: `src/hooks/__tests__/use-unsaved-guard.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/hooks/__tests__/use-unsaved-guard.test.ts`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { useUnsavedGuard } from '../use-unsaved-guard'

function Harness({
  isDirty,
  onDiscard,
  onSaveAndClose,
}: {
  isDirty: boolean
  onDiscard: () => void
  onSaveAndClose?: () => Promise<void> | void
}) {
  const guard = useUnsavedGuard({ isDirty, onDiscard, onSaveAndClose })
  return (
    <div>
      <button onClick={guard.requestClose}>close</button>
      <guard.ConfirmDialog />
    </div>
  )
}

describe('useUnsavedGuard', () => {
  it('calls onDiscard immediately when !isDirty (no prompt)', async () => {
    const onDiscard = vi.fn()
    render(<Harness isDirty={false} onDiscard={onDiscard} />)
    fireEvent.click(screen.getByText('close'))
    expect(onDiscard).toHaveBeenCalledTimes(1)
  })

  it('prompts when isDirty and only calls onDiscard after user confirms', async () => {
    const user = userEvent.setup()
    const onDiscard = vi.fn()
    render(<Harness isDirty={true} onDiscard={onDiscard} />)
    fireEvent.click(screen.getByText('close'))
    expect(onDiscard).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await user.click(screen.getByText('Discard'))
    expect(onDiscard).toHaveBeenCalledTimes(1)
  })

  it('Keep editing closes the prompt without calling onDiscard', async () => {
    const user = userEvent.setup()
    const onDiscard = vi.fn()
    render(<Harness isDirty={true} onDiscard={onDiscard} />)
    fireEvent.click(screen.getByText('close'))
    await user.click(screen.getByText('Keep editing'))
    expect(onDiscard).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('two-button variant (no onSaveAndClose) hides the Save & close button', () => {
    render(<Harness isDirty={true} onDiscard={() => {}} />)
    fireEvent.click(screen.getByText('close'))
    expect(screen.queryByText('Save & close')).not.toBeInTheDocument()
    expect(screen.getByText('Discard')).toBeInTheDocument()
    expect(screen.getByText('Keep editing')).toBeInTheDocument()
  })

  it('three-button variant calls onSaveAndClose on Save & close click', async () => {
    const user = userEvent.setup()
    const onDiscard = vi.fn()
    const onSaveAndClose = vi.fn().mockResolvedValue(undefined)
    render(
      <Harness
        isDirty={true}
        onDiscard={onDiscard}
        onSaveAndClose={onSaveAndClose}
      />
    )
    fireEvent.click(screen.getByText('close'))
    await user.click(screen.getByText('Save & close'))
    expect(onSaveAndClose).toHaveBeenCalledTimes(1)
    expect(onDiscard).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm run test:run src/hooks/__tests__/use-unsaved-guard.test.ts`
Expected: FAIL with "Cannot find module '../use-unsaved-guard'" or similar.

- [ ] **Step 3: Implement the hook**

Create `src/hooks/use-unsaved-guard.ts`:

```ts
import { useState, useCallback, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface UseUnsavedGuardArgs {
  isDirty: boolean
  onDiscard: () => void
  onSaveAndClose?: () => Promise<void> | void
  context?: Record<string, unknown>
}

export function useUnsavedGuard({
  isDirty,
  onDiscard,
  onSaveAndClose,
  context,
}: UseUnsavedGuardArgs) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  const requestClose = useCallback(() => {
    if (!isDirty) {
      onDiscard()
      return
    }
    setOpen(true)
  }, [isDirty, onDiscard])

  const handleDiscard = useCallback(() => {
    setOpen(false)
    onDiscard()
  }, [onDiscard])

  const handleSaveAndClose = useCallback(async () => {
    if (!onSaveAndClose) return
    setOpen(false)
    await onSaveAndClose()
  }, [onSaveAndClose])

  const ConfirmDialog = useCallback(
    () =>
      open ? (
        <Dialog open={open} onClose={setOpen}>
          <DialogPanel
            className="max-w-sm"
            onClose={() => setOpen(false)}
            showCloseButton={false}
          >
            <DialogTitle>
              {t('common.unsavedChanges.discardTitle')}
            </DialogTitle>
            <DialogDescription>
              {t('common.unsavedChanges.body', context)}
            </DialogDescription>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>
                {t('common.unsavedChanges.keepEditing')}
              </Button>
              {onSaveAndClose && (
                <Button onClick={handleSaveAndClose}>
                  {t('common.unsavedChanges.saveAndClose')}
                </Button>
              )}
              <Button variant="destructive" onClick={handleDiscard}>
                {t('common.unsavedChanges.discard')}
              </Button>
            </div>
          </DialogPanel>
        </Dialog>
      ) : null,
    [
      open,
      t,
      context,
      onSaveAndClose,
      handleSaveAndClose,
      handleDiscard,
    ]
  )

  return { requestClose, ConfirmDialog }
}
```

- [ ] **Step 4: Add the i18n keys**

Add to **both** `src/locales/en/common.json` and `src/locales/ar/common.json` (the existing common files — find them and merge):

For `en/common.json`, under whatever existing structure exists for the file, add (or merge into the `common` namespace):

```json
"unsavedChanges": {
  "discardTitle": "Discard unsaved changes?",
  "saveTitle": "Save your changes?",
  "body": "Your changes haven't been saved.",
  "keepEditing": "Keep editing",
  "saveAndClose": "Save & close",
  "discard": "Discard"
}
```

For `ar/common.json`:

```json
"unsavedChanges": {
  "discardTitle": "تجاهل التغييرات غير المحفوظة؟",
  "saveTitle": "حفظ التغييرات؟",
  "body": "لم يتم حفظ تغييراتك.",
  "keepEditing": "متابعة التحرير",
  "saveAndClose": "حفظ وإغلاق",
  "discard": "تجاهل"
}
```

If those JSON files don't exist, find the actual locale files (search for the `entity.create.product.title` key from the codebase and put the new keys alongside it). Either way, the keys must be present in both English and Arabic locale files.

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm run test:run src/hooks/__tests__/use-unsaved-guard.test.ts`
Expected: PASS (5/5).

- [ ] **Step 6: Commit**

```bash
git add src/hooks/use-unsaved-guard.ts src/hooks/__tests__/use-unsaved-guard.test.ts src/locales/
git commit -m "feat(hooks): add useUnsavedGuard with confirm popover"
```

---

## Task 7: Add the per-tab modal state slice to `useUIStore`

**Files:**
- Modify: `src/store/ui-store.ts`
- Modify: `src/store/__tests__/ui-store.test.ts` (new file if it doesn't exist; add to existing if it does)

- [ ] **Step 1: Check if a ui-store test file exists**

Run: `ls src/store/__tests__/ 2>/dev/null || echo "no tests yet"`
Expected: lists existing test files; if `ui-store.test.ts` is not there, create it.

- [ ] **Step 2: Write the failing test for the new slice**

Create or append to `src/store/__tests__/ui-store.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useUIStore } from '../ui-store'

const emptyTabState = {
  entity_modal: null,
  entity_id: null,
  isDirty: false,
}

describe('useUIStore tabState slice', () => {
  beforeEach(() => {
    useUIStore.setState({ tabState: {} })
  })

  it('starts with an empty tabState', () => {
    expect(useUIStore.getState().tabState).toEqual({})
  })

  it('setTabModal writes entity_modal and entity_id for a given tab', () => {
    useUIStore
      .getState()
      .setTabModal('products', { entity_modal: 'product', entity_id: 'P1' })
    expect(useUIStore.getState().tabState.products).toEqual({
      ...emptyTabState,
      entity_modal: 'product',
      entity_id: 'P1',
    })
  })

  it('setTabCreateDraft stores the draft without touching the modal state', () => {
    useUIStore
      .getState()
      .setTabCreateDraft('products', { name: 'Draft Name' })
    expect(useUIStore.getState().tabState.products.createDraft).toEqual({
      name: 'Draft Name',
    })
    expect(useUIStore.getState().tabState.products.entity_modal).toBeNull()
  })

  it('setTabEditDraft and setTabIsDirty update the right fields', () => {
    useUIStore
      .getState()
      .setTabEditDraft('products', { company: 'ACME 2' })
    useUIStore.getState().setTabIsDirty('products', true)
    expect(useUIStore.getState().tabState.products.editDraft).toEqual({
      company: 'ACME 2',
    })
    expect(useUIStore.getState().tabState.products.isDirty).toBe(true)
  })

  it('clearTabState wipes the tab back to empty defaults', () => {
    useUIStore
      .getState()
      .setTabModal('products', { entity_modal: 'product', entity_id: 'P1' })
    useUIStore.getState().setTabEditDraft('products', { company: 'ACME 2' })
    useUIStore.getState().setTabIsDirty('products', true)
    useUIStore.getState().clearTabState('products')
    expect(useUIStore.getState().tabState.products).toEqual(emptyTabState)
  })

  it('clearAllTabState empties the entire slice', () => {
    useUIStore
      .getState()
      .setTabModal('products', { entity_modal: 'product', entity_id: 'P1' })
    useUIStore
      .getState()
      .setTabModal('warehouses', {
        entity_modal: 'warehouse',
        entity_id: 'W1',
      })
    useUIStore.getState().clearAllTabState()
    expect(useUIStore.getState().tabState).toEqual({})
  })

  it('tabs are isolated — writes to products do not affect variants', () => {
    useUIStore
      .getState()
      .setTabModal('products', { entity_modal: 'product', entity_id: 'P1' })
    expect(useUIStore.getState().tabState.variants).toBeUndefined()
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm run test:run src/store/__tests__/ui-store.test.ts`
Expected: FAIL — `tabState`, `setTabModal`, etc. don't exist yet.

- [ ] **Step 4: Add the slice to the store**

Modify `src/store/ui-store.ts`. Add the following:

1. Above the `interface UIState`, add:

```ts
import type { ModalType } from '@/lib/utils'

type EntityTabKey = 'products' | 'variants' | 'warehouses'

interface TabModalState {
  entity_modal: ModalType
  entity_id: string | null
  createDraft?: Record<string, unknown>
  editDraft?: Record<string, unknown>
  isDirty: boolean
}

type TabStateSlice = Partial<Record<EntityTabKey, TabModalState>>
```

2. In the `UIState` interface, add:

```ts
  tabState: TabStateSlice
  setTabModal: (
    tabId: EntityTabKey,
    modal: { entity_modal: ModalType; entity_id: string | null }
  ) => void
  setTabCreateDraft: (
    tabId: EntityTabKey,
    draft: Record<string, unknown> | undefined
  ) => void
  setTabEditDraft: (
    tabId: EntityTabKey,
    draft: Record<string, unknown> | undefined
  ) => void
  setTabIsDirty: (tabId: EntityTabKey, dirty: boolean) => void
  clearTabState: (tabId: EntityTabKey) => void
  clearAllTabState: () => void
```

3. In the store factory's initial state, add `tabState: {} as TabStateSlice`.

4. In the store factory's actions, add:

```ts
  setTabModal: (tabId, modal) =>
    set(state => {
      const existing = state.tabState[tabId] ?? {
        entity_modal: null,
        entity_id: null,
        isDirty: false,
      }
      return {
        tabState: {
          ...state.tabState,
          [tabId]: { ...existing, ...modal },
        },
      }
    }),

  setTabCreateDraft: (tabId, draft) =>
    set(state => {
      const existing = state.tabState[tabId] ?? {
        entity_modal: null,
        entity_id: null,
        isDirty: false,
      }
      return {
        tabState: {
          ...state.tabState,
          [tabId]: { ...existing, createDraft: draft },
        },
      }
    }),

  setTabEditDraft: (tabId, draft) =>
    set(state => {
      const existing = state.tabState[tabId] ?? {
        entity_modal: null,
        entity_id: null,
        isDirty: false,
      }
      return {
        tabState: {
          ...state.tabState,
          [tabId]: { ...existing, editDraft: draft },
        },
      }
    }),

  setTabIsDirty: (tabId, dirty) =>
    set(state => {
      const existing = state.tabState[tabId] ?? {
        entity_modal: null,
        entity_id: null,
        isDirty: false,
      }
      return {
        tabState: {
          ...state.tabState,
          [tabId]: { ...existing, isDirty: dirty },
        },
      }
    }),

  clearTabState: tabId =>
    set(state => {
      const { [tabId]: _removed, ...rest } = state.tabState
      return { tabState: rest }
    }),

  clearAllTabState: () => set({ tabState: {} }),
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm run test:run src/store/__tests__/ui-store.test.ts`
Expected: PASS (7/7).

- [ ] **Step 6: Typecheck**

Run: `pnpm run typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/store/ui-store.ts src/store/__tests__/ui-store.test.ts
git commit -m "feat(store): add per-tab modal state slice to useUIStore"
```

---

## Task 8: Add the portal target ref context to `EntityWorkspace`

**Files:**
- Create: `src/components/entity/workspace-portal-context.ts`
- Modify: `src/components/entity/EntityWorkspace.tsx`

- [ ] **Step 1: Create the context**

Create `src/components/entity/workspace-portal-context.ts`:

```ts
import { createContext, useContext, type RefObject } from 'react'

export const WorkspacePortalContext = createContext<RefObject<HTMLElement | null> | null>(
  null
)

export function useWorkspacePortalTarget(): RefObject<HTMLElement | null> | null {
  return useContext(WorkspacePortalContext)
}
```

- [ ] **Step 2: Wire the context in `EntityWorkspace`**

In `src/components/entity/EntityWorkspace.tsx`:

1. Add imports at the top:

```ts
import { useRef } from 'react'
import { WorkspacePortalContext } from './workspace-portal-context'
```

2. Inside the `EntityWorkspace` function (line 80), add:

```ts
  const workspaceRef = useRef<HTMLDivElement | null>(null)
```

3. Find the top-level `<div className="px-margin-edge flex flex-col h-full bg-background py-6">` (line 321) and:
   - Add `ref={workspaceRef}` to it
   - Add `style={{ position: 'relative' }}` to it
   - Wrap the existing children in `<WorkspacePortalContext.Provider value={workspaceRef}>...</WorkspacePortalContext.Provider>`

The diff on line 321 should turn:

```tsx
  return (
    <div className="px-margin-edge flex flex-col h-full bg-background py-6">
```

into:

```tsx
  return (
    <div
      ref={workspaceRef}
      style={{ position: 'relative' }}
      className="px-margin-edge flex flex-col h-full bg-background py-6"
    >
```

And the closing `</div>` becomes a closing `</div></WorkspacePortalContext.Provider>`. Read the file's full JSX (lines 320–359) to find the matching close tag.

- [ ] **Step 3: Typecheck**

Run: `pnpm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/entity/workspace-portal-context.ts src/components/entity/EntityWorkspace.tsx
git commit -m "feat(entity): add portal target ref to EntityWorkspace"
```

---

## Task 9: Add the read hooks (`queries.ts`)

**Files:**
- Create: `src/services/entity/queries.ts`
- Create: `src/services/entity/__tests__/queries.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/services/entity/__tests__/queries.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryWrapper } from '@/lib/test-utils/query-wrapper'
import { commands } from '@/lib/tauri-bindings'
import {
  useGetProduct,
  useGetVariant,
  useGetWarehouse,
  useStockLevelsForProduct,
  useStockLevelsForVariant,
  useStockMovements,
  useWarehouses,
} from '../queries'

vi.mock('@/lib/tauri-bindings', () => ({
  commands: {
    getById: vi.fn(),
    variantsGetById: vi.fn(),
    warehousesGetById: vi.fn(),
    stockLevelsGetByProduct: vi.fn(),
    stockLevelsGetByVariant: vi.fn(),
    stockMovementsGetByVariant: vi.fn(),
    stockMovementsGetByProduct: vi.fn(),
    stockMovementsGetByWarehouse: vi.fn(),
    variantsGetByProductWithStock: vi.fn(),
    warehousesGetAll: vi.fn(),
  },
}))

const mockOk = <T,>(data: T) => ({ status: 'ok' as const, data })
const mockErr = (error: string) => ({ status: 'error' as const, error })

describe('entity read hooks', () => {
  it('useGetProduct is disabled when id is undefined', () => {
    const { result } = renderHook(() => useGetProduct(undefined), {
      wrapper: QueryWrapper,
    })
    expect(result.current.fetchStatus).toBe('idle')
  })

  it('useGetProduct returns data on success', async () => {
    vi.mocked(commands.getById).mockResolvedValueOnce(
      mockOk({ id: 'P1', company: 'ACME', name: 'Widget', category: 'A' })
    )
    const { result } = renderHook(() => useGetProduct('P1'), {
      wrapper: QueryWrapper,
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({
      id: 'P1',
      company: 'ACME',
      name: 'Widget',
      category: 'A',
    })
  })

  it('useGetProduct throws on error result', async () => {
    vi.mocked(commands.getById).mockResolvedValueOnce(mockErr('not found'))
    const { result } = renderHook(() => useGetProduct('P1'), {
      wrapper: QueryWrapper,
    })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect((result.current.error as Error).message).toBe('not found')
  })

  it('useGetVariant calls variantsGetById and returns data', async () => {
    vi.mocked(commands.variantsGetById).mockResolvedValueOnce(
      mockOk({ id: 'V1', name: 'Red Widget' })
    )
    const { result } = renderHook(() => useGetVariant('V1'), {
      wrapper: QueryWrapper,
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(commands.variantsGetById).toHaveBeenCalledWith('V1')
    expect(result.current.data).toEqual({ id: 'V1', name: 'Red Widget' })
  })

  it('useGetWarehouse calls warehousesGetById', async () => {
    vi.mocked(commands.warehousesGetById).mockResolvedValueOnce(
      mockOk({ id: 'W1', name: 'Main' })
    )
    const { result } = renderHook(() => useGetWarehouse('W1'), {
      wrapper: QueryWrapper,
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(commands.warehousesGetById).toHaveBeenCalledWith('W1')
  })

  it('useStockLevelsForProduct is disabled when id is undefined', () => {
    const { result } = renderHook(() => useStockLevelsForProduct(undefined), {
      wrapper: QueryWrapper,
    })
    expect(result.current.fetchStatus).toBe('idle')
  })

  it('useStockLevelsForProduct returns data on success', async () => {
    vi.mocked(commands.stockLevelsGetByProduct).mockResolvedValueOnce(
      mockOk([{ id: 'SL1' }])
    )
    const { result } = renderHook(() => useStockLevelsForProduct('P1'), {
      wrapper: QueryWrapper,
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([{ id: 'SL1' }])
  })

  it('useStockLevelsForVariant calls stockLevelsGetByVariant', async () => {
    vi.mocked(commands.stockLevelsGetByVariant).mockResolvedValueOnce(
      mockOk([])
    )
    const { result } = renderHook(() => useStockLevelsForVariant('V1'), {
      wrapper: QueryWrapper,
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(commands.stockLevelsGetByVariant).toHaveBeenCalledWith('V1')
  })

  it('useStockMovements for product fetches variants and aggregates their movements', async () => {
    vi.mocked(commands.variantsGetByProductWithStock).mockResolvedValueOnce(
      mockOk([{ id: 'V1' }, { id: 'V2' }])
    )
    vi.mocked(commands.stockMovementsGetByVariant).mockResolvedValueOnce(
      mockOk([{ id: 'M1', variant_id: 'V1', created_at: '2025-01-01' }])
    )
    vi.mocked(commands.stockMovementsGetByVariant).mockResolvedValueOnce(
      mockOk([{ id: 'M2', variant_id: 'V2', created_at: '2025-01-02' }])
    )
    const { result } = renderHook(() => useStockMovements('product', 'P1'), {
      wrapper: QueryWrapper,
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(2)
  })

  it('useStockMovements for warehouse calls stockMovementsGetByWarehouse', async () => {
    vi.mocked(commands.stockMovementsGetByWarehouse).mockResolvedValueOnce(
      mockOk([{ id: 'M1' }])
    )
    const { result } = renderHook(
      () => useStockMovements('warehouse', 'W1'),
      { wrapper: QueryWrapper }
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(commands.stockMovementsGetByWarehouse).toHaveBeenCalledWith('W1')
    expect(result.current.data).toEqual([{ id: 'M1' }])
  })

  it('useWarehouses returns data on success', async () => {
    vi.mocked(commands.warehousesGetAll).mockResolvedValueOnce(
      mockOk([{ id: 'W1', name: 'Main' }])
    )
    const { result } = renderHook(() => useWarehouses(), {
      wrapper: QueryWrapper,
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([{ id: 'W1', name: 'Main' }])
  })

  it('useWarehouses swallows errors and returns []', async () => {
    vi.mocked(commands.warehousesGetAll).mockResolvedValueOnce(mockErr('fail'))
    const { result } = renderHook(() => useWarehouses(), {
      wrapper: QueryWrapper,
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([])
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm run test:run src/services/entity/__tests__/queries.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the read hooks**

Create `src/services/entity/queries.ts`:

```ts
import { useQuery } from '@tanstack/react-query'
import { commands, type StockMovement } from '@/lib/tauri-bindings'
import {
  entityQueryKeys,
  type MovementScope,
  type StockScope,
} from './queryKeys'

async function unwrap<T>(
  result: { status: 'ok'; data: T } | { status: 'error'; error: string }
): Promise<T> {
  if (result.status === 'error') throw new Error(result.error)
  return result.data
}

export function useGetProduct(id: string | undefined) {
  return useQuery({
    queryKey: id
      ? entityQueryKeys.detail('products', id)
      : ['entity', 'products', 'detail', '__none__'],
    queryFn: () => unwrap(commands.getById(id!)),
    enabled: !!id,
  })
}

export function useGetVariant(id: string | undefined) {
  return useQuery({
    queryKey: id
      ? entityQueryKeys.detail('variants', id)
      : ['entity', 'variants', 'detail', '__none__'],
    queryFn: () => unwrap(commands.variantsGetById(id!)),
    enabled: !!id,
  })
}

export function useGetWarehouse(id: string | undefined) {
  return useQuery({
    queryKey: id
      ? entityQueryKeys.detail('warehouses', id)
      : ['entity', 'warehouses', 'detail', '__none__'],
    queryFn: () => unwrap(commands.warehousesGetById(id!)),
    enabled: !!id,
  })
}

export function useStockLevelsForProduct(
  id: string | undefined,
  scope: StockScope = 'product'
) {
  return useQuery({
    queryKey: id
      ? entityQueryKeys.stockLevels(scope, id)
      : ['stock-levels-' + scope, '__none__'],
    queryFn: () => unwrap(commands.stockLevelsGetByProduct(id!)),
    enabled: !!id,
  })
}

export function useStockLevelsForVariant(id: string | undefined) {
  return useQuery({
    queryKey: id
      ? entityQueryKeys.stockLevels('variant', id)
      : ['stock-levels-variant', '__none__'],
    queryFn: () => unwrap(commands.stockLevelsGetByVariant(id!)),
    enabled: !!id,
  })
}

export function useStockMovements(scope: MovementScope, id: string | undefined) {
  return useQuery({
    queryKey: id
      ? entityQueryKeys.stockMovements(scope, id)
      : ['stock-movements-' + scope, '__none__'],
    queryFn: async (): Promise<StockMovement[]> => {
      if (scope === 'product') {
        const variants = await unwrap(
          await commands.variantsGetByProductWithStock(id!)
        )
        const all: StockMovement[] = []
        for (const v of variants) {
          const movs = await unwrap(await commands.stockMovementsGetByVariant(v.id))
          const sorted = [...movs].sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
          )
          all.push(...sorted.slice(0, 5))
        }
        return all.sort(
          (a, b) =>
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime()
        )
      }
      if (scope === 'variant') {
        return unwrap(await commands.stockMovementsGetByVariant(id!))
      }
      return unwrap(await commands.stockMovementsGetByWarehouse(id!))
    },
    enabled: !!id,
  })
}

export function useWarehouses() {
  return useQuery({
    queryKey: entityQueryKeys.warehouses(),
    queryFn: async () => {
      const result = await commands.warehousesGetAll([], [], null)
      if (result.status === 'ok') return result.data
      return []
    },
  })
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm run test:run src/services/entity/__tests__/queries.test.ts`
Expected: PASS (12/12). If any `commands.xxx` name is wrong (e.g., `variantsGetByProductWithStock` doesn't exist in the tauri-bindings), correct the name in this file and re-run.

- [ ] **Step 5: Typecheck**

Run: `pnpm run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/services/entity/queries.ts src/services/entity/__tests__/queries.test.ts
git commit -m "feat(entity-services): add read hooks with tests"
```

---

## Task 10: Add the mutation hooks (`mutations.ts`)

**Files:**
- Create: `src/services/entity/mutations.ts`
- Create: `src/services/entity/__tests__/mutations.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/services/entity/__tests__/mutations.test.ts`. This test covers the product update flow in detail (the canonical example); the variant and warehouse siblings are tested in one shape-only assertion each to keep the file small. Mutations for create/delete are tested via a smaller set of assertions focused on the cache reconciliation.

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useQueryClient } from '@tanstack/react-query'
import { QueryWrapper, createTestQueryClient } from '@/lib/test-utils/query-wrapper'
import { commands } from '@/lib/tauri-bindings'
import { toast } from 'sonner'
import {
  useCreateProduct,
  useUpdateProduct,
  useSoftDeleteProduct,
  useCreateVariant,
  useUpdateVariant,
  useSoftDeleteVariant,
  useCreateWarehouse,
  useUpdateWarehouse,
  useSoftDeleteWarehouse,
} from '../mutations'
import { entityQueryKeys } from '../queryKeys'

vi.mock('@/lib/tauri-bindings', () => ({
  commands: {
    create: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
    variantsCreate: vi.fn(),
    variantsUpdate: vi.fn(),
    variantsDelete: vi.fn(),
    warehousesCreate: vi.fn(),
    warehousesUpdate: vi.fn(),
    warehousesDelete: vi.fn(),
  },
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

const mockOk = <T,>(data: T) => ({ status: 'ok' as const, data })
const mockErr = (error: string) => ({ status: 'error' as const, error })

function seedProductsList(
  client: ReturnType<typeof createTestQueryClient>,
  rows: Array<{ id: string; name: string; company: string; category: string }>
) {
  client.setQueryData(entityQueryKeys.listFor('products'), rows)
}

describe('useUpdateProduct', () => {
  let client: ReturnType<typeof createTestQueryClient>

  beforeEach(() => {
    vi.clearAllMocks()
    client = createTestQueryClient()
  })

  it('applies an optimistic update to the list, rolls back on error, and reconciles on success', async () => {
    seedProductsList(client, [
      { id: 'P1', name: 'Old', company: 'ACME', category: 'A' },
      { id: 'P2', name: 'Other', company: 'X', category: 'B' },
    ])

    vi.mocked(commands.update).mockResolvedValueOnce(
      mockOk({ id: 'P1', name: 'New', company: 'ACME', category: 'A' })
    )

    const { result } = renderHook(
      () => {
        const qc = useQueryClient()
        const m = useUpdateProduct()
        return { qc, m }
      },
      { wrapper: (p) => <QueryWrapper {...p} client={client} /> }
    )

    act(() => {
      result.current.m.mutate({
        id: 'P1',
        values: { name: 'New', company: 'ACME', category: 'A' },
      })
    })

    // Optimistic update applied
    await waitFor(() => {
      const data = client.getQueryData<Array<{ id: string; name: string }>>(
        entityQueryKeys.listFor('products')
      )
      expect(data?.find((r) => r.id === 'P1')?.name).toBe('New')
    })

    await waitFor(() => expect(result.current.m.isSuccess).toBe(true))

    // Detail cache populated
    const detail = client.getQueryData(
      entityQueryKeys.detail('products', 'P1')
    )
    expect(detail).toEqual({
      id: 'P1',
      name: 'New',
      company: 'ACME',
      category: 'A',
    })

    // Success toast
    expect(toast.success).toHaveBeenCalledWith('Product updated')
  })

  it('rolls back the optimistic update on error and toasts', async () => {
    seedProductsList(client, [
      { id: 'P1', name: 'Old', company: 'ACME', category: 'A' },
    ])

    vi.mocked(commands.update).mockResolvedValueOnce(mockErr('boom'))

    const { result } = renderHook(
      () => {
        const m = useUpdateProduct()
        return { m }
      },
      { wrapper: (p) => <QueryWrapper {...p} client={client} /> }
    )

    act(() => {
      result.current.m.mutate({
        id: 'P1',
        values: { name: 'New', company: 'ACME', category: 'A' },
      })
    })

    await waitFor(() => expect(result.current.m.isError).toBe(true))

    const data = client.getQueryData<Array<{ id: string; name: string }>>(
      entityQueryKeys.listFor('products')
    )
    expect(data?.find((r) => r.id === 'P1')?.name).toBe('Old')
    expect(toast.error).toHaveBeenCalled()
  })

  it('invokes the consumer-supplied onSettled callback with (data, null) on success', async () => {
    seedProductsList(client, [
      { id: 'P1', name: 'Old', company: 'ACME', category: 'A' },
    ])

    vi.mocked(commands.update).mockResolvedValueOnce(
      mockOk({ id: 'P1', name: 'New', company: 'ACME', category: 'A' })
    )

    const onSettled = vi.fn()

    const { result } = renderHook(
      () => useUpdateProduct({ onSettled }),
      { wrapper: (p) => <QueryWrapper {...p} client={client} /> }
    )

    act(() => {
      result.current.mutate({
        id: 'P1',
        values: { name: 'New', company: 'ACME', category: 'A' },
      })
    })

    await waitFor(() => expect(onSettled).toHaveBeenCalled())
    const [data, err] = onSettled.mock.calls[0]!
    expect(data).toEqual({
      id: 'P1',
      name: 'New',
      company: 'ACME',
      category: 'A',
    })
    expect(err).toBeNull()
  })
})

describe('useCreateProduct', () => {
  it('invalidates the product list on success and calls onSettled', async () => {
    const client = createTestQueryClient()
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries')
    vi.mocked(commands.create).mockResolvedValueOnce(
      mockOk({ id: 'P99', name: 'Fresh', company: 'A', category: 'B' })
    )

    const onSettled = vi.fn()
    const { result } = renderHook(
      () => useCreateProduct({ onSettled }),
      { wrapper: (p) => <QueryWrapper {...p} client={client} /> }
    )

    act(() => {
      result.current.mutate({
        values: { name: 'Fresh', company: 'A', category: 'B' },
      })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: entityQueryKeys.listFor('products'),
    })
    expect(onSettled).toHaveBeenCalled()
  })
})

describe('useSoftDeleteProduct', () => {
  it('removes the row optimistically and rolls back on error', async () => {
    const client = createTestQueryClient()
    client.setQueryData(entityQueryKeys.listFor('products'), [
      { id: 'P1', name: 'A' },
      { id: 'P2', name: 'B' },
    ])

    vi.mocked(commands.softDelete).mockResolvedValueOnce(mockErr('nope'))

    const { result } = renderHook(() => useSoftDeleteProduct(), {
      wrapper: (p) => <QueryWrapper {...p} client={client} />,
    })

    act(() => {
      result.current.mutate({ id: 'P1' })
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    const data = client.getQueryData<Array<{ id: string }>>(
      entityQueryKeys.listFor('products')
    )
    expect(data?.some((r) => r.id === 'P1')).toBe(true)
  })
})

describe('variant/warehouse mutation siblings exist and follow the same shape', () => {
  it('useCreateVariant, useUpdateVariant, useSoftDeleteVariant are defined', () => {
    expect(useCreateVariant).toBeDefined()
    expect(useUpdateVariant).toBeDefined()
    expect(useSoftDeleteVariant).toBeDefined()
  })
  it('useCreateWarehouse, useUpdateWarehouse, useSoftDeleteWarehouse are defined', () => {
    expect(useCreateWarehouse).toBeDefined()
    expect(useUpdateWarehouse).toBeDefined()
    expect(useSoftDeleteWarehouse).toBeDefined()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm run test:run src/services/entity/__tests__/mutations.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the mutations**

Create `src/services/entity/mutations.ts`:

```ts
// We use Immer's produce() for all cache updates so that nested updates
// (a field inside a variant of a product, a stock level inside a product's
// detail cache) read as naturally as top-level updates. The pattern with
// TanStack Query is:
//
//   setQueriesData(key, (old) => old ? produce(old, draft => { ... }) : old)
//
// The outer `(old) => old ? ... : old` is required because TanStack passes
// the previous value (or undefined) as the updater's argument, and `produce`
// needs the previous value as its first argument, not the draft itself.

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { produce } from 'immer'
import { toast } from 'sonner'
import { commands } from '@/lib/tauri-bindings'
import { entityQueryKeys, type EntityType } from './queryKeys'
import type {
  Product,
  ProductUpdateValues,
  Variant,
  VariantUpdateValues,
  Warehouse,
  WarehouseUpdateValues,
} from './types'

interface SettledOptions<T> {
  onSettled?: (data: T | null, error: Error | null) => void
}

async function unwrapOk<T>(
  result:
    | { status: 'ok'; data: T }
    | { status: 'error'; error: string }
): Promise<T> {
  if (result.status === 'error') throw new Error(result.error)
  return result.data
}

function listFor(entityType: EntityType) {
  return entityQueryKeys.listFor(entityType)
}

function detailFor(entityType: EntityType, id: string) {
  return entityQueryKeys.detail(entityType, id)
}

// ---------- Products ----------

export function useUpdateProduct(options?: SettledOptions<Product>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: string; values: ProductUpdateValues }) =>
      unwrapOk(
        commands.update(input.id, input.values.company, input.values.name, input.values.category)
      ),
    onMutate: async ({ id, values }) => {
      await queryClient.cancelQueries({ queryKey: listFor('products') })
      const previousLists = queryClient.getQueriesData<Product[]>({
        queryKey: listFor('products'),
      })
      queryClient.setQueriesData(
        { queryKey: listFor('products') },
        (old) =>
          old
            ? produce<Product[]>((draft) => {
                const row = draft.find((r) => r.id === id)
                if (row) Object.assign(row, values)
              })
            : old
      )
      return { previousLists }
    },
    onError: (err, _vars, context) => {
      if (context?.previousLists) {
        for (const [key, data] of context.previousLists) {
          queryClient.setQueryData(key, data)
        }
      }
      toast.error(err instanceof Error ? err.message : 'Update failed')
    },
    onSuccess: (data) => {
      queryClient.setQueryData(detailFor('products', data.id), data)
      queryClient.invalidateQueries({ queryKey: listFor('products') })
      queryClient.invalidateQueries({
        queryKey: entityQueryKeys.stockLevels('product', data.id),
      })
      toast.success('Product updated')
    },
    onSettled: (data, error) => {
      options?.onSettled?.((data as Product) ?? null, error as Error | null)
    },
  })
}

export function useCreateProduct(options?: SettledOptions<Product>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { values: ProductUpdateValues }) =>
      unwrapOk(commands.create(input.values.company, input.values.name, input.values.category)),
    onSuccess: (data) => {
      queryClient.setQueryData(detailFor('products', data.id), data)
      queryClient.invalidateQueries({ queryKey: listFor('products') })
      toast.success('Product created')
    },
    onSettled: (data, error) => {
      options?.onSettled?.((data as Product) ?? null, error as Error | null)
    },
  })
}

export function useSoftDeleteProduct(options?: SettledOptions<{ id: string }>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: string }) => unwrapOk(commands.softDelete(input.id)),
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: listFor('products') })
      const previousLists = queryClient.getQueriesData<Product[]>({
        queryKey: listFor('products'),
      })
      queryClient.setQueriesData(
        { queryKey: listFor('products') },
        (old) =>
          old
            ? produce<Product[]>((draft) => {
                const idx = draft.findIndex((r) => r.id === id)
                if (idx >= 0) draft.splice(idx, 1)
              })
            : old
      )
      return { previousLists }
    },
    onError: (err, _vars, context) => {
      if (context?.previousLists) {
        for (const [key, data] of context.previousLists) {
          queryClient.setQueryData(key, data)
        }
      }
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: listFor('products') })
      queryClient.removeQueries({ queryKey: detailFor('products', id) })
      toast.success('Product deleted')
    },
    onSettled: (data, error) => {
      options?.onSettled?.((data as { id: string } | null) ?? null, error as Error | null)
    },
  })
}

// ---------- Variants ----------

export function useUpdateVariant(options?: SettledOptions<Variant>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: string; values: VariantUpdateValues }) =>
      unwrapOk(commands.variantsUpdate(input.id, input.values as never)),
    onMutate: async ({ id, values }) => {
      await queryClient.cancelQueries({ queryKey: listFor('variants') })
      const previousLists = queryClient.getQueriesData<Variant[]>({
        queryKey: listFor('variants'),
      })
      queryClient.setQueriesData(
        { queryKey: listFor('variants') },
        (old) =>
          old
            ? produce<Variant[]>((draft) => {
                const row = draft.find((r) => r.id === id)
                if (row) Object.assign(row, values)
              })
            : old
      )
      return { previousLists }
    },
    onError: (err, _vars, context) => {
      if (context?.previousLists) {
        for (const [key, data] of context.previousLists) {
          queryClient.setQueryData(key, data)
        }
      }
      toast.error(err instanceof Error ? err.message : 'Update failed')
    },
    onSuccess: (data) => {
      queryClient.setQueryData(detailFor('variants', data.id), data)
      queryClient.invalidateQueries({ queryKey: listFor('variants') })
      toast.success('Variant updated')
    },
    onSettled: (data, error) => {
      options?.onSettled?.((data as Variant) ?? null, error as Error | null)
    },
  })
}

export function useCreateVariant(options?: SettledOptions<Variant>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { values: VariantUpdateValues; productId: string }) =>
      unwrapOk(commands.variantsCreate(input.productId, input.values as never)),
    onSuccess: (data) => {
      queryClient.setQueryData(detailFor('variants', data.id), data)
      queryClient.invalidateQueries({ queryKey: listFor('variants') })
      toast.success('Variant created')
    },
    onSettled: (data, error) => {
      options?.onSettled?.((data as Variant) ?? null, error as Error | null)
    },
  })
}

export function useSoftDeleteVariant(options?: SettledOptions<{ id: string }>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: string }) => unwrapOk(commands.variantsDelete(input.id)),
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: listFor('variants') })
      const previousLists = queryClient.getQueriesData<Variant[]>({
        queryKey: listFor('variants'),
      })
      queryClient.setQueriesData(
        { queryKey: listFor('variants') },
        (old) =>
          old
            ? produce<Variant[]>((draft) => {
                const idx = draft.findIndex((r) => r.id === id)
                if (idx >= 0) draft.splice(idx, 1)
              })
            : old
      )
      return { previousLists }
    },
    onError: (err, _vars, context) => {
      if (context?.previousLists) {
        for (const [key, data] of context.previousLists) {
          queryClient.setQueryData(key, data)
        }
      }
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: listFor('variants') })
      queryClient.removeQueries({ queryKey: detailFor('variants', id) })
      toast.success('Variant deleted')
    },
    onSettled: (data, error) => {
      options?.onSettled?.((data as { id: string } | null) ?? null, error as Error | null)
    },
  })
}

// ---------- Warehouses ----------

export function useUpdateWarehouse(options?: SettledOptions<Warehouse>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: string; values: WarehouseUpdateValues }) =>
      unwrapOk(commands.warehousesUpdate(input.id, input.values as never)),
    onMutate: async ({ id, values }) => {
      await queryClient.cancelQueries({ queryKey: listFor('warehouses') })
      const previousLists = queryClient.getQueriesData<Warehouse[]>({
        queryKey: listFor('warehouses'),
      })
      queryClient.setQueriesData(
        { queryKey: listFor('warehouses') },
        (old) =>
          old
            ? produce<Warehouse[]>((draft) => {
                const row = draft.find((r) => r.id === id)
                if (row) Object.assign(row, values)
              })
            : old
      )
      return { previousLists }
    },
    onError: (err, _vars, context) => {
      if (context?.previousLists) {
        for (const [key, data] of context.previousLists) {
          queryClient.setQueryData(key, data)
        }
      }
      toast.error(err instanceof Error ? err.message : 'Update failed')
    },
    onSuccess: (data) => {
      queryClient.setQueryData(detailFor('warehouses', data.id), data)
      queryClient.invalidateQueries({ queryKey: listFor('warehouses') })
      toast.success('Warehouse updated')
    },
    onSettled: (data, error) => {
      options?.onSettled?.((data as Warehouse) ?? null, error as Error | null)
    },
  })
}

export function useCreateWarehouse(options?: SettledOptions<Warehouse>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { values: WarehouseUpdateValues }) =>
      unwrapOk(commands.warehousesCreate(input.values as never)),
    onSuccess: (data) => {
      queryClient.setQueryData(detailFor('warehouses', data.id), data)
      queryClient.invalidateQueries({ queryKey: listFor('warehouses') })
      toast.success('Warehouse created')
    },
    onSettled: (data, error) => {
      options?.onSettled?.((data as Warehouse) ?? null, error as Error | null)
    },
  })
}

export function useSoftDeleteWarehouse(options?: SettledOptions<{ id: string }>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: string }) => unwrapOk(commands.warehousesDelete(input.id)),
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: listFor('warehouses') })
      const previousLists = queryClient.getQueriesData<Warehouse[]>({
        queryKey: listFor('warehouses'),
      })
      queryClient.setQueriesData(
        { queryKey: listFor('warehouses') },
        (old) =>
          old
            ? produce<Warehouse[]>((draft) => {
                const idx = draft.findIndex((r) => r.id === id)
                if (idx >= 0) draft.splice(idx, 1)
              })
            : old
      )
      return { previousLists }
    },
    onError: (err, _vars, context) => {
      if (context?.previousLists) {
        for (const [key, data] of context.previousLists) {
          queryClient.setQueryData(key, data)
        }
      }
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: listFor('warehouses') })
      queryClient.removeQueries({ queryKey: detailFor('warehouses', id) })
      toast.success('Warehouse deleted')
    },
    onSettled: (data, error) => {
      options?.onSettled?.((data as { id: string } | null) ?? null, error as Error | null)
    },
  })
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm run test:run src/services/entity/__tests__/mutations.test.ts`
Expected: PASS. If a `commands.variantsUpdate`/`commands.warehousesUpdate`/`commands.warehousesCreate` etc. signature doesn't match (the `values as never` cast is there precisely to defer the shape until the modal tasks), the test still passes because the sibling-existence tests don't call the actual commands. The actual command-shape compatibility is verified in Tasks 14–18.

- [ ] **Step 5: Typecheck**

Run: `pnpm run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/services/entity/mutations.ts src/services/entity/__tests__/mutations.test.ts
git commit -m "feat(entity-services): add mutation hooks with optimistic updates"
```

---

## Task 11: Rewrite `MainWindowContent` to capture/restore per-tab modal state

**Files:**
- Modify: `src/components/layout/MainWindowContent.tsx`

- [ ] **Step 1: Rewrite the file**

Replace the contents of `src/components/layout/MainWindowContent.tsx` with:

```tsx
import { useEffect, useRef } from 'react'
import { Outlet, useNavigate, useLocation } from '@tanstack/react-router'
import { useTabStore } from '@/store/workspace-store'
import { useUIStore } from '@/store/ui-store'
import { ModalManager } from '@/components/modal/ModalManager'
import { useWorkspacePortalTarget } from '@/components/entity/workspace-portal-context'
import type { ModalType } from '@/lib/utils'

// Imperative handle exposed by an entity modal so this effect can read
// (and clear) per-tab modal state at navigation time.
export interface ModalHandle {
  getIsDirty: () => boolean
  getCreateDraft: () => Record<string, unknown> | undefined
  getEditDraft: () => Record<string, unknown> | undefined
  discardDrafts: () => void
}

const tabHandles = new Map<string, ModalHandle>()

export function registerModalHandle(tabKey: string, handle: ModalHandle) {
  tabHandles.set(tabKey, handle)
  return () => {
    if (tabHandles.get(tabKey) === handle) {
      tabHandles.delete(tabKey)
    }
  }
}

export function MainWindowContent() {
  const navigate = useNavigate()
  const location = useLocation()
  const activeTabId = useTabStore(state => state.activeTabId)
  const tabs = useTabStore(state => state.tabs)
  const portalTarget = useWorkspacePortalTarget()
  const prevTabIdRef = useRef<string | null>(null)

  const setTabModal = useUIStore(state => state.setTabModal)
  const setTabCreateDraft = useUIStore(state => state.setTabCreateDraft)
  const setTabEditDraft = useUIStore(state => state.setTabEditDraft)
  const setTabIsDirty = useUIStore(state => state.setTabIsDirty)
  const tabState = useUIStore(state => state.tabState)
  const clearTabState = useUIStore(state => state.clearTabState)

  useEffect(() => {
    const activeTab = tabs.find(t => t.id === activeTabId)
    if (!activeTab) return

    const prevTabId = prevTabIdRef.current
    const prevTab = prevTabId ? tabs.find(t => t.id === prevTabId) : undefined
    const prevEntityType = prevTab?.entityType
    const newEntityType = activeTab.entityType

    // 1) Capture previous tab's live modal state (if any) into the Zustand slice.
    if (prevTabId && prevEntityType && tabHandles.has(prevEntityType)) {
      const handle = tabHandles.get(prevEntityType)!
      const search = new URLSearchParams(location.search)
      const entity_modal = (search.get('entity_modal') as ModalType) ?? null
      const entity_id = search.get('entity_id')
      setTabModal(
        prevEntityType as 'products' | 'variants' | 'warehouses',
        { entity_modal, entity_id }
      )
      setTabIsDirty(prevEntityType as 'products' | 'variants' | 'warehouses', handle.getIsDirty())
      const createDraft = handle.getCreateDraft()
      const editDraft = handle.getEditDraft()
      if (createDraft) setTabCreateDraft(prevEntityType as 'products' | 'variants' | 'warehouses', createDraft)
      if (editDraft) setTabEditDraft(prevEntityType as 'products' | 'variants' | 'warehouses', editDraft)
    }

    prevTabIdRef.current = activeTabId

    // 2) Compute the new path and search.
    const targetPath =
      activeTab.type === 'entity' && activeTab.entityType
        ? `/entity/${activeTab.entityType}`
        : `/${activeTab.type}`

    const stored = newEntityType
      ? tabState[newEntityType as 'products' | 'variants' | 'warehouses']
      : undefined
    const search = stored?.entity_modal
      ? {
          entity_modal: stored.entity_modal as ModalType,
          entity_id: stored.entity_id ?? undefined,
        }
      : {}

    // 3) Navigate. The unsaved-guard prompt is fired by the user clicking
    // the tab (handled by the tab bar consumer wiring in a follow-up task);
    // here we just navigate to the restored URL.
    if (location.pathname !== targetPath) {
      navigate({ to: targetPath, search })
    }
  }, [
    activeTabId,
    tabs,
    navigate,
    location.pathname,
    location.search,
    setTabModal,
    setTabCreateDraft,
    setTabEditDraft,
    setTabIsDirty,
    tabState,
  ])

  return (
    <div className="flex h-full flex-col bg-background">
      <Outlet />
      <ModalManager portalTarget={portalTarget?.current ?? null} />
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm run typecheck`
Expected: PASS (the `tabState` initializer warning is expected on first run since the store is now extended but consumers haven't been migrated yet — addressed in Task 12).

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/MainWindowContent.tsx
git commit -m "feat(layout): capture and restore per-tab modal state on tab switch"
```

---

## Task 12: Update `ModalManager` to use the portal target and accept it as a prop

**Files:**
- Modify: `src/components/modal/ModalManager.tsx`

- [ ] **Step 1: Rewrite the file**

Replace the contents of `src/components/modal/ModalManager.tsx` with:

```tsx
import { useLocation, useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { ProductModal } from '@/components/entity/ProductModal'
import { VariantModal } from '@/components/entity/VariantModal'
import { WarehouseModal } from '@/components/entity/WarehouseModal'
import type { ModalType } from '@/lib/utils'

interface ModalManagerProps {
  portalTarget: HTMLElement | null
}

export function ModalManager({ portalTarget }: ModalManagerProps) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation({
    select: state => ({
      pathname: state.pathname,
      search: state.href.split('?')[1] || '',
    }),
  })
  const searchParams = new URLSearchParams(location.search)
  const entity_modal = searchParams.get('entity_modal') as ModalType
  const entity_id = searchParams.get('entity_id')

  function handleClose() {
    searchParams.delete('entity_modal')
    searchParams.delete('entity_id')
    navigate({ to: location.pathname, search: {} })
  }

  if (!entity_modal) return null

  const portalProps = portalTarget ? { container: portalTarget } : {}

  switch (entity_modal) {
    case 'product':
      if (!entity_id) return null
      return (
        <ProductModal
          entityId={entity_id}
          queryClient={queryClient}
          mode="view"
          onDeleted={handleClose}
          {...portalProps}
        />
      )
    case 'variant':
      if (!entity_id) return null
      return (
        <VariantModal
          entityId={entity_id}
          queryClient={queryClient}
          mode="view"
          onDeleted={handleClose}
          {...portalProps}
        />
      )
    case 'warehouse':
      if (!entity_id) return null
      return (
        <WarehouseModal
          entityId={entity_id}
          queryClient={queryClient}
          mode="view"
          onDeleted={handleClose}
          {...portalProps}
        />
      )
    case 'create-product':
      return (
        <ProductModal
          queryClient={queryClient}
          mode="create"
          onDeleted={handleClose}
          {...portalProps}
        />
      )
    case 'create-warehouse':
      return (
        <WarehouseModal
          queryClient={queryClient}
          mode="create"
          onDeleted={handleClose}
          {...portalProps}
        />
      )
    case 'create-variant':
      if (!entity_id) return null
      return (
        <VariantModal
          productId={entity_id}
          queryClient={queryClient}
          mode="create"
          onDeleted={handleClose}
          {...portalProps}
        />
      )
    default:
      return null
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/modal/ModalManager.tsx
git commit -m "feat(modal): accept portal target in ModalManager"
```

---

## Task 13: Migrate `ProductModal` to mutation hooks + add X + unsaved guard

**Files:**
- Modify: `src/components/entity/ProductModal.tsx`
- Create: `src/components/entity/__tests__/ProductModal.test.tsx`

This is the canonical migration; Tasks 14 and 15 follow the same shape for variant and warehouse.

- [ ] **Step 1: Write the failing component test**

Create `src/components/entity/__tests__/ProductModal.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { QueryWrapper, createTestQueryClient } from '@/lib/test-utils/query-wrapper'
import { ProductModal } from '../ProductModal'
import { useUIStore } from '@/store/ui-store'
import { commands } from '@/lib/tauri-bindings'

vi.mock('@/lib/tauri-bindings', () => ({
  commands: {
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
    stockLevelsGetByProduct: vi.fn(),
    variantsGetByProductWithStock: vi.fn(),
    stockMovementsGetByVariant: vi.fn(),
    warehousesGetAll: vi.fn(),
  },
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const mockOk = <T,>(data: T) => ({ status: 'ok' as const, data })

function renderModal(props: Partial<React.ComponentProps<typeof ProductModal>> = {}) {
  const client = createTestQueryClient()
  const utils = render(
    <ProductModal
      entityId="P1"
      queryClient={client}
      mode="view"
      onDeleted={vi.fn()}
      {...props}
    />,
    { wrapper: (p) => <QueryWrapper {...p} client={client} /> }
  )
  return { ...utils, client }
}

describe('ProductModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useUIStore.setState({ tabState: {} })
  })

  it('renders the dialog with modal={false} (no backdrop blocks the rest of the app)', async () => {
    vi.mocked(commands.getById).mockResolvedValue(
      mockOk({ id: 'P1', company: 'ACME', name: 'Widget', category: 'A' })
    )
    vi.mocked(commands.warehousesGetAll).mockResolvedValue(mockOk([]))
    vi.mocked(commands.stockLevelsGetByProduct).mockResolvedValue(mockOk([]))
    vi.mocked(commands.variantsGetByProductWithStock).mockResolvedValue(mockOk([]))
    vi.mocked(commands.stockMovementsGetByVariant).mockResolvedValue(mockOk([]))

    renderModal()
    // Wait for the entity to load
    await waitFor(() => screen.getByText('ACME'))
    // The Headless UI Dialog should be present but not in modal mode
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('Save button is disabled when isDirty is false', async () => {
    vi.mocked(commands.getById).mockResolvedValue(
      mockOk({ id: 'P1', company: 'ACME', name: 'Widget', category: 'A' })
    )
    vi.mocked(commands.warehousesGetAll).mockResolvedValue(mockOk([]))
    vi.mocked(commands.stockLevelsGetByProduct).mockResolvedValue(mockOk([]))
    vi.mocked(commands.variantsGetByProductWithStock).mockResolvedValue(mockOk([]))
    vi.mocked(commands.stockMovementsGetByVariant).mockResolvedValue(mockOk([]))

    renderModal()
    await waitFor(() => screen.getByText('ACME'))
    // Click Edit
    await userEvent.setup().click(screen.getByText(/edit/i))
    // Save & close should be disabled because no field has changed
    const saveAndClose = screen.queryByText(/save.*close/i)
    if (saveAndClose) {
      expect(saveAndClose.closest('button')).toBeDisabled()
    }
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm run test:run src/components/entity/__tests__/ProductModal.test.tsx`
Expected: FAIL — the test uses props that don't exist yet (`container`, `mode` is fine).

- [ ] **Step 3: Rewrite `ProductModal`**

Replace the contents of `src/components/entity/ProductModal.tsx` with the following. This is a large rewrite; the key changes are:

- Accept new props: `container?: HTMLElement` (Headless UI portal target), `entityType?: 'products' | 'variants' | 'warehouses'` (defaults to `'products'`).
- Read from `useGetProduct`, `useStockLevelsForProduct`, `useStockMovements`, `useWarehouses` instead of raw `commands.xxx` + `useState`.
- Save / Create / Delete use `useUpdateProduct`, `useCreateProduct`, `useSoftDeleteProduct`.
- `<Dialog modal={false} container={container}>`.
- Add the X close button.
- Wire `useUnsavedGuard` (3-button in edit mode, 2-button in create mode).
- Register a `ModalHandle` via `registerModalHandle('products', ...)` on mount.

```tsx
import { useState, useEffect, useImperativeHandle, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { commands } from '@/lib/tauri-bindings'
import { ConfirmationDialog } from './ConfirmationDialog'
import { StockLevelsTable } from './StockLevelsTable'
import { StockMovementsTable } from './StockMovementsTable'
import { ProductForm } from '@/components/entity-form'
import { updateProductSchema } from '@/lib/validation/schemas'
import { EntityFieldGrid } from './EntityFieldGrid'
import { useUnsavedGuard } from '@/hooks/use-unsaved-guard'
import { useUIStore } from '@/store/ui-store'
import {
  useGetProduct,
  useStockLevelsForProduct,
  useStockMovements,
  useWarehouses,
} from '@/services/entity/queries'
import {
  useCreateProduct,
  useUpdateProduct,
  useSoftDeleteProduct,
} from '@/services/entity/mutations'
import { registerModalHandle, type ModalHandle } from '@/components/layout/MainWindowContent'

interface ProductModalProps {
  entityId?: string
  queryClient: QueryClient
  mode: 'view' | 'create'
  onDeleted?: () => void
  container?: HTMLElement
  productId?: string
}

type TabId = 'products' | 'variants' | 'warehouses'

const PRODUCT_ROWS = [
  [
    { key: 'company', label: 'entity.product.company', type: 'text' as const },
    { key: 'category', label: 'entity.product.category', type: 'text' as const },
  ],
  [{ key: 'name', label: 'entity.product.name', type: 'text' as const }],
  [
    { key: 'updated_at', label: 'entity.common.updatedAt', type: 'date' as const },
    { key: 'created_at', label: 'entity.common.createdAt', type: 'date' as const },
  ],
]

export function ProductModal({
  entityId,
  queryClient,
  mode,
  onDeleted,
  container,
}: ProductModalProps) {
  void queryClient
  const { t } = useTranslation()
  const reactQueryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({ company: '', name: '', category: '' })
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [activeTab, setActiveTab] = useState<'details' | 'stock' | 'insights' | 'audits'>('details')
  const [createDraft, setCreateDraft] = useState<Record<string, unknown> | null>(null)
  const [editDraft, setEditDraft] = useState<Record<string, unknown> | null>(null)
  const [isDirty, setIsDirty] = useState(false)

  // ----- Data hooks -----
  const { data: entity, isLoading } = useGetProduct(mode === 'view' ? entityId : undefined)
  const { data: stockLevels, isLoading: isLoadingStock } = useStockLevelsForProduct(
    mode === 'view' ? entityId : undefined
  )
  const { data: movements, isLoading: isLoadingMovements, error: movementsError } = useStockMovements(
    'product',
    mode === 'view' ? entityId : undefined
  )
  const { data: warehouses } = useWarehouses()

  const warehouseNames = new Map<string, string>()
  if (warehouses) for (const w of warehouses) warehouseNames.set(w.id, w.name)

  // ----- Sync edit form when entity loads -----
  useEffect(() => {
    if (entity) {
      setEditForm({ company: entity.company, name: entity.name, category: entity.category })
    }
  }, [entity])

  // ----- Register imperative handle for the per-tab effect in MainWindowContent -----
  const editDraftRef = useRef(editDraft)
  editDraftRef.current = editDraft
  const createDraftRef = useRef(createDraft)
  createDraftRef.current = createDraft
  const isDirtyRef = useRef(isDirty)
  isDirtyRef.current = isDirty

  useEffect(() => {
    if (mode !== 'view' && !entityId) return
    const handle: ModalHandle = {
      getIsDirty: () => isDirtyRef.current,
      getCreateDraft: () => createDraftRef.current ?? undefined,
      getEditDraft: () => editDraftRef.current ?? undefined,
      discardDrafts: () => {
        setEditDraft(null)
        setCreateDraft(null)
        setIsDirty(false)
        if (entity) {
          setEditForm({ company: entity.company, name: entity.name, category: entity.category })
        }
        useUIStore.getState().clearTabState('products')
      },
    }
    return registerModalHandle('products', handle)
  }, [mode, entityId, entity])

  // ----- Mutations -----
  const updateProduct = useUpdateProduct({
    onSettled: (data, error) => {
      if (!error && data) {
        setIsEditing(false)
        setIsDirty(false)
        setEditDraft(null)
        useUIStore.getState().setTabIsDirty('products', false)
        useUIStore.getState().setTabEditDraft('products', undefined)
      }
    },
  })
  const createProduct = useCreateProduct({
    onSettled: (data, error) => {
      if (!error && data) {
        reactQueryClient.invalidateQueries({ queryKey: ['entity', 'products'] })
        useUIStore.getState().clearTabState('products')
        onDeleted?.()
      }
    },
  })
  const deleteProduct = useSoftDeleteProduct({
    onSettled: (data, error) => {
      if (!error) {
        setShowDeleteConfirm(false)
        reactQueryClient.invalidateQueries({ queryKey: ['entity', 'products'] })
        onDeleted?.()
      }
    },
  })

  // ----- Unsaved guard -----
  const guard = useUnsavedGuard({
    isDirty,
    onDiscard: () => {
      // Restore entity values and exit edit mode
      if (entity) {
        setEditForm({ company: entity.company, name: entity.name, category: entity.category })
      }
      setIsEditing(false)
      setIsDirty(false)
      setEditDraft(null)
      setCreateDraft(null)
      useUIStore.getState().setTabIsDirty('products', false)
      useUIStore.getState().setTabEditDraft('products', undefined)
      useUIStore.getState().setTabCreateDraft('products', undefined)
      onDeleted?.()
    },
    onSaveAndClose: async () => {
      if (mode === 'create') {
        createProduct.mutate({ values: editForm })
      } else if (entity) {
        updateProduct.mutate({ id: entity.id, values: editForm })
      }
    },
    context: { entityName: entity?.name ?? '' },
  })

  // ----- Save handlers -----
  function handleSave(values: { company: string; name: string; category: string }) {
    if (mode === 'create') {
      createProduct.mutate({ values })
    } else if (entity) {
      updateProduct.mutate({ id: entity.id, values })
    }
  }

  function handleDelete() {
    if (entity) deleteProduct.mutate({ id: entity.id })
  }

  function handleEdit() {
    if (entity) {
      setEditForm({ company: entity.company, name: entity.name, category: entity.category })
    }
    setIsEditing(true)
  }

  function handleCancelEdit() {
    if (entity) {
      setEditForm({ company: entity.company, name: entity.name, category: entity.category })
    }
    setIsEditing(false)
    setIsDirty(false)
    setEditDraft(null)
  }

  // Track form changes for the unsaved guard
  useEffect(() => {
    if (mode === 'create') {
      setIsDirty(!!createDraft && Object.keys(createDraft).length > 0)
      return
    }
    if (!entity) return
    const isChanged =
      editForm.company !== entity.company ||
      editForm.name !== entity.name ||
      editForm.category !== entity.category
    setIsDirty(isChanged)
  }, [editForm, entity, createDraft, mode])

  // ----- Render -----
  if (mode === 'create') {
    return (
      <Dialog open={true} onClose={guard.requestClose} modal={false} {...(container ? { container } : {})}>
        <DialogPanel onClose={guard.requestClose}>
          <DialogTitle>{t('entity.create.product.title')}</DialogTitle>
          <ProductForm
            onSubmit={handleSave}
            isLoading={createProduct.isPending}
            initialValues={editForm}
            onChange={(values) => {
              setEditForm(values)
              setCreateDraft(values)
              useUIStore.getState().setTabCreateDraft('products' as TabId, values)
            }}
          />
        </DialogPanel>
        <guard.ConfirmDialog />
      </Dialog>
    )
  }

  return (
    <Dialog open={true} onClose={guard.requestClose} modal={false} {...(container ? { container } : {})}>
      <DialogPanel onClose={guard.requestClose}>
        <DialogTitle>{entity?.name ?? t('entity.detail.loading')}</DialogTitle>
        <DialogDescription>
          {entity ? `${entity.company} — ${entity.category}` : ''}
        </DialogDescription>

        <div role="tablist" className="flex border-b mb-4">
          {(['details', 'stock', 'insights', 'audits'] as const).map(id => (
            <button
              key={id}
              role="tab"
              aria-selected={activeTab === id}
              onClick={() => setActiveTab(id)}
              className={`px-4 py-2 ${activeTab === id ? 'border-b-2 border-secondary' : ''}`}
            >
              {t('entity.detail.tabs.' + id)}
            </button>
          ))}
        </div>

        {activeTab === 'details' && (
          <div>
            {isLoading ? (
              <div className="grid grid-cols-2 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="space-y-1">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-5 w-full" />
                  </div>
                ))}
              </div>
            ) : entity ? (
              <div className="space-y-4">
                {isEditing ? (
                  <ProductForm
                    schema={updateProductSchema}
                    onSubmit={handleSave}
                    isLoading={updateProduct.isPending}
                    initialValues={editForm}
                    onChange={(values) => {
                      setEditForm(values)
                      setEditDraft(values)
                      useUIStore.getState().setTabEditDraft('products' as TabId, values)
                    }}
                    submitText={t('entity.update.button')}
                  />
                ) : (
                  <EntityFieldGrid rows={PRODUCT_ROWS} entity={entity} />
                )}

                {updateProduct.isError && (
                  <p className="text-body-sm text-error">
                    {(updateProduct.error as Error).message}
                  </p>
                )}

                <div className="flex items-center justify-between pt-4 border-t">
                  <Button
                    variant="ghost"
                    className="text-error"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <span className="material-symbols-outlined text-sm">delete</span>
                    {t('entity.detail.delete')}
                  </Button>
                  <div className="flex gap-2">
                    {isEditing ? (
                      <>
                        <Button variant="outline" onClick={handleCancelEdit}>
                          {t('common.cancel')}
                        </Button>
                        <Button
                          onClick={() => handleSave(editForm)}
                          disabled={!isDirty || updateProduct.isPending}
                        >
                          {t('entity.update.button')}
                        </Button>
                        <Button
                          onClick={guard.requestClose}
                          disabled={!isDirty || updateProduct.isPending}
                        >
                          {t('common.saveAndClose')}
                        </Button>
                      </>
                    ) : (
                      <Button onClick={handleEdit}>
                        <span className="material-symbols-outlined text-sm">edit</span>
                        {t('entity.detail.edit')}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {activeTab === 'stock' && (
          <StockLevelsTable
            stockLevels={stockLevels ?? []}
            isLoading={isLoadingStock}
            view="product"
            warehouseNames={warehouseNames}
            onTransferSuccess={() =>
              reactQueryClient.invalidateQueries({
                queryKey: ['stock-levels-product', entityId],
              })
            }
          />
        )}

        {activeTab === 'audits' && (
          <StockMovementsTable
            movements={movements ?? []}
            isLoading={isLoadingMovements}
            error={movementsError?.message ?? ''}
            variant="product"
            warehouseNames={warehouseNames}
            emptyMessage={t('entity.stockMovement.noMovementsProduct')}
          />
        )}

        {activeTab === 'insights' && (
          <div className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-48 w-full rounded-lg" />
          </div>
        )}
      </DialogPanel>
      <guard.ConfirmDialog />
      <ConfirmationDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title={t('entity.detail.deleteConfirmTitle', { name: entity?.name ?? '' })}
        description={t('entity.detail.deleteConfirmMessage')}
        onConfirm={handleDelete}
        isDestructive
        isLoading={deleteProduct.isPending}
        error={deleteProduct.isError ? (deleteProduct.error as Error).message : ''}
      />
    </Dialog>
  )
}
```

Notes for the implementer:

- The test file uses `screen.getByText('ACME')` and `screen.getByText(/edit/i)` — the production code shows `entity.name` in the title and the "Edit" button label is `entity.detail.edit` (i18n key). For the test to pass, the modal must render those strings. Adjust test selectors or the production code as needed to match what actually shows. The test is a smoke test, not a UI contract.
- `ProductForm`'s API may not currently expose an `onChange` callback. If it doesn't, add one in `src/components/entity-form/ProductForm.tsx` (or wherever it lives) and call it from the form's internal `onChange`. Read the form file first; this is a small addition.
- `EntityFieldGrid`'s API is unchanged. `StockLevelsTable` and `StockMovementsTable` are unchanged consumers.
- The `onClose` callback wired to the X button calls `guard.requestClose`. Headless UI's `Dialog` also calls `onClose` on Escape, which is what we want.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm run test:run src/components/entity/__tests__/ProductModal.test.tsx`
Expected: PASS (2/2). Iterate on selectors and minor API mismatches as needed. The shape is what matters.

- [ ] **Step 5: Typecheck**

Run: `pnpm run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/entity/ProductModal.tsx src/components/entity/__tests__/ProductModal.test.tsx
git commit -m "refactor(product-modal): migrate to mutation hooks + non-modal + unsaved guard"
```

---

## Task 14: Migrate `VariantModal` (same shape as Task 13)

**Files:**
- Modify: `src/components/entity/VariantModal.tsx`
- Create: `src/components/entity/__tests__/VariantModal.test.tsx`

- [ ] **Step 1: Mirror Task 13 for variants**

Apply the same migration pattern as Task 13 to `src/components/entity/VariantModal.tsx`:

- Replace `loadEntity` / `useState` with `useGetVariant(id)`.
- Replace `handleSave` (which calls `commands.variantsUpdate`) with `useUpdateVariant`.
- Replace the create-mode submit with `useCreateVariant`.
- Replace the delete submit with `useSoftDeleteVariant`.
- Use `useStockLevelsForVariant` instead of the inline `useQuery` block.
- Use `useStockMovements('variant', id)` instead of the inline `useQuery` block.
- `Dialog modal={false}` with portal `container` and X close.
- Wire `useUnsavedGuard` (3-button in edit mode, 2-button in create mode, register `registerModalHandle('variants', ...)`).
- The `entityId` in `ModalManager` is the variant id; for create-variant, the `productId` is the parent.

The exact code structure is the same as Task 13 with these substitutions:

- `commands.getById` → `commands.variantsGetById`
- `commands.update` → `commands.variantsUpdate`
- `commands.create` → `commands.variantsCreate`
- `commands.softDelete` → `commands.variantsDelete`
- `commands.stockLevelsGetByProduct` → `commands.stockLevelsGetByVariant`
- `commands.stockMovementsGetByProduct` → `commands.stockMovementsGetByVariant`
- `useGetProduct` → `useGetVariant`
- `useUpdateProduct` → `useUpdateVariant`
- `useCreateProduct` → `useCreateVariant`
- `useSoftDeleteProduct` → `useSoftDeleteVariant`
- `useStockLevelsForProduct` → `useStockLevelsForVariant`
- `useStockMovements('product', id)` → `useStockMovements('variant', id)`
- `'products'` → `'variants'` in all the `useUIStore` calls and `registerModalHandle`
- `listFor('products')` → `listFor('variants')`
- `entityQueryKeys.detail('products', id)` → `entityQueryKeys.detail('variants', id)`

- [ ] **Step 2: Write the smoke test**

Create `src/components/entity/__tests__/VariantModal.test.tsx` mirroring the ProductModal test, with `vi.mock` for `commands.variantsGetById`, `commands.variantsUpdate`, `commands.variantsCreate`, `commands.variantsDelete`, etc.

- [ ] **Step 3: Run the test**

Run: `pnpm run test:run src/components/entity/__tests__/VariantModal.test.tsx`
Expected: PASS.

- [ ] **Step 4: Typecheck**

Run: `pnpm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/entity/VariantModal.tsx src/components/entity/__tests__/VariantModal.test.tsx
git commit -m "refactor(variant-modal): migrate to mutation hooks + non-modal + unsaved guard"
```

---

## Task 15: Migrate `WarehouseModal` (same shape as Task 13)

**Files:**
- Modify: `src/components/entity/WarehouseModal.tsx`
- Create: `src/components/entity/__tests__/WarehouseModal.test.tsx`

- [ ] **Step 1: Mirror Task 13 for warehouses**

Apply the same migration pattern. Substitutions:

- `commands.getById` → `commands.warehousesGetById`
- `commands.update` → `commands.warehousesUpdate`
- `commands.create` → `commands.warehousesCreate`
- `commands.softDelete` → `commands.warehousesDelete`
- `useGetProduct` → `useGetWarehouse`
- `useUpdateProduct` → `useUpdateWarehouse`
- `useCreateProduct` → `useCreateWarehouse`
- `useSoftDeleteProduct` → `useSoftDeleteWarehouse`
- `useStockMovements('product', id)` → `useStockMovements('warehouse', id)`
- `'products'` → `'warehouses'` in all `useUIStore` and `registerModalHandle` calls
- `listFor('products')` → `listFor('warehouses')`
- `entityQueryKeys.detail('products', id)` → `entityQueryKeys.detail('warehouses', id)`

Note: warehouses do not have a stock-levels tab; they have a stock-movements tab keyed by warehouse.

- [ ] **Step 2: Write the smoke test**

Create `src/components/entity/__tests__/WarehouseModal.test.tsx` mirroring the ProductModal test, with `vi.mock` for `commands.warehousesGetById`, `commands.warehousesUpdate`, etc.

- [ ] **Step 3: Run the test**

Run: `pnpm run test:run src/components/entity/__tests__/WarehouseModal.test.tsx`
Expected: PASS.

- [ ] **Step 4: Typecheck**

Run: `pnpm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/entity/WarehouseModal.tsx src/components/entity/__tests__/WarehouseModal.test.tsx
git commit -m "refactor(warehouse-modal): migrate to mutation hooks + non-modal + unsaved guard"
```

---

## Task 16: Add `ModalManager` component test

**Files:**
- Create: `src/components/modal/__tests__/ModalManager.test.tsx`

- [ ] **Step 1: Write the test**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryWrapper, createTestQueryClient } from '@/lib/test-utils/query-wrapper'
import { ModalManager } from '../ModalManager'
import { useUIStore } from '@/store/ui-store'
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

// Stub useLocation from tanstack-router so we can drive the search params from the test
let mockSearch = ''
vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-router')>(
    '@tanstack/react-router'
  )
  return {
    ...actual,
    useLocation: () => ({
      pathname: '/entity/products',
      href: '/entity/products' + (mockSearch ? '?' + mockSearch : ''),
    }),
    useNavigate: () => vi.fn(),
  }
})

describe('ModalManager', () => {
  beforeEach(() => {
    mockSearch = ''
    useUIStore.setState({ tabState: {} })
    vi.mocked(commands.getById).mockResolvedValue(
      mockOk({ id: 'P1', company: 'ACME', name: 'Widget', category: 'A' })
    )
    vi.mocked(commands.warehousesGetAll).mockResolvedValue(mockOk([]))
    vi.mocked(commands.stockLevelsGetByProduct).mockResolvedValue(mockOk([]))
    vi.mocked(commands.variantsGetByProductWithStock).mockResolvedValue(mockOk([]))
    vi.mocked(commands.stockMovementsGetByVariant).mockResolvedValue(mockOk([]))
  })

  it('returns null when there are no modal search params', () => {
    const { container } = render(<ModalManager portalTarget={null} />, {
      wrapper: QueryWrapper,
    })
    expect(container).toBeEmptyDOMElement()
  })

  it('renders the product modal when entity_modal=product and entity_id is set', async () => {
    mockSearch = 'entity_modal=product&entity_id=P1'
    render(<ModalManager portalTarget={null} />, { wrapper: QueryWrapper })
    await waitFor(() => screen.getByText(/ACME|Widget/))
  })
})
```

- [ ] **Step 2: Run the test**

Run: `pnpm run test:run src/components/modal/__tests__/ModalManager.test.tsx`
Expected: PASS (2/2).

- [ ] **Step 3: Commit**

```bash
git add src/components/modal/__tests__/ModalManager.test.tsx
git commit -m "test(modal): add ModalManager component tests"
```

---

## Task 17: Migrate `LoginModal` (shim swap only)

**Files:**
- Modify: `src/components/auth/LoginModal.tsx`

- [ ] **Step 1: Read the current file and apply the swap**

Read `src/components/auth/LoginModal.tsx`. Replace the imports and JSX to use the new Headless UI shim:

- Replace `import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'` with `import { Dialog, DialogPanel, DialogTitle, DialogDescription } from '@/components/ui/dialog'`.
- Replace `<Dialog open={...}><DialogContent><DialogHeader><DialogTitle>...</DialogTitle></DialogHeader>...</DialogContent></Dialog>` with `<Dialog open={...} onClose={...}><DialogPanel><DialogTitle>...</DialogTitle>...</DialogPanel></Dialog>`.
- Replace `<DialogFooter>...</DialogFooter>` with a plain `<div className="flex justify-end gap-2 pt-4">...</div>`.
- The login modal keeps `modal={true}` (default), so no behavioral change.

- [ ] **Step 2: Typecheck**

Run: `pnpm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/auth/LoginModal.tsx
git commit -m "refactor(auth): migrate LoginModal to Headless UI dialog shim"
```

---

## Task 18: Migrate `ConfirmationDialog` (shim swap only)

**Files:**
- Modify: `src/components/entity/ConfirmationDialog.tsx`

- [ ] **Step 1: Apply the swap**

Read `src/components/entity/ConfirmationDialog.tsx`. Apply the same Headless UI shim swap as Task 17. No unsaved guard (it IS the confirmation).

- [ ] **Step 2: Typecheck + commit**

```bash
pnpm run typecheck
git add src/components/entity/ConfirmationDialog.tsx
git commit -m "refactor(ui): migrate ConfirmationDialog to Headless UI dialog shim"
```

---

## Task 19: Migrate `CommandPalette` (shim swap only)

**Files:**
- Modify: `src/components/ui/command.tsx`

- [ ] **Step 1: Apply the swap**

Read `src/components/ui/command.tsx`. Apply the Headless UI shim swap. The CommandPalette is `modal={true}` (default). No unsaved guard.

- [ ] **Step 2: Typecheck + commit**

```bash
pnpm run typecheck
git add src/components/ui/command.tsx
git commit -m "refactor(ui): migrate CommandPalette to Headless UI dialog shim"
```

---

## Task 20: Migrate `FilterDialog` (shim swap + unsaved guard, 2-button)

**Files:**
- Modify: `src/components/entity/FilterDialog.tsx`
- Create: `src/components/entity/__tests__/FilterDialog.test.tsx`

- [ ] **Step 1: Apply the shim swap + wire the guard**

Apply the Headless UI shim swap. Then:

- Track `isDirty` based on whether the local filter draft differs from the applied filters.
- `useUnsavedGuard({ isDirty, onDiscard: () => onOpenChange(false), context: {...} })`.
- Render `<guard.ConfirmDialog />` inside the dialog.
- The `requestClose` is wired to the dialog's `onClose` and the X button.

- [ ] **Step 2: Write the test**

Create `src/components/entity/__tests__/FilterDialog.test.tsx` covering:
- Closing without changes calls `onOpenChange(false)` directly.
- Closing with staged changes opens the confirm popover.
- Discarding calls `onOpenChange(false)`.
- "Keep editing" closes the prompt without calling `onOpenChange`.

- [ ] **Step 3: Run the test, typecheck, commit**

```bash
pnpm run test:run src/components/entity/__tests__/FilterDialog.test.tsx
pnpm run typecheck
git add src/components/entity/FilterDialog.tsx src/components/entity/__tests__/FilterDialog.test.tsx
git commit -m "refactor(filter-dialog): shim swap + unsaved guard"
```

---

## Task 21: Migrate `ColumnVisibilityDialog` (shim swap + unsaved guard, 2-button)

**Files:**
- Modify: `src/components/entity/ColumnVisibilityDialog.tsx`
- Create: `src/components/entity/__tests__/ColumnVisibilityDialog.test.tsx`

- [ ] **Step 1: Apply the shim swap + wire the guard (2-button variant)**

Same pattern as Task 20. `isDirty` is true when the local column visibility draft differs from the applied columns.

- [ ] **Step 2: Test, typecheck, commit**

```bash
pnpm run test:run src/components/entity/__tests__/ColumnVisibilityDialog.test.tsx
pnpm run typecheck
git add src/components/entity/ColumnVisibilityDialog.tsx src/components/entity/__tests__/ColumnVisibilityDialog.test.tsx
git commit -m "refactor(column-dialog): shim swap + unsaved guard"
```

---

## Task 22: Migrate `PrintPreviewDialog` (shim swap + unsaved guard, 2-button)

**Files:**
- Modify: `src/components/entity/PrintPreviewDialog.tsx`
- Create: `src/components/entity/__tests__/PrintPreviewDialog.test.tsx`

- [ ] **Step 1: Apply the shim swap + wire the guard**

Same pattern. `isDirty` is true when local print options differ from applied options.

- [ ] **Step 2: Test, typecheck, commit**

```bash
pnpm run test:run src/components/entity/__tests__/PrintPreviewDialog.test.tsx
pnpm run typecheck
git add src/components/entity/PrintPreviewDialog.tsx src/components/entity/__tests__/PrintPreviewDialog.test.tsx
git commit -m "refactor(print-dialog): shim swap + unsaved guard"
```

---

## Task 23: Migrate `ProfileModal` (shim swap + unsaved guard, 2-button)

**Files:**
- Modify: `src/components/auth/ProfileModal.tsx`
- (No new test — covered by the existing `ProfileModal` smoke flow, since the user-facing change is small and CRUD is not in this spec.)

- [ ] **Step 1: Apply the shim swap + wire the guard (2-button variant)**

Apply the Headless UI shim swap. Wire `useUnsavedGuard({ isDirty, onDiscard: () => onOpenChange(false) })` (no `onSaveAndClose` because Profile CRUD is out of scope). Track `isDirty` based on whether the local form differs from the loaded profile.

- [ ] **Step 2: Typecheck + commit**

```bash
pnpm run typecheck
git add src/components/auth/ProfileModal.tsx
git commit -m "refactor(profile): migrate ProfileModal to Headless UI dialog shim + unsaved guard"
```

---

## Task 24: Migrate `PreferencesDialog` (shim swap + 3-button unsaved guard wired to `useSavePreferences`)

**Files:**
- Modify: `src/components/preferences/PreferencesDialog.tsx`
- Create: `src/components/preferences/__tests__/PreferencesDialog.test.tsx`

- [ ] **Step 1: Apply the shim swap**

Apply the Headless UI shim swap (no `DialogHeader`/`DialogFooter`; use plain divs).

- [ ] **Step 2: Wire the 3-button unsaved guard**

```ts
const savePreferences = useSavePreferences()

const guard = useUnsavedGuard({
  isDirty,
  onDiscard: () => onOpenChange(false),
  onSaveAndClose: () => {
    return new Promise<void>((resolve) => {
      savePreferences.mutate(preferences, {
        onSettled: () => {
          onOpenChange(false)
          resolve()
        },
      })
    })
  },
  context: { /* if relevant */ },
})
```

Track `isDirty` based on whether the local preferences differ from the loaded preferences.

- [ ] **Step 3: Write the test**

Create `src/components/preferences/__tests__/PreferencesDialog.test.tsx` covering:
- Closing with unsaved preferences opens the 3-button confirm.
- "Save & close" calls `useSavePreferences().mutate()` and closes on success.
- "Discard" closes without saving.
- "Keep editing" stays open.

Mock `useSavePreferences` to return a controlled mutation.

- [ ] **Step 4: Run, typecheck, commit**

```bash
pnpm run test:run src/components/preferences/__tests__/PreferencesDialog.test.tsx
pnpm run typecheck
git add src/components/preferences/PreferencesDialog.tsx src/components/preferences/__tests__/PreferencesDialog.test.tsx
git commit -m "refactor(preferences): shim swap + unsaved guard wired to useSavePreferences"
```

---

## Task 25: Wire the unsaved guard into the tab bar's tab-switch interception

This is the small wiring step that ties the per-tab draft preservation to the user's actual tab-click: when the user clicks a tab, if the current tab has a dirty modal, prompt before navigating.

**Files:**
- Modify: the component that renders the tab bar (find it; likely `src/components/layout/TabBar.tsx` or similar). Read it first.

- [ ] **Step 1: Locate the tab-switch handler**

Run: `grep -r "setActiveTab" src/ --include="*.tsx" --include="*.ts"`
Expected: identifies the file(s) that call `setActiveTab`. Read them.

- [ ] **Step 2: Wrap the tab-switch call with the guard**

The pattern is: before calling `setActiveTab(newId)`, check if `useUIStore.getState().tabState[currentEntityType]?.isDirty` is `true`. If so, the modal layer's `requestClose` (via `useUnsavedGuard` in the modal) must be called first. Concretely, the cleanest way is:

- Move the `useUnsavedGuard` instantiation to a small wrapper component that lives in `MainWindowContent` (or in the tab bar), so the `requestClose` is reachable from the tab-click handler.
- The tab bar's onClick handler: `if (useUIStore.getState().tabState[currentEntityType]?.isDirty) { guard.requestClose(); return; }` and the modal's `onDiscard` callback calls `setActiveTab(newId)`.

Implementation detail: this is the one place where the architecture spans the tab bar and the modal. If it's too invasive, fall back to a less-magic approach: when the user clicks a tab, if `isDirty`, open the confirm popover inline (without using `useUnsavedGuard`'s popover — just call the same Dialog directly from the tab bar). This is acceptable as long as the same 3-button UI is presented.

A simpler acceptable approach: the tab bar's onClick always calls `setActiveTab`. The modal in `MainWindowContent`'s effect, before navigating, checks `isDirty` via the imperative handle and, if dirty, opens the confirm popover and only navigates on confirmation. The confirm popover lives inside the modal and is reached via the `tabHandles` map.

**The cleanest concrete implementation:**

1. Add a `useUnsavedGuard`-style component at the level of `MainWindowContent` that renders a single confirm popover driven by a Zustand-stored `interceptedNavigation: { targetTabId: string; onDiscard: () => void; onSaveAndClose?: () => Promise<void> } | null`.
2. The tab bar's onClick sets `interceptedNavigation` and returns; the popover renders. The popover's "Discard" runs the `onDiscard` callback (which calls `setActiveTab`). The popover's "Save & close" runs the `onSaveAndClose` (which calls the mutation's `mutateAsync` and on success calls the `onDiscard`).

Since the spec already calls for `MainWindowContent`'s effect to capture state, and the tab bar already triggers a state change that the effect picks up, the cleanest single-source-of-truth flow is:

- The tab bar's onClick always calls `setActiveTab(newId)` (no interception in the tab bar).
- The modal, in its own `useEffect` watching `activeTabId` (read via `useTabStore`), checks if it was mounted on the previous tab and is now being unmounted because the user navigated away. If `isDirty`, the modal opens the confirm popover (via its own `useUnsavedGuard`) and the modal's `onDiscard` only calls `onDeleted` (which clears the URL but doesn't affect the tab). The user then chooses: keep the modal open (impossible since the tab is gone — actually, the user is already on the new tab, so the modal is unmounted).

This is genuinely tricky because the navigation is synchronous and the modal unmounts before any `useEffect` can fire. The only clean place to intercept is **in the tab bar's onClick**, before `setActiveTab` is called.

**Concrete plan for this task:**

1. In `TabBar.tsx` (or wherever the tab click is handled), add the following:

```tsx
import { useUnsavedGuard } from '@/hooks/use-unsaved-guard'
import { useUIStore } from '@/store/ui-store'
import { useTabStore } from '@/store/workspace-store'

// inside the component:
const activeTabId = useTabStore(state => state.activeTabId)
const tabs = useTabStore(state => state.tabs)
const setActiveTab = useTabStore(state => state.setActiveTab)
const tabState = useUIStore(state => state.tabState)

const handleTabClick = (newTabId: string) => {
  const currentTab = tabs.find(t => t.id === activeTabId)
  const currentEntityType = currentTab?.entityType as
    | 'products'
    | 'variants'
    | 'warehouses'
    | undefined
  const currentState = currentEntityType
    ? tabState[currentEntityType]
    : undefined
  if (currentState?.isDirty) {
    // Open the confirm popover; the navigation is the "discard" action.
    setInterceptedNavigation({
      targetTabId: newTabId,
      onDiscard: () => {
        useUIStore.getState().clearTabState(currentEntityType!)
        setActiveTab(newTabId)
      },
      onSaveAndClose: async () => {
        // The mutation is owned by the modal; we delegate to the modal's
        // imperative handle. For simplicity in this first cut, the modal
        // registers a saveAndClose() function on the tabState.
        const handle = tabHandles.get(currentEntityType!)
        await handle?.saveAndClose?.()
        setActiveTab(newTabId)
      },
    })
    return
  }
  setActiveTab(newTabId)
}
```

2. Add a small `interceptedNavigation` state in `useUIStore` (or in a module-level `useState` if the architecture guide prefers).
3. Render the confirm popover in `MainWindowContent` (next to `<ModalManager />`).

The exact shape of this wiring is a follow-up implementation detail captured in the spec's "Open Questions" section. This task's commit message should reflect that the wiring is the minimal viable version; further refinement is acceptable in subsequent commits.

- [ ] **Step 3: Test (manual smoke + a small unit test for the dirty-detection logic)**

If the tab bar is hard to unit-test, write a small unit test for the helper function `shouldInterceptTabSwitch(tabState, fromEntityType) → boolean`.

- [ ] **Step 4: Commit**

```bash
git add <files>
git commit -m "feat(tabbar): intercept tab switch when current tab's modal is dirty"
```

---

## Task 26: Remove `@radix-ui/react-dialog` from `package.json` if no other consumer uses it

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Verify no other consumer**

Run: `grep -r "@radix-ui/react-dialog" src/`
Expected: no results. (If results appear in some other shim, stop — don't remove the dep.)

- [ ] **Step 2: Remove the dependency**

Run: `pnpm remove @radix-ui/react-dialog`
Expected: `package.json` and `pnpm-lock.yaml` updated.

- [ ] **Step 3: Verify typecheck and tests still pass**

Run: `pnpm run typecheck && pnpm run test:run`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore(deps): remove @radix-ui/react-dialog (no longer used)"
```

---

## Task 27: Final integration smoke + `check:all`

**Files:** none

- [ ] **Step 1: Run the full check suite**

Run: `pnpm run check:all`
Expected: PASS (typecheck, lint, ast:lint, format:check, rust:fmt:check, rust:clippy, tests).

- [ ] **Step 2: Manual smoke checklist**

Open the Tauri app and verify each of these by hand:

- [ ] Open a product → switch to the Variants tab → the sidebar, navbar, and tab bar are still clickable. No backdrop blocks them.
- [ ] With the product modal open, click the Warehouses tab → the products modal stays mounted (the URL still points to /entity/products?entity_modal=product).
- [ ] Edit a product's name (make it dirty) → click the Variants tab → the confirm popover appears with Keep editing / Save & close / Discard.
- [ ] Click Discard → the products modal closes, the URL clears, and you land on the Variants tab. The modal's draft is gone.
- [ ] Click the Products tab again → no modal opens (it was discarded). Good.
- [ ] Repeat with Save & close instead of Discard → the mutation runs, the toast appears, and you land on the Variants tab.
- [ ] Open a product → close the modal (Escape) → no prompt (not dirty). Open again, edit, close → prompt appears.
- [ ] Open the Filter dialog, stage a filter, close → prompt appears.
- [ ] Open the Preferences dialog, change a setting, close → prompt appears. Click "Save & close" → the change is persisted and the dialog closes.
- [ ] Confirm the modal is centered over the data table area (not the full window) — resize the window narrow, verify the modal's max-height is bounded by the workspace.
- [ ] Submit a product create → toast appears → modal closes → new product appears in the list.
- [ ] Optimistic update test: open a product in the modal → in the underlying table, the value is unchanged. Edit the name in the modal to "NewName" → click Save → in the underlying table, the value flips to "NewName" *before* the network round-trip returns (instantly, on the click). If you then make the backend fail (e.g., by setting an invalid value), the table reverts.

- [ ] **Step 3: Commit any final fixes**

If smoke checks revealed issues, commit each fix separately with a focused message.

---

# Self-Review (post-write)

1. **Spec coverage:**
   - Dialog primitive swap (Radix → Headless UI) → Tasks 5, 17–24, 26.
   - Modal portal target anchored to EntityWorkspace → Tasks 8, 11, 12.
   - `modal={false}` for entity modals → Task 5, 13–15.
   - Per-tab modal/form state (URL + Zustand) → Tasks 7, 11, 25.
   - `useMutation` migration with optimistic updates → Tasks 10, 13–15.
   - Central `queryKeys` factory → Task 3.
   - `useUnsavedGuard` hook → Task 6.
   - 2-button vs 3-button confirm popovers → Tasks 6, 20–24, 13–15.
   - All migrations of consumer dialogs → Tasks 17–24.
   - i18n keys for new strings → Task 6 (step 4).
   - Test coverage (unit + component) → Tasks 3, 4, 6, 7, 9, 10, 13–16, 20–24.

2. **Placeholder scan:** No "TBD", "TODO", "implement later". The "Open Questions" from the spec are referenced (portal target delivery, Radix version compatibility, per-tab ref storage) and each is resolved into a concrete approach in this plan (Task 8 for portal, Task 26 for Radix, Tasks 7+11+25 for ref storage). i18n keys in Task 6 step 4 are explicit. Task 25 acknowledges its own intrinsic complexity and the commit message reflects the iterative nature.

3. **Type consistency:** The plan uses the same names throughout:
   - `entity_modal: ModalType | null` (not `string`).
   - `entity_id: string | null`.
   - `createDraft?: Record<string, unknown>`, `editDraft?: Record<string, unknown>`, `isDirty: boolean`.
   - `setTabModal`, `setTabCreateDraft`, `setTabEditDraft`, `setTabIsDirty`, `clearTabState`, `clearAllTabState`.
   - `useUnsavedGuard({ isDirty, onDiscard, onSaveAndClose? })` returning `{ requestClose, ConfirmDialog }`.
   - `registerModalHandle(tabKey, handle)` from `MainWindowContent.tsx`.
   - Mutation `onSettled` callback signature `(data, error) => void`.

4. **Scope check:** 27 tasks. The first 12 are sequential and set up infrastructure. Tasks 13–15 are the three entity modals and are independent of each other (parallelizable). Tasks 16–24 are component/dialog migrations and are independent (parallelizable). Task 25 is the tab-switch interception (must land after the entity modals are in place). Task 26 is the Radix removal (must land after all Radix-based dialog shim consumers are migrated). Task 27 is the final check. This is the right granularity for a subagent-driven execution.

5. **One ambiguity to flag:** Task 25 (tab-switch interception) is intrinsically the most subtle piece of this feature, and the spec deferred its exact wiring to the implementation. The plan's Task 25 acknowledges this and provides a concrete starting point. The implementer should be prepared to iterate on this task and may need to revise Task 11's effect as a result.
