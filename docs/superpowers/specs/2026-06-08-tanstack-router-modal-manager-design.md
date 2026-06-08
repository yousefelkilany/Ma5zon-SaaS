# TanStack Router + URL-Driven Modal Manager

## Status

- **Draft**
- Date: 2026-06-08

## Overview

Replace React Router with TanStack Router and implement a URL-driven ModalManager that serves as the single source of truth for modal state. Modal visibility is controlled via URL query parameters rather than prop drilling.

## Motivation

Currently, detail modals (`ProductDetailModal`, `VariantDetailModal`, `WarehouseDetailModal`) receive `open`, `onOpenChange`, `entityId`, and `queryClient` as props. Modal state is scattered across `EntityWorkspace` and `DataTable`, requiring prop drilling and making it impossible to share a direct link to a specific modal.

## Architecture

### Router Structure

TanStack Router with code-based configuration.

**File:** `src/router/index.ts`

```typescript
import { createRouter, createRoute } from '@tanstack/react-router'

const rootRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: MainWindowContent,
})

const entityRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/entity/:entityType',
  component: EntityRoute,
})

export const router = createRouter({
  routeTree: rootRoute.addChildren([entityRoute]),
})
```

**URL Shape:**

```
/entity/products?entity_modal=product&entity_id=123
/entity/warehouses?entity_modal=warehouse&entity_id=456
/entity/products?entity_modal=variant&entity_id=789
```

### ModalManager

**File:** `src/components/modal/ModalManager.tsx`

**Responsibilities:**

- Parse `entity_modal` and `entity_id` from URL search params
- Render the appropriate modal based on `entity_modal` value
- Handle modal close by clearing URL params
- Listen to route changes and sync modal state

**URL Params Interface:**

```typescript
interface ModalParams {
  entity_modal: 'product' | 'variant' | 'warehouse' | null
  entity_id: string | null
}
```

**Behavior:**

- On route change → parse URL → if `entity_modal` + `entity_id` present → open corresponding modal
- On modal close → clear `entity_modal` and `entity_id` from URL (navigate to same path without modal params)
- Modal state is derived from URL; no local open/close state

### Modal Renaming

| Old Name               | New Name         |
| ---------------------- | ---------------- |
| `ProductDetailModal`   | `ProductModal`   |
| `VariantDetailModal`   | `VariantModal`   |
| `WarehouseDetailModal` | `WarehouseModal` |

### Updated Modal Interface

Modals no longer receive `open` or `onOpenChange` props. They receive only `entityId`.

```typescript
interface ProductModalProps {
  entityId: string
  queryClient: QueryClient
  onDeleted?: () => void
}

interface VariantModalProps {
  entityId: string
  queryClient: QueryClient
  onDeleted?: () => void
  onSaved?: (variant: Variant) => void
}

interface WarehouseModalProps {
  entityId: string
  queryClient: QueryClient
  onDeleted?: () => void
}
```

### File Structure

```
src/
├── router/
│   └── index.ts           # TanStack Router config
├── components/
│   ├── modal/
│   │   └── ModalManager.tsx
│   └── entity/
│       ├── ProductModal.tsx      # renamed from ProductDetailModal
│       ├── VariantModal.tsx      # renamed from VariantDetailModal
│       └── WarehouseModal.tsx     # renamed from WarehouseDetailModal
```

## Migration Steps

### Step 1: Install TanStack Router, remove React Router

- Add `@tanstack/react-router` to dependencies
- Remove `react-router-dom` from dependencies
- Update `src/main.tsx` to use `RouterProvider` instead of `BrowserRouter`

### Step 2: Create TanStack Router config

- Create `src/router/index.ts` with same route structure as current React Router setup
- Routes: `/dashboard`, `/entity/:entityType`, `*` (catch-all)
- Verify basic navigation works before proceeding

### Step 3: Create ModalManager

- Create `src/components/modal/ModalManager.tsx`
- Implement URL param parsing for `entity_modal` and `entity_id`
- Implement modal rendering based on parsed params
- Implement close handler that clears URL params
- Place ModalManager in the route tree (e.g., in `MainWindowContent` or a layout route)

### Step 4: Rename and update ProductModal

- Rename `ProductDetailModal.tsx` → `ProductModal.tsx`
- Remove `open` and `onOpenChange` from props
- Derive open state from URL (handled by ModalManager)
- Update imports in `EntityWorkspace` and `DataTable`

### Step 5: Rename and update VariantModal

- Rename `VariantDetailModal.tsx` → `VariantModal.tsx`
- Remove `open` and `onOpenChange` from props
- Update imports in `EntityWorkspace` and `DataTable`

### Step 6: Rename and update WarehouseModal

- Rename `WarehouseDetailModal.tsx` → `WarehouseModal.tsx`
- Remove `open` and `onOpenChange` from props
- Update imports in `DataTable`

### Step 7: Remove prop drilling from EntityWorkspace

- Remove all modal-related state (`variantDetailOpen`, `productDetailOpen`, `selectedVariantId`, `productDetailId`, etc.)
- Remove all modal-related callbacks (`handleProductClick`, `handleVariantClick`, etc.)
- Remove modal components from JSX
- Update `DataTableShell` to use URL navigation instead of callbacks for opening modals

### Step 8: Remove prop drilling from DataTable

- Remove all modal-related state (`editModalOpen`, `selectedEntityId`)
- Remove modal components from JSX
- Update row click handler to navigate to URL with modal params

### Step 9: Update MainWindowContent

- Replace React Router hooks (`useNavigate`, `useLocation`, `useParams`) with TanStack Router equivalents
- Update any remaining navigation logic

### Step 10: Clean up

- Remove unused imports (`react-router-dom` references)
- Update tests if needed
- Run `pnpm run check:all` to verify

## Backward Compatibility

- Deprecated URL patterns (e.g., `/entity/products/123`) are removed
- All modal navigation goes through URL params

## Error Handling

- If `entity_modal` is set but `entity_id` is missing → modal does not open
- If `entity_id` references non-existent entity → modal shows error state (handled by existing modal error handling)
- Invalid `entity_modal` value → ignored, no modal opens

## Testing Considerations

- Modal open/close updates URL correctly
- Browser back/forward navigates modal history
- Direct URL access opens correct modal
- Deleted entities show appropriate error state
