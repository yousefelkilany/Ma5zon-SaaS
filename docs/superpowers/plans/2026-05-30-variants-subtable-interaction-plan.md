# VariantsSubTable Interaction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable clicking variant rows to open VariantDetailModal and add "Add Variant" button to create variants linked to parent product.

**Architecture:** Add callback props (onVariantClick, onAddVariant) and productId through the component chain: EntityWorkspace → DataTableShell → DataTable → VariantsSubTable. EntityWorkspace manages modal state for variant detail/edit.

**Tech Stack:** React, TypeScript, TanStack Query, Tauri

---

## File Structure

- `src/lib/types/entity.ts` - Add `VariantsSubTableProps` interface
- `src/components/entity/DataTableShell.tsx` - Pass through new props
- `src/components/entity/DataTable.tsx` - Add new props, pass to VariantsSubTable
- `src/components/entity/EntityWorkspace.tsx` - Add state and handlers for variant modals
- `src/components/entity/VariantsSubTable.tsx` - Add click handlers, "Add Variant" button

---

## Task 1: Update Types

**Files:**
- Modify: `src/lib/types/entity.ts:100-103`

- [ ] **Step 1: Add VariantsSubTableProps interface**

Add at end of file (after line 103):

```typescript
export interface VariantsSubTableProps {
  variants: VariantRow[]
  isLoading?: boolean
  productId: string
  onVariantClick?: (variantId: string, productId: string) => void
  onAddVariant?: (productId: string) => void
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/types/entity.ts
git commit -m "feat: add VariantsSubTableProps interface"
```

---

## Task 2: Update DataTableShell

**Files:**
- Modify: `src/components/entity/DataTableShell.tsx:28-31` (props interface)
- Modify: `src/components/entity/DataTableShell.tsx:51-54` (props destructuring)
- Modify: `src/components/entity/DataTableShell.tsx:122-124` (pass to DataTable)

- [ ] **Step 1: Add new props to DataTableShellProps interface**

In `interface DataTableShellProps` (around line 28), add:

```typescript
isLoadingVariants?: (id: string) => boolean
onVariantClick?: (variantId: string, productId: string) => void  // NEW
onAddVariant?: (productId: string) => void  // NEW
```

- [ ] **Step 2: Add to destructuring**

In `export function DataTableShell` destructuring (around line 51), add:

```typescript
isLoadingVariants,
onVariantClick,  // NEW
onAddVariant,    // NEW
```

- [ ] **Step 3: Pass to DataTable component**

In DataTable render (around line 122), add props:

```typescript
<DataTable
  entityType={entityType}
  queryClient={queryClient}
  columns={columns}
  data={data}
  sort={sort}
  isLoading={isLoading}
  selectedIds={selectedIds}
  onSort={handleSort}
  onRowSelect={handleRowSelect}
  onRowClick={handleRowClick}
  expandedRowIds={expandedRowIds}
  variantsCache={variantsCache}
  onRowToggleExpand={onRowToggleExpand}
  isLoadingVariants={isLoadingVariants}
  onVariantClick={onVariantClick}    // NEW
  onAddVariant={onAddVariant}        // NEW
/>
```

- [ ] **Step 4: Commit**

```bash
git add src/components/entity/DataTableShell.tsx
git commit -m "feat: add onVariantClick and onAddVariant props to DataTableShell"
```

---

## Task 3: Update DataTable

**Files:**
- Modify: `src/components/entity/DataTable.tsx:66-71` (ExpandedRowProps interface)
- Modify: `src/components/entity/DataTable.tsx:84-88` (function props destructuring)
- Modify: `src/components/entity/DataTable.tsx:386-394` (VariantsSubTable render)

- [ ] **Step 1: Add props to ExpandedRowProps interface**

In `interface ExpandedRowProps` (around line 66), add:

```typescript
interface ExpandedRowProps {
  expandedRowIds?: Set<string>
  variantsCache?: Map<string, VariantRow[]>
  onRowToggleExpand?: (id: string) => void
  isLoadingVariants?: (id: string) => boolean
  onVariantClick?: (variantId: string, productId: string) => void  // NEW
  onAddVariant?: (productId: string) => void  // NEW
}
```

- [ ] **Step 2: Add to function props destructuring**

In `export function DataTable` (around line 84), add to destructuring:

```typescript
isLoadingVariants,
onVariantClick,  // NEW
onAddVariant,    // NEW
```

- [ ] **Step 3: Update VariantsSubTable render**

In the expanded row render (around line 386-394), update:

```tsx
{expandedRowIds?.has(row.original.id) && (
  <tr>
    <td colSpan={columns.length + 2} className="p-0">
      <VariantsSubTable
        variants={variantsCache?.get(row.original.id) ?? []}
        isLoading={isLoadingVariants?.(row.original.id)}
        productId={row.original.id}
        onVariantClick={onVariantClick}
        onAddVariant={onAddVariant}
      />
    </td>
  </tr>
)}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/entity/DataTable.tsx
git commit -m "feat: wire onVariantClick and onAddVariant to VariantsSubTable"
```

---

## Task 4: Update EntityWorkspace

**Files:**
- Modify: `src/components/entity/EntityWorkspace.tsx:116-123` (add state)
- Modify: `src/components/entity/EntityWorkspace.tsx:125-128` (add handlers)
- Modify: `src/components/entity/EntityWorkspace.tsx:234-235` (pass to DataTableShell)
- Modify: `src/components/entity/EntityWorkspace.tsx:248-253` (update VariantCreateModal)
- Modify: `src/components/entity/EntityWorkspace.tsx` (add VariantDetailModal for products)

- [ ] **Step 1: Add new state variables**

After line 116 (loadingVariants state), add:

```typescript
const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null)
const [variantDetailOpen, setVariantDetailOpen] = useState(false)
```

- [ ] **Step 2: Add handler functions**

After `handleModalOpenChange` (around line 128), add:

```typescript
const handleVariantClick = useCallback((variantId: string, _productId: string) => {
  setSelectedVariantId(variantId)
  setVariantDetailOpen(true)
}, [])

const handleAddVariant = useCallback((productId: string) => {
  setCreateModalType('product_variants')
  setCreateModalProductId(productId)
  setCreateModalOpen(true)
}, [])
```

- [ ] **Step 3: Add createModalProductId state**

After line 117 (createModalOpen state), add:

```typescript
const [createModalProductId, setCreateModalProductId] = useState<string>('')
```

- [ ] **Step 4: Pass new props to DataTableShell**

In DataTableShell render (around line 234), add:

```typescript
<DataTableShell
  entityType={entityType}
  queryClient={queryClient}
  columns={columns}
  data={entityData ?? []}
  pagination={pagination}
  isLoading={isLoading}
  onSaveColumnPrefs={handleSaveColumnPrefs}
  onFiltersApply={handleFiltersApply}
  onExport={handleExport}
  expandedRowIds={expandedIds}
  variantsCache={variantsCache}
  onRowToggleExpand={handleRowToggleExpand}
  isLoadingVariants={id => loadingVariants.has(id)}
  onVariantClick={handleVariantClick}  // NEW
  onAddVariant={handleAddVariant}      // NEW
/>
```

- [ ] **Step 5: Update VariantCreateModal**

Update the VariantCreateModal render (around line 248):

```tsx
<VariantCreateModal
  open={createModalOpen && createModalType === 'product_variants'}
  onOpenChange={handleModalOpenChange}
  queryClient={queryClient}
  productId={createModalProductId}
/>
```

- [ ] **Step 6: Add VariantDetailModal for products view**

After the VariantDetailModal at line 426 (for variants entity), add:

```tsx
{entityType === 'products' && selectedVariantId && (
  <VariantDetailModal
    open={variantDetailOpen}
    onOpenChange={setVariantDetailOpen}
    entityId={selectedVariantId}
    queryClient={queryClient}
    onDeleted={() => {
      setVariantDetailOpen(false)
      setSelectedVariantId(null)
    }}
  />
)}
```

- [ ] **Step 7: Commit**

```bash
git add src/components/entity/EntityWorkspace.tsx
git commit -m "feat: add variant click and add handlers to EntityWorkspace"
```

---

## Task 5: Update VariantsSubTable

**Files:**
- Modify: `src/components/entity/VariantsSubTable.tsx`

- [ ] **Step 1: Update interface and destructuring**

Change interface to:

```typescript
interface VariantsSubTableProps {
  variants: VariantRow[]
  isLoading?: boolean
  productId: string
  onVariantClick?: (variantId: string, productId: string) => void
  onAddVariant?: (productId: string) => void
}
```

Update function signature:

```typescript
export function VariantsSubTable({
  variants,
  isLoading,
  productId,
  onVariantClick,
  onAddVariant,
}: VariantsSubTableProps) {
```

- [ ] **Step 2: Add "Add Variant" button and make rows clickable**

Replace the return content with:

```tsx
if (isLoading) {
  return (
    <div className="pl-8 py-3 bg-surface-container-low">
      <Skeleton className="h-16 w-full" />
    </div>
  )
}

if (variants.length === 0) {
  return (
    <div className="pl-8 py-3 bg-surface-container-low text-on-surface-variant text-body-sm flex justify-between items-center pr-4">
      <span>No variants found</span>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => onAddVariant?.(productId)}
        className="text-secondary"
      >
        <span className="material-symbols-outlined text-sm">add</span>
        {t('entity.create.variant.button')}
      </Button>
    </div>
  )
}

return (
  <div className="pl-8 py-2 bg-surface-container-low">
    <div className="flex justify-between items-center pr-4 mb-2">
      <table className="w-full text-body-sm">
        <thead>
          <tr className="border-b border-outline-variant">
            {columns.map(col => (
              <th
                key={col.id}
                className={`px-3 py-2 text-start text-on-surface-variant font-label-caps ${
                  col.type === 'currency' ? 'text-end' : ''
                }`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
      </table>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => onAddVariant?.(productId)}
        className="text-secondary"
      >
        <span className="material-symbols-outlined text-sm">add</span>
        {t('entity.create.variant.button')}
      </Button>
    </div>
    <table className="w-full text-body-sm">
      <tbody>
        {variants.map(variant => (
          <tr
            key={variant.id}
            className="border-t border-outline-variant/30 hover:bg-surface-container-high transition-colors cursor-pointer"
            onClick={() => onVariantClick?.(variant.id, productId)}
          >
            {columns.map(col => (
              <td
                key={col.id}
                className={`px-3 py-2 text-on-surface ${
                  col.type === 'currency'
                    ? 'text-right text-on-surface font-data-tabular tabular-nums'
                    : ''
                }`}
              >
                {col.type === 'currency'
                  ? formatCurrency(variant[col.id as keyof VariantRow] as number, locale)
                  : String(variant[col.id as keyof VariantRow] ?? '-')}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)
```

- [ ] **Step 3: Import Button component**

Add to imports at top:

```typescript
import { Button } from '@/components/ui/button'
```

- [ ] **Step 4: Commit**

```bash
git add src/components/entity/VariantsSubTable.tsx
git commit -m "feat: add click handlers and Add Variant button to VariantsSubTable"
```

---

## Task 6: Verify and Test

- [ ] **Step 1: Run type check**

```bash
cd /mnt/C/Accountant-SaaS && pnpm run typecheck
```

Expected: No TypeScript errors

- [ ] **Step 2: Run lint**

```bash
cd /mnt/C/Accountant-SaaS && pnpm run lint
```

Expected: No lint errors

- [ ] **Step 3: Run check:all**

```bash
cd /mnt/C/Accountant-SaaS && pnpm run check:all
```

Expected: All checks pass

- [ ] **Step 4: Commit final changes if needed**

```bash
git status
git add -u
git commit -m "chore: address any final issues"
```

---

## Spec Coverage Check

- ✅ VariantsSubTable rows clickable → Task 5
- ✅ "Add Variant" button in sub-table header → Task 5
- ✅ productId passed to VariantsSubTable → Tasks 3, 4
- ✅ onVariantClick callback wired → Tasks 2, 3, 4
- ✅ onAddVariant callback wired → Tasks 2, 3, 4
- ✅ VariantDetailModal opened on variant click → Task 4
- ✅ VariantCreateModal receives correct productId → Task 4
- ✅ Type definitions updated → Task 1