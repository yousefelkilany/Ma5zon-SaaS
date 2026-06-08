# Integrated Entity Modals with TanStack Mutation Lifecycle

## Status

- **Draft**
- Date: 2026-06-09

## Overview

Make entity detail modals (`ProductModal`, `VariantModal`, `WarehouseModal`) feel like a natural, integrated part of the app: non-blocking (sidebar and tab bar stay interactive), state-preserved per tab, and built on a proper `useMutation` lifecycle with optimistic updates. Replace the shared `ui/dialog` shim (currently Radix UI) with a Headless UI version that gives every call site explicit control over modal vs. non-modal behavior, and add an unsaved-changes guard to every data-entry dialog.

## Motivation

Three problems with the current implementation:

1. **Modals block the whole app.** Radix `Dialog` defaults to `modal={true}`, so the sidebar, navbar, and tab bar are all interaction-blocked while a product/variant/warehouse modal is open. The user cannot, e.g., switch to a different entity type without first closing the modal.

2. **Tab switches clobber modal state.** `MainWindowContent` has an effect that navigates to `/entity/$entityType` with an empty search on every tab change, wiping the `entity_modal` and `entity_id` search params. Switching tabs while a modal is open closes it. In-progress form values are also lost because they live in `useState` inside the modal component (unmounted on close).

3. **CRUD uses raw `commands.xxx` + manual `useState`.** All three entity modals call Rust commands directly inside `try/catch/finally` blocks with `setIsSaving`/`setIsDeleting`/`setIsSubmitting` flags. There is no `useMutation`, no `onMutate`/`onSuccess`/`onSettled`, no optimistic update, no rollback. The only `useMutation` in the entire codebase is `services/preferences.ts:38-63`, which is the pattern we should be following.

## Goals

- Entity modals no longer block the rest of the app. The sidebar, navbar, and tab bar are clickable while a modal is open.
- Each tab remembers its own modal state (which modal, which entity id, in-progress form draft, unsaved edit values) when the user switches tabs and back.
- All CRUD inside the entity modals flows through `useMutation` with the full `onMutate` / `onError` / `onSuccess` / `onSettled` lifecycle, including optimistic updates and rollbacks.
- Every data-entry dialog (entity modals, Filter, Column Visibility, Print Preview, Preferences, Profile) shows an unsaved-changes confirmation before being closed with unsaved work.
- A central query-keys factory exists for entity data, and a single `services/entity/` module owns the entity data layer.

## Non-Goals

- E2E/Playwright tests (the project has no Playwright suite today; adding one is a separate concern).
- Persisting drafts/unsaved changes to disk across app restarts. Drafts are session-only (Zustand only, no persistence layer).
- General "modal stack" management. Only one entity modal is open at a time. Nested dialogs (e.g. `ConfirmationDialog`) are still children of their parent modal.
- Refactoring `EntityWorkspace` beyond adding the modal portal target.
- Removing `@radix-ui/react-dialog` from `package.json`. It is used by `ui/popover`, `ui/dropdown-menu`, `ui/select`, `ui/tabs`, etc. Only the entity-modal and shim paths are affected; Radix stays in the project.
- Migrating the Profile, Preferences, Filter, Column Visibility, or Print Preview dialogs to `useMutation` for their internal CRUD. Only the shim swap and the unsaved-guard wiring are in scope. (The only `useMutation` in the project today is `useSavePreferences`, and we leave it as-is while we add the guard around it.)

## Architecture

Three independent changes that compose into one cohesive feature.

### 1. Dialog primitive swap (Radix UI → Headless UI)

Replace `src/components/ui/dialog.tsx` (currently built on `@radix-ui/react-dialog`) with a Headless UI–based version. Reshape the exports to match what Headless UI actually gives us — the goal is not to preserve a Radix-shaped API for its own sake, but to keep consumer call sites small and intentional.

**New exports** from `ui/dialog.tsx`:

| Export | Built on | Purpose |
|---|---|---|
| `Dialog` | Headless UI `Dialog` | Root. Accepts `open`, `onClose`, `modal?: boolean` (default `true`), `className?`. |
| `DialogBackdrop` | Headless UI `DialogBackdrop` | The overlay. Rendered only when `modal={true}`. |
| `DialogPanel` | Headless UI `DialogPanel` | The positioned content. Consumer styles with Tailwind (centered, drop shadow, max sizes, etc.). |
| `DialogTitle` | Headless UI `DialogTitle` | Title. |
| `DialogDescription` | Headless UI `DialogDescription` | Body text. |
| `Transition` | Headless UI `Transition` | Optional scale/fade transition. Not used by entity modals. |

**Behavioral contract:**

| Behavior | `modal={true}` (default) | `modal={false}` |
|---|---|---|
| Backdrop | Yes, dark semi-transparent | None |
| Body scroll lock | Yes | No |
| Focus trap | Yes | No |
| Escape to close | Yes | Yes |
| Click outside to close | Via `onClose` (consumer wires it) | Not wired (whole app is "outside") |
| Initial focus | First tabbable | First tabbable |
| Portal target | `document.body` by default; overridable via `Dialog`'s `container` prop | Same |

**Entity modals opt into `modal={false}`.** All other dialogs keep the default `modal={true}` (Login, Profile, Preferences, CommandPalette, Filter, Column Visibility, Print Preview, Confirmation, and any future dialogs).

**Modal portal target — anchored to `EntityWorkspace`.** Headless UI's `Dialog` accepts a `container` prop for the portal. We pass a ref to the `EntityWorkspace` container so the modal is rendered *inside* the workspace, not at `document.body`. The dialog panel then uses `fixed inset-0` (Headless UI default) within that container, and `EntityWorkspace` gets `position: relative` so the modal's containing block is the workspace. Result: the modal is visually centered over the data table, not the entire window; resizing the window caps the modal's effective max-height to the workspace's height.

### 2. Per-tab modal/form state (URL + Zustand)

Today, modal state lives in two places:

- The URL (`entity_modal`, `entity_id` search params) — the source of truth for *what* is open on the visible tab.
- `useState` inside each modal component — form drafts and edit-mode unsaved changes.

Both are lost on tab switch. The fix is hybrid: keep the URL for *what* is open, add a Zustand slice for the *drafts* and for *what was open on the inactive tabs*.

**New `useUIStore` slice:**

```ts
type TabId = 'products' | 'variants' | 'warehouses'

type TabModalState = {
  entity_modal: ModalType | null
  entity_id: string | null
  createDraft?: Record<string, unknown>  // undefined = no draft
  editDraft?: Record<string, unknown>    // undefined = no draft (or matches entity)
  isDirty: boolean
}

type TabStateSlice = Record<TabId, TabModalState>
```

The `isDirty` flag is non-optional with default `false`. It is a derived-style flag and is set by the modal when the form changes and when the mutation's `onSettled` clears the draft.

**New `useUIStore` actions** (exposed as individual selectors per the architecture guide's "no Zustand destructuring" rule):

- `setTabModal(tabId, { entity_modal, entity_id })` — writes the open modal for a tab. Called by the URL-sync effect on tab change.
- `setTabCreateDraft(tabId, draft | undefined)` — saves/clears the create-mode form draft.
- `setTabEditDraft(tabId, draft | undefined)` — saves/clears the edit-mode unsaved values.
- `setTabIsDirty(tabId, dirty: boolean)` — sets the dirty flag.
- `clearTabState(tabId)` — full reset for the tab. Called by mutation `onSettled` on success or by explicit discard.
- `clearAllTabState()` — called on logout / app reset (kept for symmetry with the existing `reset` action).

**URL ↔ Zustand sync on tab switch** (lives in `MainWindowContent`):

1. The active tab changes (e.g., user clicks the Warehouses tab).
2. The effect captures the current tab's URL state (`entity_modal`, `entity_id`) and writes it to `useUIStore.tabState[prevTabId]`. It also captures `isDirty`, `createDraft`, `editDraft` from the live modal (via a small imperative setter the modal exposes on mount; see "modal lifecycle" below).
3. The effect navigates to `/entity/$entityType` with the *new* tab's URL state, looked up from `useUIStore.tabState[newTabId]`. If the new tab has no stored modal state, the search is empty.
4. The new tab renders. If its URL has `entity_modal` set, `ModalManager` mounts the corresponding modal; that modal reads `createDraft` / `editDraft` from Zustand and uses them as the form's initial values, so unsaved work reappears.

**Modal lifecycle (per-modal subscription):** each entity modal exposes a `useImperativeHandle` ref (assigned to a per-tab ref in `MainWindowContent`) with the methods `getIsDirty()`, `getCreateDraft()`, `getEditDraft()`, `discardDrafts()`. `MainWindowContent`'s effect calls these methods *only* at navigation time (when the user switches tabs or attempts to close the modal), never on every render. The implementation detail of where the per-tab ref object lives (Zustand store, module-level ref, or context) is deferred to the plan — see "Open Questions" below. (Alternative considered: keep the values directly in the store and have the modal write on every change. Rejected to avoid the render cascade that the architecture guide's "Performance Pattern" warns against. Reading imperatively at navigation time is rare — only on tab switch — so the selector-stability concern does not apply.)

**URL writes vs. Zustand writes:** The URL is still the source of truth for *what is currently open on the visible tab*. Zustand stores:
- The drafts (form values) for the visible tab and the inactive tabs.
- The last-known URL state for the inactive tabs (so re-entering restores both the modal and its entity id).

This makes modal state shareable via URL (a link to `/entity/products?entity_modal=product&entity_id=P1` always opens that product on the products tab) while still preserving in-progress work across tab switches.

### 3. `useMutation` migration of entity CRUD

Replace the raw `commands.xxx` + `useState` + `setIsXxxing` pattern in the three entity modals with `useMutation` hooks. The shape follows `services/preferences.ts:38-63`, extended with optimistic updates.

**New module:** `src/services/entity/`

```
src/services/entity/
  queryKeys.ts         // central query-keys factory
  queries.ts           // read hooks (useGetProduct, useGetVariant, useGetWarehouse, etc.)
  mutations.ts         // mutation hooks (useUpdateProduct, useCreateVariant, useSoftDeleteWarehouse, etc.)
  __tests__/
    queryKeys.test.ts
    queries.test.ts
    mutations.test.ts
```

**`queryKeys.ts`** — central factory:

```ts
import type { EntityType } from '@/lib/utils'

export const entityQueryKeys = {
  all: ['entity'] as const,

  // list-level (the workspace's data table)
  list: (entityType: EntityType, sort: SortKey, page: number, pageSize: number) =>
    [...entityQueryKeys.all, entityType, sort, page, pageSize] as const,

  // invalidation helpers (match the existing 'entity' + plural convention)
  lists: () => [...entityQueryKeys.all] as const,
  listFor: (entityType: EntityType) => [...entityQueryKeys.all, entityType] as const,

  // item-level (a single entity's detail, used by the modal)
  detail: (entityType: EntityType, id: string) =>
    [...entityQueryKeys.all, entityType, 'detail', id] as const,

  // secondary reads (stock, movements, warehouses)
  stockLevels: (scope: 'product' | 'variant', id: string) =>
    ['stock-levels-' + scope, id] as const,
  stockMovements: (scope: 'product' | 'variant' | 'warehouse', id: string) =>
    ['stock-movements-' + scope, id] as const,
  warehouses: () => ['warehouses', 'all'] as const,
  variantsByProduct: (productId: string) => ['variants', productId] as const,
  productsByWarehouse: (warehouseId: string) => ['products', warehouseId] as const,
}
```

The existing ad-hoc `['entity', 'products']` invalidation calls are kept working by the `listFor()` shape; new code uses the factory.

**`queries.ts`** — read hooks, one per logical read:

| Hook | Replaces | Used by |
|---|---|---|
| `useGetProduct(id)` | `ProductModal.loadEntity` (the `commands.getById` block) | `ProductModal` (view/edit mode) |
| `useGetVariant(id)` | `VariantModal` raw `commands.variantsGetById` | `VariantModal` |
| `useGetWarehouse(id)` | `WarehouseModal` raw `commands.warehousesGetById` | `WarehouseModal` |
| `useStockLevelsForProduct(id)` | `ProductModal` existing `useQuery` | `ProductModal` (stock tab) |
| `useStockLevelsForVariant(id)` | `VariantModal` existing `useQuery` | `VariantModal` (stock tab) |
| `useStockMovements(scope, id)` | the three `useQuery` blocks in each modal | All three modals (audits tab) |
| `useWarehouses()` | `ProductModal` + `VariantModal` `['warehouses', 'all']` | Both modals |

Each hook is `useQuery`-based with the corresponding `queryKey` from the factory. Error handling throws so the consumer can `error` and `isError` in render. The `entityId`-required `throw new Error('id required')` pattern in the existing `ProductModal` `useQuery` blocks is folded into the `enabled: !!id` flag on the new hooks.

**`mutations.ts`** — the 9 mutation hooks, in three groups:

- `useCreateProduct`, `useUpdateProduct`, `useSoftDeleteProduct`
- `useCreateVariant`, `useUpdateVariant`, `useSoftDeleteVariant`
- `useCreateWarehouse`, `useUpdateWarehouse`, `useSoftDeleteWarehouse`

Shape (using `useUpdateProduct` as the canonical example):

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { produce } from 'immer'
import { commands } from '@/lib/tauri-bindings'
import { toast } from 'sonner'
import { entityQueryKeys, type ProductUpdateValues, type Product } from './types'

export function useUpdateProduct(options?: {
  onSettled?: (data: Product | null, error: Error | null) => void
}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { id: string; values: ProductUpdateValues }) => {
      const result = await commands.update(
        input.id,
        input.values.company,
        input.values.name,
        input.values.category,
      )
      if (result.status === 'error') throw new Error(result.error)
      return result.data
    },

    onMutate: async ({ id, values }) => {
      await queryClient.cancelQueries({ queryKey: entityQueryKeys.listFor('products') })
      const previousLists = queryClient.getQueriesData<Product[]>(
        { queryKey: entityQueryKeys.listFor('products') },
      )
      queryClient.setQueriesData(
        { queryKey: entityQueryKeys.listFor('products') },
        produce<Product[]>((draft) => {
          if (!draft) return
          const row = draft.find((r) => r.id === id)
          if (row) Object.assign(row, values)
        }),
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
      queryClient.setQueryData(entityQueryKeys.detail('products', data.id), data)
      queryClient.invalidateQueries({ queryKey: entityQueryKeys.listFor('products') })
      queryClient.invalidateQueries({ queryKey: entityQueryKeys.stockLevels('product', data.id) })
      toast.success('Product updated')
    },

    onSettled: (data, error) => {
      options?.onSettled?.(data ?? null, error as Error | null)
    },
  })
}
```

**The `onSettled` pattern.** Hooks accept an optional `onSettled` callback in their options. The hook itself never closes modals or clears local UI state — those are consumer concerns. The modal calls the hook like:

```ts
const updateProduct = useUpdateProduct({
  onSettled: (data, error) => {
    if (!error) {
      setIsEditing(false)
      clearTabEditDraft(activeTabId)
    }
  },
})
```

This matches the separation already used in `services/preferences.ts`.

**Immer usage rule.** `produce()` is used for any optimistic update that touches nested fields (e.g., updating a single field in a `product.variants[]` record, patching `stock-levels`). For the simple one-level row-replace case shown above, `produce()` is also fine but a plain `{ ...row, ...values }` spread is equally clear; we use `produce` for consistency. Documented at the top of `mutations.ts`:

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
```

**Create mutations (`useCreateProduct`, etc.):** no optimistic update possible (we don't have the new id). `onMutate` just cancels relevant queries. `onSuccess` invalidates the list, calls `setQueryData` for the detail (if we want the new entity to be cached immediately), and toasts. `onSettled` lets the consumer close the modal and clear the create draft.

**Delete mutations (`useSoftDeleteProduct`, etc.):** `onMutate` removes the row from list queries (optimistic). `onError` rolls back. `onSuccess` invalidates lists and any stock-level queries that reference the entity. `onSettled` lets the consumer call `onDeleted?.()` (which is `handleClose` in `ModalManager`).

**Forms (`ProductForm`, `VariantForm`, `WarehouseForm`) stop owning submit lifecycle.** They continue to accept `onSubmit` and `isLoading` props. The parent (modal) passes:

```ts
<ProductForm
  onSubmit={(values) => updateProduct.mutate({ id, values })}
  isLoading={updateProduct.isPending}
  initialValues={editForm}
  schema={updateProductSchema}
  submitText={t('entity.update.button')}
/>
```

The form itself is unchanged; the parent now drives its state from the mutation.

## Components

### `useUnsavedGuard` hook

`src/hooks/use-unsaved-guard.ts`. Single small hook used by every data-entry dialog.

```ts
export function useUnsavedGuard(args: {
  isDirty: boolean
  onDiscard: () => void
  onSaveAndClose?: () => Promise<void> | void
  // Optional context for the prompt body, e.g. { entityName: 'ACME 2' }
  context?: Record<string, unknown>
}): {
  requestClose: () => void
  // The popover. The consumer must render this once somewhere in its tree
  // (typically at the end of the modal's JSX). It renders nothing when not open.
  ConfirmDialog: () => JSX.Element | null
}
```

`requestClose()`:
- If `!isDirty`: immediately calls `onDiscard` (the caller's normal close path).
- If `isDirty`: opens a small internal `Dialog` (`modal={true}`) with the title/body/buttons.

`ConfirmDialog` is the small popover. It renders itself (an internal `Dialog` instance) at the root of the hook's owner.

**Three-button confirm popover for entity modals' edit mode** (when `onSaveAndClose` is provided):

- **Keep editing** (default focus, ghost variant). Closes the popover, does nothing else.
- **Save & close** (primary variant). Calls `onSaveAndClose` and resolves once the returned promise settles. Disabled if the mutation is currently `isPending`. Closes the popover before invoking the callback.
- **Discard** (destructive variant). Calls `onDiscard`. Closes the popover.

**Two-button confirm popover for other data-entry dialogs** (when `onSaveAndClose` is undefined): "Keep editing" + "Discard" only.

**Visual** (~360px wide, centered, `modal={true}`):

- Title: "Discard unsaved changes?" or "Save your changes?" depending on which action the user clicked.
- Body: short description naming the entity, e.g. "Your edits to *ACME 2* haven't been saved."
- Buttons laid out right-aligned, primary on the right, destructive on the left, ghost in the middle.

### Entity modals (`ProductModal`, `VariantModal`, `WarehouseModal`)

All three are migrated to the same shape. Differences are limited to:
- The Rust command names (`commands.update` vs `commands.variantsUpdate` vs `commands.warehousesUpdate`, etc.).
- The form fields and schema.
- The `entityType` passed to `entityQueryKeys.listFor(...)`.

The migration is mechanical; the implementation plan treats each modal as its own sub-task so they can be done in parallel.

Each modal:
- Renders a `<Dialog modal={false}>` with a `<DialogPanel>` (centered, drop shadow, max-w-3xl, max-h-[80vh] of the workspace).
- Has a small absolute-positioned X button in the top-right of the panel.
- The X and Escape both call `useUnsavedGuard.requestClose()`.
- The close path (`onDiscard` for the guard) calls the `ModalManager` close function (clears the URL search params).
- In edit mode: a "Save" button in the footer (does not close) and a "Save & close" button (closes on `onSettled` success). Both are disabled when `!isDirty`.
- In create mode: a "Create" button in the footer (which is the same as "Save & close" — it creates and closes on success). The "Create" button is disabled while the form is submitting or invalid.
- Has a "Delete" button (already exists in `ProductModal`; the other two will get one) that opens a `ConfirmationDialog` (a child `<Dialog modal={true}>`).

### `ModalManager`

Updates:
- Reads URL params as before.
- The portal target is provided via the ref-or-context the modal layer shares with `EntityWorkspace` (the contract is "a DOM element inside `EntityWorkspace`"). If the ref is not registered, fall back to `document.body` (degraded behavior; the modal still renders, just at the window level).
- `ModalManager` does **not** itself intercept navigation for the unsaved guard. Interception happens in `MainWindowContent`'s effect (see below), which is where tab-driven navigations originate.
- The URL→Zustand sync is implemented in `MainWindowContent`'s effect (not inside `ModalManager`).

### `MainWindowContent`

Updates:
- Rewrite the active-tab → URL effect. It now:
  1. Calls the previous tab's modal's imperative handle (`getIsDirty()`, `getCreateDraft()`, `getEditDraft()`) and writes the captured values to `useUIStore.tabState[prevTabId]` using the `setTabModal` / `setTabCreateDraft` / `setTabEditDraft` / `setTabIsDirty` actions. If `getIsDirty()` returns `true`, calls `useUnsavedGuard.requestClose()` *before* navigating; only on user confirmation (Discard / Save & close) does the navigation proceed.
  2. Navigates to `/entity/$entityType` with the new tab's search, looked up from `useUIStore.tabState[newTabId]` (using the `entity_modal` + `entity_id` fields). If empty, `search: {}`.
- The portal target lives on `EntityWorkspace` (via the ref-or-context the modal layer shares); `MainWindowContent` does not need to know about it beyond passing it through. (Delivery mechanism — ref vs. context — is deferred to the implementation plan; the spec only requires "anchored to the workspace, not the window".)

### `EntityWorkspace`

Updates:
- Wrap the existing content in a `position: relative` container.
- Provide a `ref` (via context, prop, or store) for the modal portal target.
- (No behavioral change to the data table, tabs, or filters.)

### Migrated consumer dialogs

Each gets a small migration sub-task in the plan:

| Dialog | Shim swap | Unsaved guard | Notes |
|---|---|---|---|
| `LoginModal` | Yes | No (single submit, no draft) | |
| `ProfileModal` | Yes | Yes (2-button; no `onSaveAndClose` because Profile CRUD is not in this spec) | The guard fires on close with unsaved fields. The user must explicitly Save (existing button) or Discard. |
| `PreferencesDialog` | Yes | Yes (3-button, `onSaveAndClose` calls `useSavePreferences().mutate()`) | Real win: today, closing Preferences mid-edit silently discards. |
| `CommandPalette` | Yes | No | No form state. |
| `FilterDialog` | Yes | Yes (2-button) | |
| `ColumnVisibilityDialog` | Yes | Yes (2-button) | |
| `PrintPreviewDialog` | Yes | Yes (2-button) | |
| `ConfirmationDialog` | Yes | No | It's a confirmation, not a data-entry dialog. |

For each migrated dialog, the work is: update the import path (if it changed in the shim rewrite), replace Radix-specific props with Headless UI equivalents (e.g., `onOpenChange` → `onClose`), and (where applicable) wire `useUnsavedGuard`.

## Data Flow

### Tab switch with a dirty modal

```
[User clicks Warehouses tab in the tab bar]
       │
       ▼
[MainWindowContent: activeTabId changes to 'warehouses']
       │
       ▼
[useEffect: captureProductsTabModalState()]
  - calls productsModalRef.current.getIsDirty()     → true
  - calls productsModalRef.current.getEditDraft()   → { company: 'ACME 2', ... }
  - calls useUIStore.setTabModal('products', { entity_modal: 'product', entity_id: 'P1' })
  - calls useUIStore.setTabEditDraft('products', { company: 'ACME 2', ... })
  - calls useUIStore.setTabIsDirty('products', true)
       │
       ▼
[useEffect: useUnsavedGuard.requestClose()]
  - isDirty=true → opens confirm popover (3 buttons in edit mode)
  - user clicks "Discard"
  - onDiscard() runs → no Rust call, just acknowledges
       │
       ▼
[useEffect: navigate({ to: '/entity/warehouses',
                       search: tabState.warehouses.entity_modal
                             ? { entity_modal: ..., entity_id: ... }
                             : {} })]
  - tabState.warehouses has no stored modal → search: {} → URL: /entity/warehouses
       │
       ▼
[ModalManager: reads URL, no entity_modal → returns null]
[Warehouse workspace renders, user can interact with it]
       │
       ▼
[User clicks Products tab]
       │
       ▼
[useEffect: navigate({ to: '/entity/products',
                       search: { entity_modal: 'product', entity_id: 'P1' } })]
  - search is restored from tabState.products
       │
       ▼
[ModalManager: reads URL, entity_modal=product&entity_id=P1 → mounts ProductModal]
[ProductModal reads tabState.products.editDraft via getState() on mount
 → form initial values include 'ACME 2']
```

### Save with optimistic update

```
[User clicks "Save" in edit mode of ProductModal]
       │
       ▼
[ProductModal calls updateProduct.mutate({ id: 'P1', values: { ..., name: 'ACME 3' } })]
       │
       ▼
[onMutate: cancelQueries + snapshot all list queries for 'products'
           setQueriesData → produce → row P1's name field patched to 'ACME 3' (optimistic)]
       │
       ▼
[mutationFn: await commands.update(...) → Rust returns updated Product]
       │
       ▼
[onSuccess: setQueryData(detail key) to fresh data
             invalidateQueries(listFor('products'))  → triggers refetch
             invalidateQueries(stockLevels('product', 'P1'))  → triggers refetch
             toast.success('Product updated')]
       │
       ▼
[onSettled: consumer's callback runs → setIsEditing(false), clearTabEditDraft('products')]
       │
       ▼
[onError path: if commands.update throws,
              roll back from snapshot via setQueryData, toast.error, leave modal open]
```

## Error Handling

- **Mutation errors:** caught in `mutationFn`, rethrown as `Error(result.error)`. `onError` rolls back the cache and shows `toast.error`. The modal stays open in its current state (edit mode still active, dirty draft still in Zustand) so the user can retry.
- **Unsaved-guard dismissal errors:** the guard's `onSaveAndClose` is awaited. If the mutation fails, the guard's popover does not re-open (the mutation's own `toast.error` is sufficient). The modal stays open with `isDirty` still true.
- **URL parse errors:** `ModalManager` is defensive about missing `entity_id` (it already returns `null` in that case). No new error path.
- **Missing portal target:** `ModalManager` falls back to `document.body` if no workspace ref is provided. The modal still renders, just at the window level (degraded behavior; not a crash).

## Testing

Per the architecture guide's "Test Coverage" rule, business logic gets unit tests, components get component tests.

### Unit tests (Vitest)

| File | Coverage |
|---|---|
| `services/entity/__tests__/queryKeys.test.ts` | Snapshot the key shape so refactors don't break invalidation targets. |
| `services/entity/__tests__/queries.test.ts` | Each read hook: `enabled` flag, error throwing, key shape. |
| `services/entity/__tests__/mutations.test.ts` | For each mutation: `onMutate` produces the correct optimistic update; `onError` rolls back from the snapshot; `onSuccess` reconciles (calls `invalidateQueries` with the expected keys, `setQueryData` with the expected value, `toast.success`); `onSettled` callback fires with the right args. Use a `QueryClient` + `QueryClientProvider` test wrapper. Mock `commands.xxx` to return success/error. |
| `hooks/__tests__/use-unsaved-guard.test.ts` | `requestClose` is a no-op when `!isDirty`; prompts when `isDirty`; `onDiscard` is called on confirm; `onSaveAndClose` is called and awaited on "Save & close"; "Keep editing" closes the prompt without calling either. Three-button vs two-button variants render the right number of buttons. |
| `store/__tests__/ui-store.test.ts` | New `tabState` slice: `setTabModal`/`setTabCreateDraft`/`setTabEditDraft`/`setTabIsDirty`/`clearTabState` mutate the right slice and the right tab. |

### Component tests (Vitest + Testing Library)

| File | Coverage |
|---|---|
| `components/modal/__tests__/ModalManager.test.tsx` | URL → modal mapping for all six `ModalTypes`. Tab switch with a dirty draft: the unsaved-guard prompt fires and the URL does not change until the user confirms. Tab switch without a dirty draft: URL changes immediately. Modal close clears the URL search params. |
| `components/entity/__tests__/ProductModal.test.tsx` | Submit triggers the mutation; modal closes on `onSettled` success; error path keeps modal open. Edit mode: `Save` stays open, `Save & close` closes on success. |
| `components/entity/__tests__/VariantModal.test.tsx` | Same shape as ProductModal tests. |
| `components/entity/__tests__/WarehouseModal.test.tsx` | Same shape. |
| `components/entity/__tests__/FilterDialog.test.tsx` | Closing with a staged draft prompts. |
| `components/entity/__tests__/ColumnVisibilityDialog.test.tsx` | Same. |
| `components/entity/__tests__/PrintPreviewDialog.test.tsx` | Same. |
| `components/preferences/__tests__/PreferencesDialog.test.tsx` | Closing with unsaved preferences prompts. "Save & close" calls `useSavePreferences().mutate()` and closes on success. |

### What we explicitly do not add (YAGNI)

- E2E/Playwright tests (no suite today).
- Snapshot tests of styled components.
- Visual regression tests.
- Performance benchmarks for the optimistic updates (the row counts are small; not worth the test infra).

## Files

### New

- `src/services/entity/queryKeys.ts`
- `src/services/entity/queries.ts`
- `src/services/entity/mutations.ts`
- `src/services/entity/types.ts` (shared types: `ProductUpdateValues`, etc.)
- `src/services/entity/__tests__/queryKeys.test.ts`
- `src/services/entity/__tests__/queries.test.ts`
- `src/services/entity/__tests__/mutations.test.ts`
- `src/hooks/use-unsaved-guard.ts`
- `src/hooks/__tests__/use-unsaved-guard.test.ts`
- `docs/superpowers/specs/2026-06-09-integrated-entity-modals-design.md` (this file)

### Modified

- `src/components/ui/dialog.tsx` — full rewrite on Headless UI primitives
- `src/components/modal/ModalManager.tsx` — per-tab state handling, unsaved guard integration, portal target
- `src/components/entity/ProductModal.tsx` — migration to mutation hooks, X button, unsaved guard, `modal={false}`
- `src/components/entity/VariantModal.tsx` — same shape
- `src/components/entity/WarehouseModal.tsx` — same shape
- `src/components/layout/MainWindowContent.tsx` — rewrite tab→URL effect, capture/restore per-tab state
- `src/components/entity/EntityWorkspace.tsx` — `position: relative` wrapper, portal target ref
- `src/store/ui-store.ts` — add `tabState` slice, selectors, actions
- `src/store/__tests__/ui-store.test.ts` — new tests for the slice
- `src/components/entity/FilterDialog.tsx` — shim swap + unsaved guard
- `src/components/entity/ColumnVisibilityDialog.tsx` — shim swap + unsaved guard
- `src/components/entity/PrintPreviewDialog.tsx` — shim swap + unsaved guard
- `src/components/entity/ConfirmationDialog.tsx` — shim swap only
- `src/components/auth/LoginModal.tsx` — shim swap only
- `src/components/auth/ProfileModal.tsx` — shim swap + unsaved guard with stubbed `onSaveAndClose`
- `src/components/preferences/PreferencesDialog.tsx` — shim swap + unsaved guard wired to `useSavePreferences`
- `src/components/ui/command.tsx` — shim swap only (CommandPalette)
- `package.json` — add `@headlessui/react` and `immer`

### Not modified

- Rust commands, route definitions, `ModalTypes` enum, sidebar, navbar, tab bar.
- `services/preferences.ts` (the `useSavePreferences` hook stays as-is; only its consumer changes).
- `ProductForm`, `VariantForm`, `WarehouseForm` (they keep their current `onSubmit` / `isLoading` / `initialValues` / `schema` API; only the parent wiring changes).
- Other Zustand stores, the Rust backend, the Tauri config.

## Open Questions for Implementation

These are deferred to the implementation plan / execution; not blocking the spec:

1. **Portal target delivery.** Ref via prop drilling, context, or store. The spec requires "anchored to the workspace"; the exact mechanism is an implementation detail.
2. **Radix UI version compatibility.** Verify that `package.json`'s other Radix-based components (`popover`, `dropdown-menu`, `select`, `tabs`) don't share code with `ui/dialog.tsx` after the rewrite. If they do, the shim needs to be split into `ui/dialog.tsx` (Headless UI) and keep the Radix internals in a separate file.
3. **Per-tab modal ref storage.** The `useImperativeHandle` refs for the entity modals need to be reachable by `MainWindowContent` (for navigation-time reads) without triggering re-renders. Options: a non-Zustand module-level `Map<TabId, ModalHandle>` (simplest), a `useRef` in a context provider above `MainWindowContent`, or a Zustand-stored object of refs (works but mixes serializable state with mutable refs — the architecture guide warns against this). Decide at implementation time.
4. **Translate the new strings.** "Discard unsaved changes?", "Keep editing", "Save & close", "Discard", "Save your changes?", and the per-entity body strings ("Your edits to *{name}* haven't been saved.") need i18n keys in all locale files.
