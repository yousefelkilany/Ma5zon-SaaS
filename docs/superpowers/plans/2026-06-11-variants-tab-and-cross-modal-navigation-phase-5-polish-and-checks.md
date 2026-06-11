# Phase 5: Polish & Final Checks

**Goal:** Document the modal-stack convention. Run the full quality gate. Perform manual smoke checks.

**Why last:** the system is functionally complete; this phase is the final polish and verification.

## Verification at end of phase

```bash
pnpm run check:all
```

Expected: all green (typecheck, lint, ast:lint, format:check, rust:fmt:check, rust:clippy, test:run, rust:test).

---

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

If `format:check` fails, run `pnpm run format` and re-stage. If `lint` fails, run `pnpm run lint:fix` and re-stage.

- [ ] **Step 2: Manual smoke**

The implementer should perform at least these smoke checks on the dev build (or report them to the user to verify):

- Open a product modal → click a variant name in the new `variants` tab → variant modal opens. Click X → product modal returns.
- Open a product modal's `stock` tab → click a warehouse column header → warehouse modal opens. X returns to product modal.
- Open a variant modal → click the parent product name in details → product modal opens. X returns to variant modal.
- Refresh with 2 tabs open → browser confirms. Refresh with 1 tab + no modals → no prompt.
- Click the same variant name twice in a row → no double-modal (dedupe).

- [ ] **Step 3: Commit any format/lint fixes**

```bash
git add -A
git commit -m "chore: apply format and lint fixes"
```

(Only if step 1 produced changes.)
