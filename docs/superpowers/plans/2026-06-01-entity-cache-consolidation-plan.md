# Entity Workspace Cache Consolidation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate all fragmented cache state (`expandedIds`, `variantsCache`, `stockLevelsCache`, `loadingVariants`, `loadingStockLevels`) into TanStack Query for unified cache management, proper invalidation, and preserved state per entityType.

**Architecture:** Move from useState-based caches to queryClient.setQueryData/getQueryData. Expanded state keyed by `['entity', entityType, 'expanded']`. Variants/stockLevels keyed by their entity IDs. Loading states derived from queryClient.getQueryState.

**Tech Stack:** React 19, TanStack Query v5, React Router / Tab state

---

## File Structure

```
src/components/entity/
├── EntityWorkspace.tsx      # Remove cache useState, pass queryClient
├── DataTableShell.tsx       # Pass queryClient, handle expanded toggle
├── DataTable.tsx            # Internal expanded state via queryClient
├── VariantsSubTable.tsx     # Read variants from query cache
├── WarehousesSubTable.tsx   # Read stockLevels from query cache

src/lib/
├── hooks/
│   └── useEntityExpanded.ts # New: hook for expanded state management
├── types/
│   └── entity.ts            # Add LoadingState type
```

---

## Task 1: Create useEntityExpanded Hook

**Files:**

- Create: `src/lib/hooks/useEntityExpanded.ts`

- [ ] **Step 1: Write the useEntityExpanded hook**

```typescript
import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'

export function useEntityExpanded(entityType: string) {
  const queryClient = useQueryClient()

  const expandedKey = ['entity', entityType, 'expanded'] as const

  const getExpandedIds = useCallback((): Set<string> => {
    const data = queryClient.getQueryData(expandedKey)
    return data ?? new Set<string>()
  }, [queryClient, expandedKey])

  const setExpandedIds = useCallback(
    (ids: Set<string>) => {
      queryClient.setQueryData(expandedKey, ids)
    },
    [queryClient, expandedKey]
  )

  const toggleExpanded = useCallback(
    (id: string) => {
      const current = getExpandedIds()
      const next = new Set(current)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      setExpandedIds(next)
    },
    [getExpandedIds, setExpandedIds]
  )

  const isExpanded = useCallback(
    (id: string): boolean => {
      return getExpandedIds().has(id)
    },
    [getExpandedIds]
  )

  return {
    getExpandedIds,
    setExpandedIds,
    toggleExpanded,
    isExpanded,
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/hooks/useEntityExpanded.ts
git commit -m "feat: add useEntityExpanded hook for query-based expand state"
```

---

## Task 2: Modify DataTable to Use Query-Based Expanded State

**Files:**

- Modify: `src/components/entity/DataTable.tsx:141-165` (expandColumn)
- Modify: `src/components/entity/DataTable.tsx:396-420` (expanded row render)
- Modify: `src/lib/types/entity.ts` (add ExpandedRowProps)

- [ ] **Step 1: Update ExpandedRowProps in entity.ts**

Add to `ExpandedRowProps`:

```typescript
// Remove variantsCache, stockLevelsCache - they'll come from useQuery
onToggleExpanded?: (id: string) => void
```

- [ ] **Step 2: Modify expandColumn to use onToggleExpanded**

```typescript
const expandColumn = useMemo<TanstackColumnDef<EntityRow>>(
  () => ({
    isUtil: true,
    id: 'expand',
    size: 10,
    enableResizing: false,
    header: () => null,
    cell: ({ row }) => (
      <button
        className="p-1 hover:bg-surface-bright rounded transition-colors"
        onClick={e => {
          e.stopPropagation()
          onToggleExpand?.(row.original.id)
        }}
      >
        <span
          className={`icon-directional material-symbols-outlined text-[18px] text-on-surface-variant transition-transform ${isExpanded(row.original.id) ? 'rotate-90' : 'rotate-180'}`}
        >
          chevron_right
        </span>
      </button>
    ),
  }),
  [onToggleExpand, isExpanded]
)
```

- [ ] **Step 3: Modify expanded row render to use query cache**

```typescript
{isExpanded(row.original.id) && (
  <tr>
    <td colSpan={columns.length + 2} className="p-0">
      {entityType === 'products' && (
        <VariantsSubTable
          productId={row.original.id}
          onVariantClick={onVariantClick}
          onAddVariant={onAddVariant}
        />
      )}
      {entityType === 'warehouses' && (
        <WarehousesSubTable
          warehouseId={row.original.id}
          onProductClick={onProductClick}
        />
      )}
    </td>
  </tr>
)}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/types/entity.ts src/components/entity/DataTable.tsx
git commit -m "refactor: DataTable uses query-based expand state"
```

---

## Task 3: Modify VariantsSubTable to Use Query Cache

**Files:**

- Modify: `src/components/entity/VariantsSubTable.tsx`

- [ ] **Step 1: Read variants from query cache instead of props**

```typescript
import { useQuery } from '@tanstack/react-query'
import { commands } from '@/lib/tauri-bindings'
import type { VariantRow } from '@/lib/types/entity'

interface VariantsSubTableProps {
  productId: string
  onVariantClick?: (variantId: string, productId: string) => void
  onAddVariant?: (productId: string) => void
}

export function VariantsSubTable({
  productId,
  onVariantClick,
  onAddVariant,
}: VariantsSubTableProps) {
  const { data: variants, isLoading } = useQuery({
    queryKey: ['entity', 'products', 'variants', productId],
    queryFn: async () => {
      const result = await commands.variantsGetByProductWithStock(productId)
      if (result.status === 'ok') {
        return result.data as VariantRow[]
      }
      return []
    },
    staleTime: Infinity, // Keep cached until explicitly invalidated
  })

  // ... rest of component
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/entity/VariantsSubTable.tsx
git commit -m "refactor: VariantsSubTable reads from query cache"
```

---

## Task 4: Modify WarehousesSubTable to Use Query Cache

**Files:**

- Modify: `src/components/entity/WarehousesSubTable.tsx`

- [ ] **Step 1: Read stockLevels from query cache instead of props**

```typescript
import { useQuery } from '@tanstack/react-query'
import { commands } from '@/lib/tauri-bindings'
import type { StockLevelWithVariant } from '@/lib/types/entity'

interface WarehousesSubTableProps {
  warehouseId: string
  onProductClick?: (productId: string) => void
}

export function WarehousesSubTable({
  warehouseId,
  onProductClick,
}: WarehousesSubTableProps) {
  const { data: stockLevels, isLoading } = useQuery({
    queryKey: ['entity', 'warehouses', 'stockLevels', warehouseId],
    queryFn: async () => {
      const result =
        await commands.stockLevelsGetByWarehouseWithNames(warehouseId)
      if (result.status === 'ok') {
        return result.data as StockLevelWithVariant[]
      }
      return []
    },
    staleTime: Infinity,
  })

  // ... rest of component
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/entity/WarehousesSubTable.tsx
git commit -m "refactor: WarehousesSubTable reads from query cache"
```

---

## Task 5: Update EntityWorkspace - Remove Fragmented Caches

**Files:**

- Modify: `src/components/entity/EntityWorkspace.tsx:91-103` (remove cache states)
- Modify: `src/components/entity/EntityWorkspace.tsx:188-230` (remove handleRowToggleExpand)
- Modify: `src/components/entity/EntityWorkspace.tsx:409-417` (remove props to DataTableShell)

- [ ] **Step 1: Remove cache useState declarations (lines 91-103)**

Remove:

```typescript
const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
const [variantsCache, setVariantsCache] = useState<Map<string, VariantRow[]>>(
  new Map()
)
const [loadingVariants, setLoadingVariants] = useState<Set<string>>(new Set())
const [stockLevelsCache, setStockLevelsCache] = useState<
  Map<string, StockLevelWithVariant[]>
>(new Map())
const [loadingStockLevels, setLoadingStockLevels] = useState<Set<string>>(
  new Set()
)
```

- [ ] **Step 2: Remove handleRowToggleExpand callback (lines 188-230)**

Replace with simplified version that only toggles expanded:

```typescript
const handleRowToggleExpand = useCallback(
  (id: string) => {
    const { toggleExpanded } = useEntityExpanded(entityType)
    toggleExpanded(id)
  },
  [entityType]
)
```

- [ ] **Step 3: Update DataTableShell props (lines 409-417)**

Remove: `expandedRowIds`, `variantsCache`, `onRowToggleExpand`, `isLoadingVariants`, `stockLevelsCache`, `isLoadingStockLevels`

Add: `queryClient`

- [ ] **Step 4: Commit**

```bash
git add src/components/entity/EntityWorkspace.tsx
git commit -m "refactor: remove fragmented cache state, use queryClient"
```

---

## Task 6: Update DataTableShell - Manage Expanded State

**Files:**

- Modify: `src/components/entity/DataTableShell.tsx:40-48` (remove cache props)
- Modify: `src/components/entity/DataTableShell.tsx:195-215` (pass to DataTable)

- [ ] **Step 1: Remove cache-related props from DataTableShellProps**

Remove:

```typescript
expandedRowIds?: Set<string>
variantsCache?: Map<string, VariantRow[]>
onRowToggleExpand?: (id: string) => void
isLoadingVariants?: (id: string) => boolean
stockLevelsCache?: Map<string, StockLevelWithVariant[]>
isLoadingStockLevels?: (id: string) => boolean
```

- [ ] **Step 2: Add useEntityExpanded hook in DataTableShell**

```typescript
import { useEntityExpanded } from '@/lib/hooks/useEntityExpanded'

// In component:
const { isExpanded, toggleExpanded } = useEntityExpanded(entityType)
```

- [ ] **Step 3: Pass to DataTable**

```typescript
<DataTable
  entityType={entityType}
  queryClient={queryClient}
  columns={localColumns}
  data={filteredData}
  sort={sort}
  isLoading={isLoading}
  selectedIds={selectedIds}
  onSort={handleSortChange}
  onRowSelect={handleRowSelect}
  onRowClick={handleRowClick}
  onToggleExpand={toggleExpanded}
  isExpanded={isExpanded}
  onVariantClick={onVariantClick}
  onAddVariant={onAddVariant}
  onProductClick={onProductClick}
/>
```

- [ ] **Step 4: Commit**

```bash
git add src/components/entity/DataTableShell.tsx
git commit -m "refactor: DataTableShell uses query-based expanded state"
```

---

## Task 7: Add Prefetch for Expanded Rows

**Files:**

- Modify: `src/components/entity/DataTableShell.tsx` (prefetch on expand toggle)

- [ ] **Step 1: Add prefetch logic in DataTableShell**

When toggle expands, prefetch the data for that row:

```typescript
const handleToggleExpand = useCallback(
  (id: string) => {
    toggleExpanded(id)

    // Prefetch data for expanded row
    if (!isExpanded(id)) {
      if (entityType === 'products') {
        queryClient.prefetchQuery({
          queryKey: ['entity', entityType, 'variants', id],
          queryFn: () =>
            commands.variantsGetByProductWithStock(id).then(r => r.data ?? []),
        })
      }
      if (entityType === 'warehouses') {
        queryClient.prefetchQuery({
          queryKey: ['entity', entityType, 'stockLevels', id],
          queryFn: () =>
            commands
              .stockLevelsGetByWarehouseWithNames(id)
              .then(r => r.data ?? []),
        })
      }
    }
  },
  [toggleExpanded, isExpanded, entityType, queryClient]
)
```

- [ ] **Step 2: Commit**

```bash
git add src/components/entity/DataTableShell.tsx
git commit -m "feat: prefetch expanded row data on toggle"
```

---

## Task 8: Handle VariantSaved to Update Query Cache

**Files:**

- Modify: `src/components/entity/EntityWorkspace.tsx` (handleVariantSaved)

- [ ] **Step 1: Update handleVariantSaved to invalidate query**

```typescript
const handleVariantSaved = useCallback(
  async (_variant: { product_id: string }) => {
    if (!selectedVariantProductId) return
    // Invalidate to refetch
    queryClient.invalidateQueries({
      queryKey: ['entity', 'products', 'variants', selectedVariantProductId],
    })
  },
  [selectedVariantProductId, queryClient]
)
```

- [ ] **Step 2: Commit**

```bash
git add src/components/entity/EntityWorkspace.tsx
git commit -m "fix: handleVariantSaved invalidates query cache"
```

---

## Task 9: Full Integration Test

**Files:**

- None (integration test)

- [ ] **Step 1: Test the full flow**

1. Open products tab, expand first row → variants load and display
2. Switch to warehouses tab → expand first row → stockLevels load
3. Switch back to products tab → first row still expanded, variants still shown
4. Expand another row in products → no flicker, cached data shows
5. Close all expanded in products, switch to warehouses → products expanded state preserved

- [ ] **Step 2: Run check:all**

```bash
pnpm run check:all
```

Expected: All checks pass

---

## Task 10: Final Verification

- [ ] **Step 1: Verify no useState caches remain in EntityWorkspace**

Search for `useState` in EntityWorkspace.tsx - should only have non-cache state (modals, pagination, etc.)

- [ ] **Step 2: Verify all caches go through queryClient**

grep for `variantsCache`, `stockLevelsCache`, `loadingVariants`, `loadingStockLevels` in entity components - should find zero references

- [ ] **Step 3: Commit final changes**

```bash
git add -A
git commit -m "feat: consolidated entity cache into TanStack Query"
```

---

**Plan complete.** Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
