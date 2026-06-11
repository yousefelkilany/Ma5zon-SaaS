# Variants Tab & Cross-Modal Navigation Design Specification

## Status

- Draft
- Date: 2026-06-11

## Overview

Add a new `variants` tab to the product detail modal that lists the product's variants with total stock and prices (same content as the existing expanded-row `VariantsSubTable`). Replace the URL-driven modal opening pattern with a per-tab modal stack in the workspace store, and make variant / warehouse / product names clickable across the relevant modal tabs to navigate between modals. Move per-tab draft state (currently mis-keyed by entity type in `useUIStore.tabState`) into the per-tab-uuid slice of `useTabStore.tabUIStates` to fix a naming/structural inconsistency.

## Motivation

1. **No first-class variants view in the product modal.** Users have to expand a row in the products list to see variants. A dedicated tab inside the product modal gives quick access without changing list context.
2. **No cross-modal navigation.** Once a user is in a modal, they cannot follow a reference (variant ↔ product, warehouse ↔ product) without manually closing, returning to the list, and finding the target. Clickable names fix this.
3. **Stuck at one modal deep.** The current URL-driven model encodes a single modal in the URL. Opening a linked modal overwrites the URL; the only way back is to close and lose the origin. A stack preserves navigation history.
4. **Inconsistent per-tab state keying.** `useUIStore.tabState` is keyed by `EntityType` (despite its `setTab*` function names) and lives in a separate store from `useTabStore`. Per-tab UI state should live in one place keyed by tab uuid.

## Goals / Non-Goals

**Goals**

- Add a `variants` tab to `ProductModal` showing all variants of that product with the same columns as `VariantsSubTable`.
- Make variant names, warehouse names, and product names clickable inside modal tabs, opening the appropriate detail modal.
- Stack modals so the X button (and "back") returns to the previous modal; per-tab, the stack is independent.
- Move the existing per-tab draft state (`createDraft`, `editDraft`, `isDirty`) from `useUIStore.tabState[entityType]` to `useTabStore.tabUIStates[tabId]`, then delete the legacy `useUIStore.tabState` slice.
- Prevent accidental page unload (refresh / close) when the user has a non-trivial navigation history open (more than one route across all tabs and stacks).
- Preserve the 1-entity-type-to-1-tab invariant (current behavior) while making the underlying keying future-proof.

**Non-goals**

- Browser-history-driven back/forward for modals (we only stack internally; browser back is not wired).
- Sharing/reproducing a deep modal stack via URL (the URL still represents the active tab's underlying route, not its modal stack).
- Any change to the existing whole-row click behavior of `VariantsSubTable` / `WarehousesSubTable` in expanded product / warehouse list rows.
- Visual / i18n changes to the modal chrome itself.

## Architecture

### Modal frame shape

A "modal frame" is a record describing one open modal in a stack:

```ts
type ModalFrame = {
  entity_modal: ModalType      // 'product' | 'variant' | 'warehouse'
                                // | 'create-product' | 'create-warehouse' | 'create-variant'
  entity_id: string | null     // the id of the entity this modal is ABOUT
                                // (= variant id for VariantModal, etc.)
                                // null for create-* modals
  product_id?: string          // the id of the parent product, when the modal
                                // was opened from a context that knows it
                                // (e.g. variant modal opened from a product modal;
                                // create-variant modal whose target product is known)
}
```

Conventions:

- `entity_id` is always the id of the entity the modal is *about*.
- `product_id` is set when there is a parent-product relationship the modal needs to know about.
- For `create-variant`: `entity_id: null`, `product_id: <parentProductId>`. (Replaces the current code that reuses `entity_id` to carry the parent product id — a clarification, not a behavior change for view modals.)

### Per-tab modal stack in workspace store

Stack lives in `useTabStore.tabUIStates[tabId]`, alongside the existing per-tab UI state (`expandedIds`, `selectedIds`, etc.). Each tab gets its own stack; the active tab's stack top is what `ModalManager` renders.

**File:** `src/store/workspace-store.ts`

`TabUIState` (line 17-34) extended with:

```ts
modalStack: ModalFrame[]
createDraft?: Record<string, unknown>
editDraft?: Record<string, unknown>
isDirty: boolean
```

`WorkspaceState` (line 53-81) extended with actions:

- `pushModal(frame: ModalFrame)`: no-op if `frame` is shallow-equal to `modalStack[modalStack.length - 1]`. Otherwise push onto the active tab's stack.
- `popModal()`: pop the top of the active tab's stack. No-op if empty.
- `clearModalStack()`: empty the active tab's stack.
- `setCreateDraft(draft)`, `setEditDraft(draft)`, `setIsDirty(dirty)`, `clearTabDrafts()`: write to the active tab's slice (replacing the current `useUIStore.setTabCreateDraft(entityType, ...)` shape but with `tabId` implicit from `activeTabId`).

`removeTab(tabId)` already wipes `tabUIStates[tabId]` (line 115) — the stack goes with it. No change needed there.

### Modal stack dedupe

`pushModal` first checks if the stack is non-empty AND the top frame is shallow-equal to the incoming frame (all fields compared; `product_id` and `entity_id` compared as-is, treating `null` and `undefined` as distinct from each other and from empty string). If equal, the call is a no-op. On an empty stack, the frame is always pushed. Implemented inside the action so every caller benefits without re-implementing the check.

### Browser unload guard

**File:** `src/components/modal/UnloadGuard.tsx` (new, mounted in `MainWindowContent` next to `ModalManager`)

The guard triggers the browser's native "Leave site?" dialog when the user has navigation history open beyond the bare app shell. The trigger predicate is:

```
shouldGuard = (tabs.length > 1) || (any tab has modalStack.length > 0)
```

(The dashboard tab is always present, so the bare state is exactly `tabs.length === 1` AND every `modalStack` empty — i.e. `shouldGuard === false`.)

When `shouldGuard` is `true`, attach a `beforeunload` listener that calls `event.preventDefault()`. When `shouldGuard` is `false`, remove the listener.

The component subscribes to `useTabStore` via two narrow selectors (one for `tabs.length`, one for the list of `modalStack.length` values across tabs) inside a `useEffect` whose dependency array includes both. The effect re-evaluates the predicate and installs/uninstalls the listener accordingly. The component renders nothing.

`ModalManager` is the natural mount point; the guard can live in the same file or its own file. Implementation detail.

### EntityNameLink component

**File:** `src/components/entity/EntityNameLink.tsx` (new)

A small, reusable clickable text component:

```ts
interface EntityNameLinkProps {
  kind: 'product' | 'variant' | 'warehouse'
  id: string
  productId?: string         // only used when kind='variant'; the hook ignores
                             // it for other kinds
  className?: string
  children: React.ReactNode
}
```

Renders a `<button type="button">` with `text-secondary cursor-pointer hover:underline` (matches the existing secondary-color accent used for "add variant" and similar affordances). `onClick` reads `useOpenEntityModal()` from the hook and calls the matching `open*` method. The button swallows the click event so it doesn't propagate to a parent row-click handler.

### useOpenEntityModal hook

**File:** `src/hooks/use-open-entity-modal.ts` (new)

```ts
export function useOpenEntityModal() {
  const pushModal = useTabStore(s => s.pushModal)
  return {
    openProduct: (id: string) =>
      pushModal({ entity_modal: 'product', entity_id: id }),
    openVariant: (id: string, productId?: string) =>
      pushModal({ entity_modal: 'variant', entity_id: id, product_id: productId }),
    openWarehouse: (id: string) =>
      pushModal({ entity_modal: 'warehouse', entity_id: id }),
    openCreateProduct: () =>
      pushModal({ entity_modal: 'create-product', entity_id: null }),
    openCreateWarehouse: () =>
      pushModal({ entity_modal: 'create-warehouse', entity_id: null }),
    openCreateVariant: (productId: string) =>
      pushModal({ entity_modal: 'create-variant', entity_id: null, product_id: productId }),
  }
}
```

Callers (4 tables/tabs, the entity workspace, and the search dropdown) replace direct `navigate({to: '/entity/$entityType', search: {...}})` calls with these.

### Removal of useUIStore tab-state slice

**File:** `src/store/ui-store.ts`

Delete the following symbols (all of which are mis-named — the parameter is `EntityType` not a tab id):

- `TabModalState` interface
- `TabStateSlice` type
- `EntityTabKey` type
- `setTabModal`
- `setTabCreateDraft`
- `setTabEditDraft`
- `setTabIsDirty`
- `clearTabState`
- `clearAllTabState`
- `tabState` field

Kept in `useUIStore`: `isAppReady`, `sidebarVisible`, `commandPaletteOpen`, `preferencesOpen`, `lastQuickPaneEntry`, `userPreferences`, `interceptedNavigation`, and their setters. `interceptedNavigation` already references `targetTabId` directly and is correct.

### Tab-switch guard refactor

**File:** `src/lib/utils/tab-switch-guard.ts`

Change signature from

```ts
shouldInterceptTabSwitch(tabState: TabStateSlice, currentTab: Tab | undefined): boolean
```

to

```ts
shouldInterceptTabSwitch(
  tabUIState: TabUIState | undefined,
  currentTab: Tab | undefined,
): boolean
```

Check `tabUIState?.isDirty === true` directly. Re-export nothing from `ui-store`. The `currentTab` parameter is kept for symmetry and future use (e.g. warning text); the active tab's `tabUIState` is the only data needed for the decision.

## Data Flow

### Opening a modal from a click

1. User clicks `<EntityNameLink kind="variant" id={v1} productId={p1} />`.
2. Component calls `useOpenEntityModal().openVariant(v1, p1)`.
3. Hook calls `useTabStore.getState().pushModal({ entity_modal: 'variant', entity_id: v1, product_id: p1 })`.
4. Store action: if the stack is non-empty AND the top frame is shallow-equal to the incoming frame, no-op. Otherwise push.
5. `ModalManager` subscribes to `useTabStore`. New top frame → re-renders with the variant modal.
6. If the frame was deduped, nothing re-renders. ✓

### Closing a modal (X button)

1. `ModalManager`'s onClose handler calls `useTabStore.getState().popModal()`.
2. Store pops the top frame.
3. If new top is undefined → no modal rendered.
4. If new top is a frame → ModalManager renders that modal.
5. No URL navigation occurs. The underlying tab's route is unchanged.

### Switching tabs with non-empty stack

1. User clicks another tab in the tab bar.
2. `TabBar.handleTabClick` checks `shouldInterceptTabSwitch(activeTabUIState, currentTab)`.
3. If dirty → show "unsaved changes" dialog (`interceptedNavigation`).
4. If not dirty → `setActiveTab(newTabId)`. `ModalManager` re-reads the new active tab's `modalStack` and renders the new tab's top frame (or nothing).
5. Returning to the original tab: its `tabUIState` is preserved in the store, so its stack is intact. ✓

### Page unload (refresh / close)

1. `UnloadGuard` effect runs whenever `tabs.length` or any `tabUIStates[t].modalStack` changes.
2. Computes `shouldGuard = (tabs.length > 1) || (any tab has modalStack.length > 0)`.
3. If `true`, registers `beforeunload` → `event.preventDefault()`. Browser shows its confirmation dialog.
4. If `false`, removes the listener. No dialog.

## Components

### 1. New `variants` tab in `ProductModal`

**File:** `src/components/entity/ProductModal.tsx`

- `EntityModalTabs` constant order becomes `['details', 'variants', 'stock', 'audits', 'insights']`.
- The new tab renders a shared `<VariantsListForProduct productId={entityId} />` (see §3 below) with `onVariantClick` set to `useOpenEntityModal().openVariant` (so the click target inside the new tab uses the same open behavior as the existing sub-table).
- The "Add Variant" header button still works the same way via the existing `onAddVariant` callback wired from `EntityWorkspace`.

### 2. New `VariantsListForProduct` component (shared)

**File:** `src/components/entity/VariantsListForProduct.tsx` (new)

Encapsulates the body of the existing `VariantsSubTable` (query + columns from `getEntityLayout('variant', t)` + table markup + add-variant header button + empty state). Exposes two click callbacks:

- `onVariantClick?(variantId, productId)` — used by the existing sub-table to open the variant modal on whole-row click.
- `onAddVariant?(productId)` — same as today.

**File:** `src/components/entity/VariantsListForProduct.tsx`

```ts
type VariantsListMode = 'whole-row' | 'name-only'

interface VariantsListForProductProps {
  productId: string
  mode: VariantsListMode
  onVariantClick?: (variantId: string, productId: string) => void
  onAddVariant?: (productId: string) => void
}
```

- `mode='whole-row'`: existing behavior, used by `VariantsSubTable`. `<tr>` is clickable; the variant name cell is plain text.
- `mode='name-only'`: used by the new modal tab. The variant name cell is an `<EntityNameLink kind="variant" id={variant.id} productId={productId}>`. The row has no `onClick`.

`VariantsSubTable` is refactored to be a thin wrapper that renders `<VariantsListForProduct mode="whole-row" ... />`. No visual change to the expanded sub-table.

### 3. StockLevelsTable cross-links

**File:** `src/components/entity/StockLevelsTable.tsx`

- `ProductStockPivot` (lines 164-333):
  - Header row, each warehouse column `<th>` (line 251-258): wrap warehouse name in `<EntityNameLink kind="warehouse" id={wId}>`.
  - Body row, variant name `<td>` (line 269): wrap in `<EntityNameLink kind="variant" id={row.variantId}>` (the parent product is the current product, available from props/context; if the current component doesn't know it, fall back to passing no `productId` — the link will still work, the variant modal just won't have the parent product highlighted).
  - To keep the product id available, `StockLevelsTable` is updated so the parent product id is passed down from the modal that uses it. The simplest way: read it from `useTabStore.activeTabId` indirectly via context, or accept an optional `productId` prop on `StockLevelsTable` and pass it through to the pivot. The cleanest fix: `StockLevelsTable` accepts an optional `productId` prop; the product modal passes `productId={entityId}`; the variant modal does not pass it.
- `VariantStockView` (lines 92-162):
  - Each warehouse name `<td>` (line 124-127) becomes `<EntityNameLink kind="warehouse" id={level.warehouse_id}>`.

The `swap_horiz` transfer button on the same cells stays as-is. Click events on `<EntityNameLink>` call `e.stopPropagation()` to prevent the future possibility of a parent row click handler from firing.

### 4. VariantModal product link

**File:** `src/components/entity/VariantModal.tsx`

In the `details` tab, the parent product's name is rendered as an `<EntityNameLink kind="product" id={productId}>`. The product id is available from the modal frame's `product_id`. If `product_id` is not set on the frame (e.g. the user opened the variant modal from the search dropdown without product context), fall back to fetching it from the variant data — the underlying `variantsGet*` query already returns `product_id` per the recent data-seeding refactor (commit `5ddb75e`).

Concrete change: `VariantModal` reads its frame from the store, extracts `product_id`, and uses it for the link. If absent, falls back to the variant query's `product_id` field.

A new tiny hook `useCurrentModalFrame()` in `src/hooks/use-current-modal-frame.ts` returns the top frame of the active tab's stack (or `null`):

```ts
export function useCurrentModalFrame(): ModalFrame | null {
  return useTabStore(state => {
    const stack = state.tabUIStates[state.activeTabId]?.modalStack
    return stack && stack.length > 0 ? stack[stack.length - 1] : null
  })
}
```

`ModalManager` and the three detail modals can both use this hook instead of each maintaining their own selector. The hook is a thin read-only view of the store; the modals don't write through it.

### 5. EntityWorkspace click handlers

**File:** `src/components/entity/EntityWorkspace.tsx`

Replace `navigate({to: '/entity/$entityType', search: {...}})` calls with `pushModal(...)` calls:

- `handleProductClick(productId)` → `pushModal({ entity_modal: 'product', entity_id: productId })`.
- `handleVariantClick(variantId, productId)` → `pushModal({ entity_modal: 'variant', entity_id: variantId, product_id: productId })`. (Previously dropped the productId; now preserved.)
- `handleAddVariant(productId)` → `pushModal({ entity_modal: 'create-variant', entity_id: null, product_id: productId })`.
- Add-handler for new entity (`create-product`, `create-warehouse`) → `pushModal({ entity_modal: 'create-product', entity_id: null })` etc.

The `useOpenEntityModal` hook can wrap these, or the workspace can call `pushModal` directly. Decision: call `pushModal` directly here (the workspace is a thin layer; the hook is for components rendered inside modals/tables that don't otherwise have store access).

### 6. ModalManager refactor

**File:** `src/components/modal/ModalManager.tsx`

- Stop reading `entity_modal`/`entity_id`/`product_id` from `useLocation().search`.
- Subscribe to `useTabStore` and read `activeTabId` + `tabUIStates[activeTabId]?.modalStack`. The top frame is `modalStack[modalStack.length - 1]`.
- Render the appropriate `<ProductModal>` / `<VariantModal>` / `<WarehouseModal>` (or create variants) based on `frame.entity_modal`, passing `entityId={frame.entity_id}` and (for variant) `productId={frame.product_id}`.
- The onClose handler calls `useTabStore.getState().popModal()`.
- No URL navigation.

### 7. MainWindowContent cleanup

**File:** `src/components/layout/MainWindowContent.tsx`

- Delete the `useEffect` at lines 36-90 (URL capture → entityType store → re-navigate). Its job is now done by `ModalManager` reading the store directly.
- Delete imports of `useNavigate`, `useLocation`, `useUIStore` (only those used by the deleted effect and the dead code).
- Mount `<UnloadGuard />` next to `<ModalManager />` (or co-locate it inside `ModalManager.tsx` — see Implementation).

### 8. TabBar / tab-switch-guard refactor

**File:** `src/components/layout/TabBar.tsx`

- Replace `useUIStore.getState().clearTabState(currentEntityType)` (line 41) with `useTabStore.getState().clearTabDrafts()`.
- Replace `tabState` selector (line 17) with a selector that reads the active tab's `tabUIState` from `useTabStore`:
  ```ts
  const activeTabUIState = useTabStore(state =>
    state.tabUIStates[state.activeTabId] ?? defaultUIState,
  )
  ```
- Pass `activeTabUIState` (instead of `tabState`) to `shouldInterceptTabSwitch`.

**File:** `src/lib/utils/tab-switch-guard.ts`

- New signature as in §"Tab-switch guard refactor" above.
- Remove the `EntityTabKey` / `TabStateSlice` exports.

### 9. ProductModal / VariantModal / WarehouseModal draft actions

**Files:**
- `src/components/entity/ProductModal.tsx`
- `src/components/entity/VariantModal.tsx`
- `src/components/entity/WarehouseModal.tsx`

Replace all `useUIStore.getState().setTabCreateDraft(entityType, ...)` calls (and the `setTabEditDraft` / `setTabIsDirty` / `clearTabState` calls in the same files) with `useTabStore.getState().setCreateDraft(...)` / `.setEditDraft(...)` / `.setIsDirty(...)` / `.clearTabDrafts()`. The new actions take the draft as their single argument and read `activeTabId` internally — the modal does not need to look up the tab id itself. ✓

Remove imports of the deleted `useUIStore` functions.

### 10. SearchDropdown refactor

**File:** `src/components/layout/search/SearchDropdown.tsx`

Replace the `navigate({to: '/entity/$entityType', search: {entity_modal, entity_id, product_id}})` calls (lines 47-74) with `pushModal({ entity_modal, entity_id, product_id? })`. Keep the existing `product_id` for variant hits (it points to the parent product for context).

## Error Handling

| Case | Behavior |
|---|---|
| Click a name whose target entity was deleted | `ProductModal` / `VariantModal` / `WarehouseModal` already render `<EntityMissingState />` when the underlying query returns no record. No new error UI needed. |
| `pushModal` called with a frame identical to the current top | No-op (dedupe). Implemented inside the action. |
| Stack reaches very deep (e.g. 20+ modals) | Unbounded by design. Not a realistic concern; navigation becomes confusing long before memory is an issue. |
| Tab closed with non-empty stack | `removeTab(tabId)` already wipes `tabUIStates[tabId]`; stack is gone. ✓ |
| Tab switched with non-empty stack | Stack preserved per tab. ✓ |
| Page reload with `totalOpenRoutes > 1` | Browser's native "Leave site?" dialog via `beforeunload`. |
| Page reload with `totalOpenRoutes ≤ 1` | No dialog. |
| `beforeunload` on Tauri webview | The same `beforeunload` event fires in Tauri WebView; behavior is portable. No additional Tauri integration needed. |
| Browser back/forward (in regular browser) | Out of scope. Not wired. Browser back may leave the app, matching today's behavior with the URL-driven modals. |

## Testing

### Store tests

**File:** `src/store/workspace-store.test.ts`

- Add: `pushModal` appends, `popModal` removes top, `popModal` no-op on empty.
- Add: `pushModal` no-op when top is shallow-equal to incoming frame.
- Add: `pushModal` pushes when the new frame differs from the top (e.g. different `entity_id`).
- Add: stacks are isolated per tab.
- Add: `removeTab(tabId)` wipes the tab's `modalStack`.
- Add: migrated `setCreateDraft` / `setEditDraft` / `setIsDirty` / `clearTabDrafts` write to the active tab.
- Delete the parts of the old test file that asserted the removed `useUIStore.tabState` functions (those move here).
- The existing `ui-store.test.ts` is updated to remove the deleted-test cases; remaining UI-store tests (preferences, command palette, etc.) stay.

### Hook / component tests

**File:** `src/hooks/__tests__/use-open-entity-modal.test.ts` (new)

- `openProduct(id)` calls `pushModal({ entity_modal: 'product', entity_id: id })`.
- `openVariant(id, productId)` includes `product_id` when provided.
- `openVariant(id)` without `productId` does not set `product_id`.
- `openCreateVariant(productId)` sets `entity_id: null` and `product_id: <id>`.

**File:** `src/components/entity/__tests__/EntityNameLink.test.tsx` (new)

- Renders children.
- Click invokes the correct `useOpenEntityModal` method for `kind`.
- `stopPropagation` is called on the click event.

**File:** `src/components/modal/__tests__/ModalManager.test.tsx` (updated)

- Existing URL-search-param tests are removed; new tests render the manager with a controlled `useTabStore` state.
- Top frame of type `product` renders `<ProductModal>` with the right `entityId`.
- Empty stack renders nothing.
- X button on the rendered modal calls `popModal`.

**File:** `src/components/entity/__tests__/ProductModal.test.tsx` (updated)

- The new `variants` tab is present in the tab list and renders `VariantsListForProduct`.
- Existing draft-action tests are updated to mock the new `useTabStore` actions.

**File:** `src/components/entity/__tests__/VariantModal.test.tsx` (updated)

- The parent product name in the details tab is an `EntityNameLink` with `kind='product'`.
- Existing draft-action tests are updated.

**File:** `src/components/entity/__tests__/WarehouseModal.test.tsx` (updated)

- Existing draft-action tests are updated.

**File:** `src/components/entity/__tests__/VariantsListForProduct.test.tsx` (new)

- `mode='whole-row'`: row click calls `onVariantClick`; name cell is plain text.
- `mode='name-only'`: name cell is an `EntityNameLink`; row has no `onClick`.
- Both modes render the add-variant button when `onAddVariant` is provided.

**File:** `src/lib/utils/__tests__/tab-switch-guard.test.ts` (updated if it exists, or new)

- `shouldInterceptTabSwitch` returns `true` when `isDirty === true`.
- Returns `false` when `isDirty` is missing or `false`.
- Works with the new `TabUIState` shape (not the deleted `TabStateSlice`).

### Manual / smoke

- Open a product modal, click a variant name in the new `variants` tab → variant modal opens. Click X → product modal returns.
- Open a product modal's `stock` tab, click a warehouse column header → warehouse modal opens. X returns to product modal.
- In a variant modal, click the parent product name in details → product modal opens. X returns to variant modal.
- Refresh the page with 2 tabs open → browser asks to confirm. Refresh with 1 tab and no modal → no prompt.
- Open the same variant modal twice in a row from two different cells → second click is a no-op (no double-modal).
- Switch to a different tab and back to the original → its modal stack is intact.

## Migration / Cleanup

- `useUIStore` is trimmed (see §"Removal of useUIStore tab-state slice"). All callers are updated.
- The `entity_modal` / `entity_id` / `product_id` URL search params are no longer read by the app. They may still appear in the URL during this transition. A follow-up cleanup PR can strip them from the router schema if desired — **not in scope for this spec**.
- `MainWindowContent` no longer calls `navigate` from its effect. The `useNavigate` / `useLocation` imports for that purpose go away.
- `EntityWorkspace.handleVariantClick` previously dropped `productId`; this spec preserves it. Any existing call that relied on the previous behavior continues to work (the variant modal just now also has the parent product available for the cross-link).

## Future Work (Out of Scope)

- Browser back/forward wiring for the modal stack.
- The "1 entity type = 1 tab" invariant is enforced by convention in `SideBar.handleEntityClick` (line 133). The new keying (tab uuid) is robust to a future relaxation of this invariant, but the invariant itself is not formalized into a runtime check. A follow-up could add a guard in `addTab` that returns the existing tab's id when the entity type is already open.
- Persisting the modal stack across page reloads (today, in-memory only).
- URL serialization of the active tab's modal frame for shareable links.
- Cross-linking in the `audits` / `insights` tabs (today the audits tab in `StockMovementsTable` also has plain product/variant/warehouse names; making those clickable is a natural follow-up).
