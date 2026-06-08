# TanStack Router + URL-Driven Modal Manager Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace React Router with TanStack Router and implement a URL-driven ModalManager as single source of truth for ALL modal state (both detail and create modals).

**Architecture:** TanStack Router with code-based config. ModalManager monitors routes, parses `entity_modal` and `entity_id` from URL, renders appropriate modal, and clears params on close. All modals renamed from `*DetailModal`/`*CreateModal` to `*Modal` and no longer receive `open`/`onOpenChange` props.

**URL Shape:**
- Detail modals: `/entity/products?entity_modal=product&entity_id=123`
- Create modals: `/entity/products?entity_modal=create-product`
- Create variant (needs productId): `/entity/products?entity_modal=create-variant&entity_id=123`

**Tech Stack:** @tanstack/react-router v1.x, @tanstack/react-query

---

## File Structure

```
src/
├── router/
│   └── index.tsx # TanStack Router config
├── components/
│   ├── modal/
│   │   └── ModalManager.tsx  # URL-driven modal manager (handles all modals)
│   └── entity/
│       ├── ProductModal.tsx        # handles both view and create modes
│       ├── VariantModal.tsx        # handles both view and create modes
│       └── WarehouseModal.tsx      # handles both view and create modes
```

**Files to modify:**

- `src/main.tsx` - Replace BrowserRouter with RouterProvider
- `src/components/layout/MainWindowContent.tsx` - Remove React Router hooks
- `src/components/entity/EntityWorkspace.tsx` - Remove modal state and components
- `src/components/entity/DataTable.tsx` - Remove modal state and components
- `package.json` - Dependencies update
- `src/components/entity/ProductCreateModal.tsx` - Delete (merged into ProductModal)
- `src/components/entity/WarehouseCreateModal.tsx` - Delete (merged into WarehouseModal)
- `src/components/entity/VariantCreateModal.tsx` - Delete (merged into VariantModal)

---

## Task 1: Install TanStack Router, remove React Router

**Files:**

- Modify: `package.json`

- [ ] **Step 1: Update package.json dependencies**

Remove `react-router-dom` and add `@tanstack/react-router`:

```json
"dependencies": {
  "@tanstack/react-router": "^1.100.0"
},
"removeDependencies": [
  "react-router-dom"
]
```

Run: `pnpm install`

- [ ] **Step 2: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: replace react-router-dom with @tanstack/react-router"
```

---

## Task 2: Create TanStack Router config

**Files:**

- Create: `src/router/index.ts`

- [ ] **Step 1: Create router config**

```typescript
import { createRouter, createRoute } from '@tanstack/react-router'
import { MainWindowContent } from '@/components/layout/MainWindowContent'
import { EntityWorkspace } from '@/components/entity'
import { DashboardContent, NewTabContent } from '@/components/tabs'

const rootRoute = createRoute({
  path: '/',
  component: () => null,
})

const entityRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/entity/:entityType',
  component: EntityWorkspace,
})

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard',
  component: DashboardContent,
})

const newTabRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/new-tab',
  component: NewTabContent,
})

const salesInvoiceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sales-invoice',
  component: NewTabContent,
})

const purchaseInvoiceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/purchase-invoice',
  component: NewTabContent,
})

const catchAllRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '*',
  component: DashboardContent,
})

export const routeTree = rootRoute.addChildren([
  dashboardRoute,
  newTabRoute,
  salesInvoiceRoute,
  purchaseInvoiceRoute,
  entityRoute,
  catchAllRoute,
])

export const router = createRouter({
  routeTree,
})
```

- [ ] **Step 2: Commit**

```bash
git add src/router/index.ts
git commit -m "feat(router): add tanstack router config"
```

---

## Task 3: Update main.tsx to use RouterProvider

**Files:**

- Modify: `src/main.tsx`

- [ ] **Step 1: Update main.tsx**

Replace:

```typescript
import { BrowserRouter } from 'react-router-dom'
```

With:

```typescript
import { RouterProvider } from '@tanstack/react-router'
import { router } from '@/router'
```

Replace `<BrowserRouter>` with `<RouterProvider router={router}>`:

```tsx
<RouterProvider router={router}>
  <ThemeProvider>
    <SplashScreen isReady={isAppReady} minDuration={1500} />
    <MainWindow />
  </ThemeProvider>
</RouterProvider>
```

- [ ] **Step 2: Type declaration**

Create `src/router/router.d.ts`:

```typescript
import '@tanstack/react-router'
import { router } from '@/router'

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
```

- [ ] **Step 3: Verify build**

Run: `pnpm run typecheck`
Expected: No errors (or errors unrelated to this change)

- [ ] **Step 4: Commit**

```bash
git add src/main.tsx src/router/router.d.ts
git commit -m "feat(router): wire tanstack router in main.tsx"
```

---

## Task 4: Create ModalManager

**Files:**

- Create: `src/components/modal/ModalManager.tsx`

- [ ] **Step 1: Create ModalManager component**

```typescript
import { useSearch, useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { ProductModal } from '@/components/entity/ProductModal'
import { VariantModal } from '@/components/entity/VariantModal'
import { WarehouseModal } from '@/components/entity/WarehouseModal'

type ModalType = 'product' | 'variant' | 'warehouse' | null

export function ModalManager() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const entity_modal = useSearch({
    select: (search) => search.entity_modal as ModalType,
  })
  const entity_id = useSearch({
    select: (search) => search.entity_id as string | null,
  })

  const isOpen = entity_modal && entity_id

  function handleClose() {
    navigate({
      search: (prev) => ({
        ...prev,
        entity_modal: null,
        entity_id: null,
      }),
    })
  }

  if (!isOpen || !entity_id) return null

  switch (entity_modal) {
    case 'product':
      return (
        <ProductModal
          entityId={entity_id}
          queryClient={queryClient}
          onDeleted={handleClose}
        />
      )
    case 'variant':
      return (
        <VariantModal
          entityId={entity_id}
          queryClient={queryClient}
          onDeleted={handleClose}
        />
      )
    case 'warehouse':
      return (
        <WarehouseModal
          entityId={entity_id}
          queryClient={queryClient}
          onDeleted={handleClose}
        />
      )
    default:
      return null
  }
}
```

- [ ] **Step 2: Place ModalManager in layout**

Modify `src/components/layout/MainWindowContent.tsx` to include ModalManager after `<Routes>`:

```tsx
import { ModalManager } from '@/components/modal/ModalManager'

// Add inside the div, after Routes:
;<ModalManager />
```

- [ ] **Step 3: Verify build**

Run: `pnpm run typecheck`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/components/modal/ModalManager.tsx src/components/layout/MainWindowContent.tsx
git commit -m "feat(modal): add ModalManager with URL-driven state"
```

---

## Task 5: Rename ProductDetailModal to ProductModal

**Files:**

- Create: `src/components/entity/ProductModal.tsx`
- Delete: `src/components/entity/ProductDetailModal.tsx`
- Modify: `src/components/entity/EntityWorkspace.tsx`
- Modify: `src/components/entity/DataTable.tsx`

- [ ] **Step 1: Copy ProductDetailModal.tsx to ProductModal.tsx**

Copy file content and update:

- Change interface name from `ProductDetailModalProps` to `ProductModalProps`
- Change function name from `ProductDetailModal` to `ProductModal`
- Remove `open` and `onOpenChange` from props interface
- Simplify Dialog to always be open:

```typescript
interface ProductModalProps {
  entityId: string
  queryClient: QueryClient
  onDeleted?: () => void
}
```

Update the Dialog:

```tsx
<Dialog open={true} onOpenChange={() => {}}>
```

- [ ] **Step 2: Delete old file**

Run: `rm src/components/entity/ProductDetailModal.tsx`

- [ ] **Step 3: Update imports in EntityWorkspace.tsx**

Change:

```typescript
import { ProductDetailModal } from './ProductDetailModal'
```

To:

```typescript
import { ProductModal } from './ProductModal'
```

- [ ] **Step 4: Update imports in DataTable.tsx**

Change:

```typescript
import { ProductDetailModal } from './ProductDetailModal'
```

To:

```typescript
import { ProductModal } from './ProductModal'
```

- [ ] **Step 5: Verify build**

Run: `pnpm run typecheck`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/components/entity/ProductModal.tsx
git rm src/components/entity/ProductDetailModal.tsx
git add src/components/entity/EntityWorkspace.tsx src/components/entity/DataTable.tsx
git commit -m "refactor: rename ProductDetailModal to ProductModal"
```

---

## Task 6: Rename VariantDetailModal to VariantModal

**Files:**

- Create: `src/components/entity/VariantModal.tsx`
- Delete: `src/components/entity/VariantDetailModal.tsx`
- Modify: `src/components/entity/EntityWorkspace.tsx`
- Modify: `src/components/entity/DataTable.tsx`

- [ ] **Step 1: Copy VariantDetailModal.tsx to VariantModal.tsx**

Copy file content and update:

- Change interface name from `VariantDetailModalProps` to `VariantModalProps`
- Change function name from `VariantDetailModal` to `VariantModal`
- Remove `open` and `onOpenChange` from props interface
- Simplify Dialog to always be open

```typescript
interface VariantModalProps {
  entityId: string
  queryClient: QueryClient
  onDeleted?: () => void
  onSaved?: (variant: Variant) => void
}
```

- [ ] **Step 2: Delete old file**

Run: `rm src/components/entity/VariantDetailModal.tsx`

- [ ] **Step 3: Update imports in EntityWorkspace.tsx**

Change:

```typescript
import { VariantDetailModal } from './VariantDetailModal'
```

To:

```typescript
import { VariantModal } from './VariantModal'
```

- [ ] **Step 4: Update imports in DataTable.tsx**

Change:

```typescript
import { VariantDetailModal } from './VariantDetailModal'
```

To:

```typescript
import { VariantModal } from './VariantModal'
```

- [ ] **Step 5: Verify build**

Run: `pnpm run typecheck`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/components/entity/VariantModal.tsx
git rm src/components/entity/VariantDetailModal.tsx
git add src/components/entity/EntityWorkspace.tsx src/components/entity/DataTable.tsx
git commit -m "refactor: rename VariantDetailModal to VariantModal"
```

---

## Task 7: Rename WarehouseDetailModal to WarehouseModal

**Files:**

- Create: `src/components/entity/WarehouseModal.tsx`
- Delete: `src/components/entity/WarehouseDetailModal.tsx`
- Modify: `src/components/entity/DataTable.tsx`

- [ ] **Step 1: Copy WarehouseDetailModal.tsx to WarehouseModal.tsx**

Copy file content and update:

- Change interface name from `WarehouseDetailModalProps` to `WarehouseModalProps`
- Change function name from `WarehouseDetailModal` to `WarehouseModal`
- Remove `open` and `onOpenChange` from props interface
- Simplify Dialog to always be open

```typescript
interface WarehouseModalProps {
  entityId: string
  queryClient: QueryClient
  onDeleted?: () => void
}
```

- [ ] **Step 2: Delete old file**

Run: `rm src/components/entity/WarehouseDetailModal.tsx`

- [ ] **Step 3: Update imports in DataTable.tsx**

Change:

```typescript
import { WarehouseDetailModal } from './WarehouseDetailModal'
```

To:

```typescript
import { WarehouseModal } from './WarehouseModal'
```

- [ ] **Step 4: Verify build**

Run: `pnpm run typecheck`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/components/entity/WarehouseModal.tsx
git rm src/components/entity/WarehouseDetailModal.tsx
git add src/components/entity/DataTable.tsx
git commit -m "refactor: rename WarehouseDetailModal to WarehouseModal"
```

---

## Task 13: Rename ProductCreateModal to ProductModal (Create)

**Files:**

- Create: `src/components/entity/ProductModal.tsx` (create variant)
- Modify: `src/components/entity/EntityWorkspace.tsx`

**Note:** ProductModal already exists (detail modal). Rename create modal to `ProductCreateModal.tsx` temporarily, or merge into existing modal with mode prop. For simplicity, use `mode` prop:

```typescript
interface ProductModalProps {
  entityId: string
  queryClient: QueryClient
  mode: 'view' | 'create'
  onDeleted?: () => void
}
```

- [ ] **Step 1: Update ProductModal to support both modes**

Update `ProductModal` to accept `mode` prop:

```typescript
interface ProductModalProps {
  entityId?: string  // undefined for create mode
  queryClient: QueryClient
  mode: 'view' | 'create'
  onDeleted?: () => void
}
```

- [ ] **Step 2: Update imports in EntityWorkspace.tsx**

Remove ProductCreateModal import and usage since it's now handled by ProductModal with mode='create'.

- [ ] **Step 3: Verify build**

Run: `pnpm run typecheck`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/components/entity/ProductModal.tsx src/components/entity/EntityWorkspace.tsx
git commit -m "refactor: merge ProductCreateModal into ProductModal with mode prop"
```

---

## Task 14: Rename WarehouseCreateModal to WarehouseModal (Create)

**Files:**

- Modify: `src/components/entity/WarehouseModal.tsx`
- Modify: `src/components/entity/EntityWorkspace.tsx`

- [ ] **Step 1: Update WarehouseModal to support both modes**

```typescript
interface WarehouseModalProps {
  entityId?: string
  queryClient: QueryClient
  mode: 'view' | 'create'
  onDeleted?: () => void
}
```

- [ ] **Step 2: Update imports in EntityWorkspace.tsx**

Remove WarehouseCreateModal import and usage.

- [ ] **Step 3: Verify build**

Run: `pnpm run typecheck`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/components/entity/WarehouseModal.tsx src/components/entity/EntityWorkspace.tsx
git commit -m "refactor: merge WarehouseCreateModal into WarehouseModal with mode prop"
```

---

## Task 15: Rename VariantCreateModal to VariantModal (Create)

**Files:**

- Modify: `src/components/entity/VariantModal.tsx`
- Modify: `src/components/entity/EntityWorkspace.tsx`

- [ ] **Step 1: Update VariantModal to support both modes**

```typescript
interface VariantModalProps {
  entityId?: string  // undefined for create mode
  productId?: string  // needed for create mode
  queryClient: QueryClient
  mode: 'view' | 'create'
  onDeleted?: () => void
  onSaved?: (variant: Variant) => void
}
```

- [ ] **Step 2: Update imports in EntityWorkspace.tsx**

Remove VariantCreateModal import and usage.

- [ ] **Step 3: Verify build**

Run: `pnpm run typecheck`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/components/entity/VariantModal.tsx src/components/entity/EntityWorkspace.tsx
git commit -m "refactor: merge VariantCreateModal into VariantModal with mode prop"
```

---

## Task 16: Update ModalManager for Create Modals

**Files:**

- Modify: `src/components/modal/ModalManager.tsx`

- [ ] **Step 1: Update ModalManager to handle create modals**

```typescript
type ModalType = 'product' | 'variant' | 'warehouse' | 'create-product' | 'create-warehouse' | 'create-variant' | null

export function ModalManager() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const entity_modal = useSearch({
    select: (search) => search.entity_modal as ModalType,
  })
  const entity_id = useSearch({
    select: (search) => search.entity_id as string | null,
  })

  function handleClose() {
    navigate({
      search: (prev) => ({
        ...prev,
        entity_modal: null,
        entity_id: null,
      }),
    })
  }

  // Detail modals
  if (entity_modal === 'product' && entity_id) {
    return <ProductModal entityId={entity_id} queryClient={queryClient} mode="view" onDeleted={handleClose} />
  }
  if (entity_modal === 'variant' && entity_id) {
    return <VariantModal entityId={entity_id} queryClient={queryClient} mode="view" onDeleted={handleClose} />
  }
  if (entity_modal === 'warehouse' && entity_id) {
    return <WarehouseModal entityId={entity_id} queryClient={queryClient} mode="view" onDeleted={handleClose} />
  }

  // Create modals
  if (entity_modal === 'create-product') {
    return <ProductModal queryClient={queryClient} mode="create" onDeleted={handleClose} />
  }
  if (entity_modal === 'create-warehouse') {
    return <WarehouseModal queryClient={queryClient} mode="create" onDeleted={handleClose} />
  }
  if (entity_modal === 'create-variant' && entity_id) {
    return <VariantModal productId={entity_id} queryClient={queryClient} mode="create" onDeleted={handleClose} />
  }

  return null
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm run typecheck`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/modal/ModalManager.tsx
git commit -m "feat(modal): extend ModalManager to handle create modals"
```

---

## Task 17: Update EntityWorkspace for Create Modal Navigation

**Files:**

- Modify: `src/components/entity/EntityWorkspace.tsx`

- [ ] **Step 1: Update handleAddNewClick to navigate to create modal**

```typescript
const handleAddNewClick = useCallback(() => {
  const createModal = entityType === 'products' ? 'create-product'
    : entityType === 'warehouses' ? 'create-warehouse'
    : entityType === 'product_variants' ? 'create-variant'
    : null
  if (createModal) {
    navigate({
      to: '/entity/$entityType',
      params: { entityType: entityType },
      search: createModal === 'create-variant' ? { entity_modal: createModal, entity_id: createModalProductId } : { entity_modal: createModal },
    })
  }
}, [navigate, entityType])
```

- [ ] **Step 2: Remove create modal state and JSX**

Remove:
- `createModalOpen` state
- `createModalType` state
- `createModalProductId` state
- Modal components from JSX

- [ ] **Step 3: Verify build**

Run: `pnpm run typecheck`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/components/entity/EntityWorkspace.tsx
git commit -m "refactor: update EntityWorkspace to navigate to create modals via URL"
```

---

## Task 8: Remove prop drilling from EntityWorkspace

**Files:**

- Modify: `src/components/entity/EntityWorkspace.tsx`

- [ ] **Step 1: Remove detail modal state and callbacks**

Remove these state declarations:

```typescript
const [variantDetailOpen, setVariantDetailOpen] = useState(false)
const [productDetailOpen, setProductDetailOpen] = useState(false)
const [productDetailId, setProductDetailId] = useState<string | null>(null)
const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null)
const [selectedVariantProductId, setSelectedVariantProductId] = useState<
  string | null
>(null)
```

Remove these callbacks:

```typescript
const handleProductClick = useCallback((productId: string) => {
  setProductDetailId(productId)
  setProductDetailOpen(true)
}, [])

const handleVariantClick = useCallback(
  (variantId: string, productId: string) => {
    setSelectedVariantId(variantId)
    setSelectedVariantProductId(productId)
    setVariantDetailOpen(true)
  },
  []
)
```

Modify `handleVariantSaved` to not need selectedVariantProductId:

```typescript
const handleVariantSaved = useCallback(
  async (_variant: { product_id: string }) => {
    queryClient.invalidateQueries({
      queryKey: ['entity', 'products', 'variants'],
    })
  },
  [queryClient]
)
```

- [ ] **Step 2: Remove detail modal JSX**

Remove the modal components from JSX:

```tsx
{entityType === 'products' && selectedVariantId && (
  <VariantModal ... />
)}
{entityType === 'warehouses' && productDetailId && (
  <ProductModal ... />
)}
```

- [ ] **Step 3: Update DataTableShell props to navigate instead**

The `onProductClick` and `onVariantClick` callbacks should now navigate to URL:

```typescript
import { useNavigate } from '@tanstack/react-router'

const navigate = useNavigate()

const handleProductClick = useCallback(
  (productId: string) => {
    navigate({
      to: '/entity/$entityType',
      params: { entityType: entityType },
      search: { entity_modal: 'product', entity_id: productId },
    })
  },
  [navigate, entityType]
)

const handleVariantClick = useCallback(
  (variantId: string, _productId: string) => {
    navigate({
      to: '/entity/$entityType',
      params: { entityType: entityType },
      search: { entity_modal: 'variant', entity_id: variantId },
    })
  },
  [navigate, entityType]
)
```

- [ ] **Step 4: Verify build**

Run: `pnpm run typecheck`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/components/entity/EntityWorkspace.tsx
git commit -m "refactor: remove modal prop drilling from EntityWorkspace"
```

---

## Task 9: Remove prop drilling from DataTable

**Files:**

- Modify: `src/components/entity/DataTable.tsx`

- [ ] **Step 1: Remove modal state**

Remove:

```typescript
const [editModalOpen, setEditModalOpen] = useState(false)
const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null)
```

- [ ] **Step 2: Update handleRowClick to navigate**

Replace the callback:

```typescript
const handleRowClick = useCallback((id: string, _row: EntityRow) => {
  setSelectedEntityId(id)
  setEditModalOpen(true)
}, [])
```

With navigation:

```typescript
import { useNavigate } from '@tanstack/react-router'

const navigate = useNavigate()

const handleRowClick = useCallback(
  (id: string, _row: EntityRow) => {
    const modalType =
      entityType === 'products'
        ? 'product'
        : entityType === 'warehouses'
          ? 'warehouse'
          : entityType === 'variants'
            ? 'variant'
            : null
    if (modalType) {
      navigate({
        to: '/entity/$entityType',
        params: { entityType },
        search: { entity_modal: modalType, entity_id: id },
      })
    }
  },
  [navigate, entityType]
)
```

- [ ] **Step 3: Remove modal JSX**

Remove the modal components from the return JSX:

```tsx
{entityType === 'products' && selectedEntityId && (
  <ProductModal ... />
)}
{entityType === 'warehouses' && selectedEntityId && (
  <WarehouseModal ... />
)}
{entityType === 'variants' && selectedEntityId && (
  <VariantModal ... />
)}
```

- [ ] **Step 4: Verify build**

Run: `pnpm run typecheck`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/components/entity/DataTable.tsx
git commit -m "refactor: remove modal prop drilling from DataTable"
```

---

## Task 10: Update MainWindowContent

**Files:**

- Modify: `src/components/layout/MainWindowContent.tsx`

- [ ] **Step 1: Replace React Router hooks with TanStack Router**

Remove:

```typescript
import {
  Routes,
  Route,
  useNavigate,
  useLocation,
  useParams,
} from 'react-router-dom'
```

Add:

```typescript
import { useNavigate, useLocation } from '@tanstack/react-router'
```

- [ ] **Step 2: Update navigation logic**

The current `useEffect` syncs tabs to URL. Update to use TanStack Router navigation:

```typescript
export function MainWindowContent() {
  const navigate = useNavigate()
  const location = useLocation()
  const activeTabId = useTabStore(state => state.activeTabId)
  const tabs = useTabStore(state => state.tabs)
  const isNavigatingRef = useRef(false)

  useEffect(() => {
    if (isNavigatingRef.current) return

    const activeTab = tabs.find(t => t.id === activeTabId)

    if (activeTab) {
      let targetPath = ''
      if (activeTab.type === 'entity' && activeTab.entityType) {
        targetPath = `/entity/${activeTab.entityType}`
      } else {
        targetPath = `/${activeTab.type}`
      }

      if (location.pathname !== targetPath) {
        isNavigatingRef.current = true
        navigate({ to: targetPath, search: {} })
        isNavigatingRef.current = false
      }
    }
  }, [location.pathname, activeTabId, tabs, navigate])

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Routes handled by TanStack Router */}
    </div>
  )
}
```

Note: Routes are now handled by TanStack Router directly, so we don't need `<Routes>` and `<Route>` in MainWindowContent anymore.

- [ ] **Step 3: Verify build**

Run: `pnpm run typecheck`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/MainWindowContent.tsx
git commit -m "refactor: update MainWindowContent for tanstack router"
```

---

## Task 11: Clean up and verify

**Files:**

- Modify: `src/test/test-utils.tsx`
- Delete: `src/components/entity/ProductCreateModal.tsx`
- Delete: `src/components/entity/WarehouseCreateModal.tsx`
- Delete: `src/components/entity/VariantCreateModal.tsx`
- Check: Various files for react-router-dom imports

- [ ] **Step 1: Update test utilities**

Modify `src/test/test-utils.tsx`:
Remove:

```typescript
import { BrowserRouter } from 'react-router-dom'
```

Replace with TanStack Router test utilities or wrap with RouterProvider in tests.

- [ ] **Step 2: Delete create modal files**

```bash
rm src/components/entity/ProductCreateModal.tsx
rm src/components/entity/WarehouseCreateModal.tsx
rm src/components/entity/VariantCreateModal.tsx
```

- [ ] **Step 3: Search for remaining react-router-dom imports**

Run: `grep -r "react-router-dom" src/ --include="*.tsx" --include="*.ts"`
Expected: No matches

- [ ] **Step 4: Run full check**

Run: `pnpm run check:all`
Expected: All checks pass

- [ ] **Step 5: Commit cleanup**

```bash
git add -A
git commit -m "chore: remove react-router-dom references and delete merged create modals"
```

---

## Task 18: Verify end-to-end

- [ ] **Step 1: Start dev server**

Run: `pnpm run dev`

- [ ] **Step 2: Test detail modal navigation**

1. Navigate to `/entity/products`
2. Click on a product row
3. Verify URL updates to `/entity/products?entity_modal=product&entity_id=<id>`
4. Verify modal opens
5. Close modal
6. Verify URL clears modal params

- [ ] **Step 3: Test create modal navigation**

1. Navigate to `/entity/products`
2. Click "Add New" button
3. Verify URL updates to `/entity/products?entity_modal=create-product`
4. Verify create modal opens
5. Close modal
6. Verify URL clears modal params

- [ ] **Step 4: Test create variant modal**

1. Navigate to `/entity/products`
2. Click expand on a product row
3. Click "Add Variant"
4. Verify URL updates to `/entity/products?entity_modal=create-variant&entity_id=<productId>`
5. Verify create variant modal opens
6. Close modal
7. Verify URL clears modal params

- [ ] **Step 5: Test back/forward navigation**

1. Open a modal
2. Click browser back
3. Verify modal closes
4. Click browser forward
5. Verify modal reopens with correct entity

- [ ] **Step 6: Test direct URL access**

1. Navigate directly to `/entity/products?entity_modal=product&entity_id=<id>`
2. Verify detail modal opens with correct entity data

3. Navigate directly to `/entity/products?entity_modal=create-product`
4. Verify create modal opens
