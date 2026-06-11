# Variants Tab & Cross-Modal Navigation — Plan Index

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `variants` tab to the product detail modal, make entity names clickable across modal tabs to navigate between modals, replace URL-driven modal opening with a per-tab modal stack, and move per-tab draft state from `useUIStore.tabState[entityType]` to `useTabStore.tabUIStates[tabId]`.

**Architecture:** Modal state lives in a per-tab `modalStack: ModalFrame[]` array in `useTabStore.tabUIStates[tabId]`. `ModalManager` reads the active tab's stack top, renders the right modal, and pops on close. `EntityNameLink` is a small reusable button-component that pushes a modal frame via `useOpenEntityModal`. Existing call sites (entity workspace, search dropdown) switch from `navigate({...})` to `pushModal({...})`. The mis-keyed `useUIStore.tabState[entityType]` draft slice is deleted; drafts move to the tab-uuid-keyed `useTabStore.tabUIStates[tabId]`.

**Tech Stack:** React 19, TanStack Router, TanStack Query, Zustand v5, Vitest, Testing Library, TypeScript, Tauri v2. No new external dependencies.

**Spec:** `docs/superpowers/specs/2026-06-11-variants-tab-and-cross-modal-navigation-design.md`

## Phase Index

The work is split into 5 phases. Execute them in order. Each phase ends with a commit and a passing `pnpm run check:all` (or, for early phases, `pnpm run typecheck && pnpm run test:run`).

| # | Phase | Tasks | File |
|---|---|---|---|
| 1 | Store Foundation | 4 | [`2026-06-11-variants-tab-and-cross-modal-navigation-phase-1-store-foundation.md`](./2026-06-11-variants-tab-and-cross-modal-navigation-phase-1-store-foundation.md) |
| 2 | Stack-Driven ModalManager + Unload Guard | 5 | [`2026-06-11-variants-tab-and-cross-modal-navigation-phase-2-modalmanager-unload-guard.md`](./2026-06-11-variants-tab-and-cross-modal-navigation-phase-2-modalmanager-unload-guard.md) |
| 3 | Open via Hook + Delete `useUIStore.tabState` | 6 | [`2026-06-11-variants-tab-and-cross-modal-navigation-phase-3-open-via-hook-delete-uistate.md`](./2026-06-11-variants-tab-and-cross-modal-navigation-phase-3-open-via-hook-delete-uistate.md) |
| 4 | Cross-Link UI | 5 | [`2026-06-11-variants-tab-and-cross-modal-navigation-phase-4-cross-link-ui.md`](./2026-06-11-variants-tab-and-cross-modal-navigation-phase-4-cross-link-ui.md) |
| 5 | Polish & Final Checks | 2 | [`2026-06-11-variants-tab-and-cross-modal-navigation-phase-5-polish-and-checks.md`](./2026-06-11-variants-tab-and-cross-modal-navigation-phase-5-polish-and-checks.md) |

## Why this order

- **Phase 1** is pure store work. The new fields and actions exist but nothing calls them yet; the deleted slice still has all its callers. Tests for the new actions live alongside, so the store has a complete test surface before any UI consumes it.
- **Phase 2** makes the store the source of truth for modals. `ModalManager` now reads from the stack. URL params still *drive* the stack via the existing effect in `MainWindowContent`, so every existing call site still works through the URL. `UnloadGuard` is added.
- **Phase 3** is the migration. `EntityWorkspace` and `SearchDropdown` call `pushModal` directly. Draft writes move to `useTabStore`. Then the `useUIStore.tabState` slice and its tests are deleted. End state: store is fully authoritative.
- **Phase 4** is the visible cross-linking. `EntityNameLink` is added and applied in the stock tabs, the new `variants` tab, and the variant details. The variants sub-table is refactored into a shared `VariantsListForProduct` so the new tab and the existing sub-table share code.
- **Phase 5** adds developer docs and runs the full quality gate.

## Self-Review (full plan)

**Spec coverage** — every spec section maps to a task in one of the five phases:

| Spec section | Phase / Task |
|---|---|
| Modal frame shape | Phase 1 / Task 1.1 |
| Per-tab stack in workspace store | Phase 1 / Tasks 1.2, 1.3, 1.4 |
| Modal stack dedupe | Phase 1 / Tasks 1.3, 1.4 |
| Browser unload guard | Phase 2 / Task 2.4 |
| `useCurrentModalFrame` | Phase 2 / Task 2.1 |
| `useOpenEntityModal` | Phase 3 / Task 3.1 |
| `EntityNameLink` | Phase 4 / Task 4.1 |
| New `variants` tab in ProductModal | Phase 4 / Task 4.3 |
| `VariantsListForProduct` shared component | Phase 4 / Task 4.2 |
| `StockLevelsTable` cross-links (pivot + variant view) | Phase 4 / Task 4.4 |
| `VariantModal` parent product link | Phase 4 / Task 4.5 |
| Migrate `EntityWorkspace` to `pushModal` | Phase 3 / Task 3.2 |
| Migrate `SearchDropdown` to `pushModal` | Phase 3 / Task 3.3 |
| Migrate `tab-switch-guard` | Phase 3 / Task 3.4 |
| Migrate modal draft writes | Phase 3 / Task 3.5 |
| Delete `useUIStore.tabState` slice | Phase 3 / Task 3.6 |
| ModalManager reads from store | Phase 2 / Task 2.2 |
| ModalManager tests rewritten | Phase 2 / Task 2.5 |
| `create-variant` uses `product_id` | Phase 2 / Task 2.2 |
| Developer docs | Phase 5 / Task 5.1 |
| Quality gates | Phase 5 / Task 5.2 |

**Placeholder scan:** no TBDs; no "implement later"; all code blocks are concrete; no "similar to task N" without restating.

**Type consistency:** `ModalFrame` shape, action names (`pushModal` / `popModal` / `clearModalStack` / `setCreateDraft` / `setEditDraft` / `setIsDirty` / `clearTabDrafts`), and `EntityNameLink` props (`kind` / `id` / `productId` / `children` / `className`) are consistent across all phases.

## File Map (full plan)

### New files

- `src/lib/types/modal-frame.ts`
- `src/hooks/use-open-entity-modal.ts`
- `src/hooks/use-current-modal-frame.ts`
- `src/components/entity/EntityNameLink.tsx`
- `src/components/entity/VariantsListForProduct.tsx`
- `src/components/modal/UnloadGuard.tsx`
- `src/hooks/__tests__/use-open-entity-modal.test.ts`
- `src/hooks/__tests__/use-current-modal-frame.test.tsx`
- `src/components/entity/__tests__/EntityNameLink.test.tsx`
- `src/components/entity/__tests__/VariantsListForProduct.test.tsx`
- `docs/developer/modal-stack.md`

### Modified files

- `src/store/workspace-store.ts`
- `src/store/workspace-store.test.ts`
- `src/store/ui-store.ts`
- `src/store/__tests__/ui-store.test.ts`
- `src/lib/utils/tab-switch-guard.ts`
- `src/lib/utils/__tests__/tab-switch-guard.test.ts`
- `src/components/modal/ModalManager.tsx`
- `src/components/modal/__tests__/ModalManager.test.tsx`
- `src/components/layout/MainWindowContent.tsx`
- `src/components/layout/TabBar.tsx`
- `src/components/layout/search/SearchDropdown.tsx`
- `src/components/entity/EntityWorkspace.tsx`
- `src/components/entity/ProductModal.tsx`
- `src/components/entity/VariantModal.tsx`
- `src/components/entity/WarehouseModal.tsx`
- `src/components/entity/StockLevelsTable.tsx`
- `src/components/entity/VariantsSubTable.tsx`
- `src/components/entity/__tests__/ProductModal.test.tsx`
- `src/components/entity/__tests__/VariantModal.test.tsx`
- `src/components/entity/__tests__/WarehouseModal.test.tsx`
- `locales/en.json`, `locales/ar.json`

### Kept (out of scope)

- `src/components/layout/modal-handle-registry.ts` — still used by `TabBar` for `saveAndClose` on tab switch. Future cleanup.
