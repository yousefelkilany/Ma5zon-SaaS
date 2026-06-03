# Entity Forms Integration & Stock Transfer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace custom inline forms with reusable entity-form components, add inline stock transfer to StockLevelsTable, and add unsaved-changes protection to detail modals.

**Architecture:** Three independent changes: (1) swap create modals to use reusable forms, (2) swap detail modals to use forms + dirty tracking, (3) add inline transfer UI to StockLevelsTable.

**Tech Stack:** React 19, TanStack Form, Tailwind CSS, Tauri commands

---

## File Structure

| File | Responsibility |
|------|----------------|
| `src/components/entity/ProductCreateModal.tsx` | Create product modal — swap to `<ProductForm>` |
| `src/components/entity/WarehouseCreateModal.tsx` | Create warehouse modal — swap to `<WarehouseForm>` |
| `src/components/entity/VariantCreateModal.tsx` | Create variant modal — swap to `<VariantForm>` |
| `src/components/entity/ProductDetailModal.tsx` | Edit product modal — swap to `<ProductForm>` + dirty state |
| `src/components/entity/VariantDetailModal.tsx` | Edit variant modal — swap to `<VariantForm>` + dirty state |
| `src/components/entity/WarehouseDetailModal.tsx` | Edit warehouse modal — swap to `<WarehouseForm>` + dirty state |
| `src/components/entity/StockLevelsTable.tsx` | Add transfer button + inline transfer UI to both views |
| `src/components/entity-form/ProductForm.tsx` | Supports `initialValues` already |
| `src/components/entity-form/VariantForm.tsx` | Supports `initialValues` already |
| `src/components/entity-form/WarehouseForm.tsx` | Supports `initialValues` already |
| `src/components/entity-form/StockMovementForm.tsx` | Already exists, needs `variantId` prop support |
| `src/components/ui/dialog.tsx` | Check if close button can be disabled |

---

## Task 1: Update ProductCreateModal to use ProductForm

**Files:**
- Modify: `src/components/entity/ProductCreateModal.tsx`

- [ ] **Step 1: Read current file**

Verify current structure matches what was read earlier.

- [ ] **Step 2: Replace form with ProductForm**

```tsx
import { ProductForm } from '@/components/entity-form'

// Replace the entire <form> block (lines 90-168) with:
<ProductForm
  onSubmit={async (values) => {
    setIsSubmitting(true)
    try {
      const result = await commands.create(values.company, values.name, values.category)
      if (result.status === 'ok') {
        queryClient.invalidateQueries({ queryKey: ['entity', 'products'] })
        onOpenChange(false)
      } else {
        toast.error(result.error)
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setIsSubmitting(false)
    }
  }}
  isLoading={isSubmitting}
  initialValues={{ company: '', name: '', category: '' }}
/>
```

Keep existing state: `open`, `onOpenChange`, `queryClient`, `useEffect` for reset on close. Remove unused state (`company`, `name`, `category`, `errors`). Remove `handleSubmit` and `handleCancel` functions. Remove `createProductSchema` import. Remove DialogFooter buttons — `<ProductForm>` already has submit button.

- [ ] **Step 3: Verify no compile errors**

Run: `pnpm tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add src/components/entity/ProductCreateModal.tsx
git commit -m "refactor: use ProductForm in ProductCreateModal"
```

---

## Task 2: Update WarehouseCreateModal to use WarehouseForm

**Files:**
- Modify: `src/components/entity/WarehouseCreateModal.tsx`

- [ ] **Step 1: Replace form with WarehouseForm**

```tsx
import { WarehouseForm } from '@/components/entity-form'

// Replace <form> block with:
<WarehouseForm
  onSubmit={async (values) => {
    setIsSubmitting(true)
    try {
      const result = await commands.warehousesCreate(values.name, values.location)
      if (result.status === 'ok') {
        queryClient.invalidateQueries({ queryKey: ['entity', 'warehouses'] })
        onOpenChange(false)
      } else {
        toast.error(result.error)
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setIsSubmitting(false)
    }
  }}
  isLoading={isSubmitting}
  initialValues={{ name: '', location: '' }}
/>
```

Remove unused state (`name`, `location`, `errors`). Remove `handleSubmit`, `handleCancel`, `createWarehouseSchema`. Remove DialogFooter buttons — `WarehouseForm` has its own.

- [ ] **Step 2: Verify no compile errors**

Run: `pnpm tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/components/entity/WarehouseCreateModal.tsx
git commit -m "refactor: use WarehouseForm in WarehouseCreateModal"
```

---

## Task 3: Update VariantCreateModal to use VariantForm

**Files:**
- Modify: `src/components/entity/VariantCreateModal.tsx`

- [ ] **Step 1: Replace form with VariantForm**

```tsx
import { VariantForm } from '@/components/entity-form'

// Replace <form> block with:
<VariantForm
  productId={productId}
  onSubmit={async (values) => {
    setIsSubmitting(true)
    try {
      const result = await commands.variantsCreate({
        product_id: productId,
        sku: values.sku,
        variant_name: values.variant_name,
        uom_id: values.uom_id,
        retail_price: values.retail_price ?? 0,
        wholesale_price: values.wholesale_price ?? 0,
        distribution_price: values.distribution_price ?? 0,
      })
      if (result.status === 'ok') {
        queryClient.invalidateQueries({ queryKey: ['entity', 'product_variants'] })
        onOpenChange(false)
      } else {
        toast.error(result.error)
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setIsSubmitting(false)
    }
  }}
  isLoading={isSubmitting}
  initialValues={{
    sku: '',
    variant_name: '',
    uom_id: '',
    retail_price: undefined,
    wholesale_price: undefined,
    distribution_price: undefined,
  }}
/>
```

Remove unused state, `handleSubmit`, `handleCancel`, `createVariantSchema`. Remove DialogFooter buttons — `VariantForm` has its own.

- [ ] **Step 2: Verify no compile errors**

Run: `pnpm tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/components/entity/VariantCreateModal.tsx
git commit -m "refactor: use VariantForm in VariantCreateModal"
```

---

## Task 4: Update ProductDetailModal to use ProductForm with dirty state

**Files:**
- Modify: `src/components/entity/ProductDetailModal.tsx`

- [ ] **Step 1: Add dirty state tracking**

Add after line 75 (`fieldErrors` state):
```tsx
const [isDirty, setIsDirty] = useState(false)
```

- [ ] **Step 2: Add useEffect to track dirty state**

Add a `useEffect` that watches `editForm` and sets `isDirty` to true when form differs from initial values. When `entity` loads, reset `isDirty` to false.

- [ ] **Step 3: Replace edit form fields with ProductForm**

Import `ProductForm` from `@/components/entity-form`.

Replace the details tab content (fields + buttons) with:
```tsx
<ProductForm
  onSubmit={handleSave}
  isLoading={isSaving}
  initialValues={editForm}
  schema={updateProductSchema}
/>
```

Keep the existing `handleSave` function. Remove the manual field rendering code (label + input pairs for company, name, category). Keep the tabs and skeleton loading states.

- [ ] **Step 4: Disable X close button when dirty**

Find the Dialog's `onOpenChange`. Wrap it:
```tsx
onOpenChange={(open) => {
  if (!open && isDirty) return
  onOpenChange(open)
}}
```

- [ ] **Step 5: Verify no compile errors**

Run: `pnpm tsc --noEmit`

- [ ] **Step 6: Commit**

```bash
git add src/components/entity/ProductDetailModal.tsx
git commit -m "refactor: use ProductForm in ProductDetailModal with dirty state"
```

---

## Task 5: Update VariantDetailModal to use VariantForm with dirty state

**Files:**
- Modify: `src/components/entity/VariantDetailModal.tsx`

- [ ] **Step 1: Add dirty state**

Add after line 106 (`fieldErrors` state):
```tsx
const [isDirty, setIsDirty] = useState(false)
```

- [ ] **Step 2: Add useEffect to track dirty state**

Watch `editForm` and `entity`. When entity loads, reset `isDirty` to false. On any editForm change, set `isDirty` to true.

- [ ] **Step 3: Replace details tab form with VariantForm**

Import `VariantForm` from `@/components/entity-form`.

In the details tab, replace field rendering with:
```tsx
<VariantForm
  onSubmit={handleSave}
  isLoading={isSaving}
  initialValues={{
    sku: editForm.sku,
    variant_name: editForm.variant_name,
    uom_id: editForm.uom_id,
    retail_price: editForm.retail_price ? parseFloat(editForm.retail_price) : undefined,
    wholesale_price: editForm.wholesale_price ? parseFloat(editForm.wholesale_price) : undefined,
    distribution_price: editForm.distribution_price ? parseFloat(editForm.distribution_price) : undefined,
  }}
  schema={updateVariantSchema}
/>
```

- [ ] **Step 4: Disable X close button when dirty**

Same pattern as Task 4 Step 4.

- [ ] **Step 5: Verify no compile errors**

Run: `pnpm tsc --noEmit`

- [ ] **Step 6: Commit**

```bash
git add src/components/entity/VariantDetailModal.tsx
git commit -m "refactor: use VariantForm in VariantDetailModal with dirty state"
```

---

## Task 6: Update WarehouseDetailModal to use WarehouseForm with dirty state

**Files:**
- Modify: `src/components/entity/WarehouseDetailModal.tsx`

- [ ] **Step 1: Add dirty state**

Add after line 62 (`fieldErrors` state):
```tsx
const [isDirty, setIsDirty] = useState(false)
```

- [ ] **Step 2: Track dirty state**

Add `useEffect` that resets `isDirty` when entity loads and sets it true when `editForm` changes.

- [ ] **Step 3: Replace details tab form with WarehouseForm**

Import `WarehouseForm` from `@/components/entity-form`.

Replace details tab fields with:
```tsx
<WarehouseForm
  onSubmit={handleSave}
  isLoading={isSaving}
  initialValues={editForm}
  schema={updateWarehouseSchema}
/>
```

- [ ] **Step 4: Disable X close button when dirty**

Same pattern as Task 4 Step 4.

- [ ] **Step 5: Verify no compile errors**

Run: `pnpm tsc --noEmit`

- [ ] **Step 6: Commit**

```bash
git add src/components/entity/WarehouseDetailModal.tsx
git commit -m "refactor: use WarehouseForm in WarehouseDetailModal with dirty state"
```

---

## Task 7: Add inline stock transfer to StockLevelsTable

**Files:**
- Modify: `src/components/entity/StockLevelsTable.tsx`

- [ ] **Step 1: Add state for transfer section**

Add to top of component:
```tsx
const [transferState, setTransferState] = useState<{
  variantId: string
  warehouseId: string
  fromWarehouseId: string
} | null>(null)
```

- [ ] **Step 2: Update VariantStockView to add transfer button**

In `VariantStockView`, add to each row after the quantity cell:
```tsx
<button
  onClick={() => setTransferState({
    variantId: stockLevels[0]?.variant_id ?? '',
    warehouseId: level.warehouse_id,
    fromWarehouseId: level.warehouse_id,
  })}
  className="ml-2 text-secondary hover:opacity-70"
  title={t('entity.stock.transfer')}
>
  <span className="material-symbols-outlined text-sm">swap_horiz</span>
</button>
```

- [ ] **Step 3: Update ProductStockPivot to add transfer button**

In `ProductStockPivot`, add to each cell after the quantity display:
```tsx
<button
  onClick={() => setTransferState({
    variantId: row.variantId,
    warehouseId: col,
    fromWarehouseId: col,
  })}
  className="ml-1 text-secondary hover:opacity-70 opacity-0 group-hover:opacity-100"
  title={t('entity.stock.transfer')}
>
  <span className="material-symbols-outlined text-xs">swap_horiz</span>
</button>
```

Wrap the `<td>` in a group: `className="px-3 py-2 text-end ... group"`

- [ ] **Step 4: Add inline transfer section component**

Add at bottom of file (after both view components):
```tsx
function InlineTransferSection({
  variantId,
  warehouseId,
  onClose,
}: {
  variantId: string
  warehouseId: string
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [toWarehouseId, setToWarehouseId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch warehouses for the toWarehouse dropdown
  const { data: warehouses } = useQuery({
    queryKey: ['warehouses', 'all'],
    queryFn: async () => {
      const result = await commands.warehousesGetAll([], [], null)
      if (result.status === 'ok') {
        return result.data
      }
      return []
    },
  })

  const toWarehouseOptions = warehouses
    ?.filter(w => w.id !== warehouseId)
    .map(w => ({ value: w.id, label: w.name })) ?? []

  const handleSubmit = async () => {
    if (!toWarehouseId || !quantity) return
    setIsSubmitting(true)
    try {
      await commands.stockMovementsCreate({
        variant_id: variantId,
        from_warehouse_id: warehouseId,
        to_warehouse_id: toWarehouseId,
        quantity: parseInt(quantity),
        movement_type: 'transfer',
      })
      onClose()
    } catch (err) {
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <tr className="bg-surface-bright/50">
      <td colSpan={3} className="px-3 py-3">
        <div className="flex items-center gap-3">
          <span className="text-body-sm text-on-surface-variant">
            {t('entity.stock.transferFrom')}
          </span>
          <select
            value={toWarehouseId}
            onChange={e => setToWarehouseId(e.target.value)}
            className="bg-surface border border-outline-variant rounded px-2 py-1 text-body-sm"
          >
            <option value="">{t('entity.stock.selectWarehouse')}</option>
            {toWarehouseOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <input
            type="number"
            value={quantity}
            onChange={e => setQuantity(e.target.value)}
            min="1"
            className="w-20 bg-surface border border-outline-variant rounded px-2 py-1 text-body-sm"
            placeholder={t('entity.stock.quantity')}
          />
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !toWarehouseId || !quantity}
            className="bg-secondary text-on-secondary px-3 py-1 rounded text-body-sm hover:opacity-90 disabled:opacity-50"
          >
            {t('entity.stock.confirm')}
          </button>
          <button
            onClick={onClose}
            className="text-body-sm text-on-surface-variant hover:text-on-surface"
          >
            {t('common.cancel')}
          </button>
        </div>
      </td>
    </tr>
  )
}
```

Note: Uses `useQuery` from `@tanstack/react-query` — needs import at top.

- [ ] **Step 5: Render transfer section after active row**

In `VariantStockView`, after the closing `</tr>` of each row, add conditional:
```tsx
{transferState?.warehouseId === level.warehouse_id && (
  <InlineTransferSection
    variantId={stockLevels[0]?.variant_id ?? ''}
    warehouseId={level.warehouse_id}
    onClose={() => setTransferState(null)}
  />
)}
```

In `ProductStockPivot`, after the `</tr>` of each row:
```tsx
{transferState?.variantId === row.variantId && transferState?.warehouseId === col && (
  <InlineTransferSection
    variantId={row.variantId}
    warehouseId={col}
    onClose={() => setTransferState(null)}
  />
)}
```

- [ ] **Step 6: Verify no compile errors**

Run: `pnpm tsc --noEmit`

- [ ] **Step 7: Commit**

```bash
git add src/components/entity/StockLevelsTable.tsx
git commit -m "feat: add inline stock transfer to StockLevelsTable"
```

---

## Task 8: Add dirty state to StockMovementForm for create scenarios

**Files:**
- Modify: `src/components/entity-form/StockMovementForm.tsx`

- [ ] **Step 1: Add variantId prop support**

Add `variantId?: string` prop. When provided, pre-fill `variant_id` field and disable it.

- [ ] **Step 2: Verify no compile errors**

Run: `pnpm tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/components/entity-form/StockMovementForm.tsx
git commit -m "feat: StockMovementForm supports pre-filled variantId"
```

---

## Verification

- [ ] Run `pnpm run check:all`
- [ ] Run existing tests: `pnpm test`
- [ ] Manual: Open create product modal — form renders correctly
- [ ] Manual: Open edit product modal — fields populated, X disabled when dirty
- [ ] Manual: Open stock tab in variant detail — transfer buttons visible on rows
- [ ] Manual: Click transfer button — inline transfer section appears below row
- [ ] Manual: Select to warehouse, enter quantity, confirm — section closes

---

**Plan complete and saved to `docs/superpowers/plans/2026-06-03-entity-forms-stock-transfer-plan.md`**

Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?