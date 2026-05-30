# Add Entity Creation Implementation Plan

**Goal:** Connect the "Add New" button in EntityWorkspace to create modals for products, warehouses, and product variants.

**Architecture:** Three new create modals that mirror the form fields in entity-layout-config.ts, wired to existing Rust create commands.

**Tech Stack:** React, TypeScript, Dialog, Button UI components, TanStack Query, tauri-specta bindings

---

## File Structure

```
src/components/entity/
  ProductCreateModal.tsx    # new - creates products
  WarehouseCreateModal.tsx  # new - creates warehouses
  VariantCreateModal.tsx    # new - creates variants (requires productId)
  EntityWorkspace.tsx       # modify - wire up button to modals
```

---

## Task 1: ProductCreateModal

**File:** Create `src/components/entity/ProductCreateModal.tsx`

**Fields from entity-layout-config:** company, name, category

```tsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { QueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { commands } from '@/lib/tauri-bindings'

interface ProductCreateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  queryClient: QueryClient
}

export function ProductCreateModal({
  open,
  onOpenChange,
  queryClient,
}: ProductCreateModalProps) {
  const { t } = useTranslation()
  const [form, setForm] = useState({ company: '', name: '', category: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!form.company.trim() || !form.name.trim() || !form.category.trim()) {
      setError(t('entity.create.error.required'))
      return
    }
    setIsSubmitting(true)
    setError('')
    const result = await commands.create(form.company, form.name, form.category)
    setIsSubmitting(false)
    if (result.status === 'ok') {
      queryClient.invalidateQueries({ queryKey: ['entity', 'products'] })
      onOpenChange(false)
      setForm({ company: '', name: '', category: '' })
    } else {
      setError(result.error ?? t('entity.create.error.failed'))
    }
  }

  const handleClose = (open: boolean) => {
    if (!open) {
      setForm({ company: '', name: '', category: '' })
      setError('')
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('entity.create.product.title')}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-label-caps text-on-surface-variant">
              {t('entity.layout.products.columns.company')}
            </label>
            <input
              className="w-full bg-surface-container-high border border-outline-variant text-on-surface font-body-md px-3 py-2 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none"
              value={form.company}
              onChange={e => setForm(p => ({ ...p, company: e.target.value }))}
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-1">
            <label className="text-label-caps text-on-surface-variant">
              {t('entity.layout.products.columns.name')}
            </label>
            <input
              className="w-full bg-surface-container-high border border-outline-variant text-on-surface font-body-md px-3 py-2 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none"
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-1 col-span-2">
            <label className="text-label-caps text-on-surface-variant">
              {t('entity.layout.products.columns.category')}
            </label>
            <input
              className="w-full bg-surface-container-high border border-outline-variant text-on-surface font-body-md px-3 py-2 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none"
              value={form.category}
              onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
              disabled={isSubmitting}
            />
          </div>
        </div>
        {error && <p className="text-body-sm text-error">{error}</p>}
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <span className="material-symbols-outlined text-sm animate-spin">
                sync
              </span>
            ) : (
              <span className="material-symbols-outlined text-sm">add</span>
            )}
            {t('entity.create.button')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

---

## Task 2: WarehouseCreateModal

**File:** Create `src/components/entity/WarehouseCreateModal.tsx`

**Fields from entity-layout-config:** name, location

```tsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { QueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { commands } from '@/lib/tauri-bindings'

interface WarehouseCreateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  queryClient: QueryClient
}

export function WarehouseCreateModal({
  open,
  onOpenChange,
  queryClient,
}: WarehouseCreateModalProps) {
  const { t } = useTranslation()
  const [form, setForm] = useState({ name: '', location: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.location.trim()) {
      setError(t('entity.create.error.required'))
      return
    }
    setIsSubmitting(true)
    setError('')
    const result = await commands.warehousesCreate(form.name, form.location)
    setIsSubmitting(false)
    if (result.status === 'ok') {
      queryClient.invalidateQueries({ queryKey: ['entity', 'warehouses'] })
      onOpenChange(false)
      setForm({ name: '', location: '' })
    } else {
      setError(result.error ?? t('entity.create.error.failed'))
    }
  }

  const handleClose = (open: boolean) => {
    if (!open) {
      setForm({ name: '', location: '' })
      setError('')
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('entity.create.warehouse.title')}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-label-caps text-on-surface-variant">
              {t('entity.layout.warehouses.columns.name')}
            </label>
            <input
              className="w-full bg-surface-container-high border border-outline-variant text-on-surface font-body-md px-3 py-2 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none"
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-1">
            <label className="text-label-caps text-on-surface-variant">
              {t('entity.layout.warehouses.columns.location')}
            </label>
            <input
              className="w-full bg-surface-container-high border border-outline-variant text-on-surface font-body-md px-3 py-2 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none"
              value={form.location}
              onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
              disabled={isSubmitting}
            />
          </div>
        </div>
        {error && <p className="text-body-sm text-error">{error}</p>}
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <span className="material-symbols-outlined text-sm animate-spin">
                sync
              </span>
            ) : (
              <span className="material-symbols-outlined text-sm">add</span>
            )}
            {t('entity.create.button')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

---

## Task 3: VariantCreateModal

**File:** Create `src/components/entity/VariantCreateModal.tsx`

**Fields from entity-layout-config:** sku, variant_name, uom_id, retail_price, wholesale_price, distribution_price

**Props:** Requires `productId` since variants must be linked to a product

```tsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { QueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { commands } from '@/lib/tauri-bindings'
import type { NewVariant } from '@/lib/bindings'

interface VariantCreateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  queryClient: QueryClient
  productId: string
}

export function VariantCreateModal({
  open,
  onOpenChange,
  queryClient,
  productId,
}: VariantCreateModalProps) {
  const { t } = useTranslation()
  const [form, setForm] = useState({
    sku: '',
    variant_name: '',
    uom_id: '',
    retail_price: '',
    wholesale_price: '',
    distribution_price: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!form.sku.trim() || !form.variant_name.trim()) {
      setError(t('entity.create.error.required'))
      return
    }
    setIsSubmitting(true)
    setError('')
    const variant: NewVariant = {
      product_id: productId,
      sku: form.sku,
      variant_name: form.variant_name,
      uom_id: form.uom_id,
      retail_price: parseFloat(form.retail_price) || 0,
      wholesale_price: parseFloat(form.wholesale_price) || 0,
      distribution_price: parseFloat(form.distribution_price) || 0,
    }
    const result = await commands.variantsCreate(variant)
    setIsSubmitting(false)
    if (result.status === 'ok') {
      queryClient.invalidateQueries({
        queryKey: ['entity', 'product_variants'],
      })
      onOpenChange(false)
      setForm({
        sku: '',
        variant_name: '',
        uom_id: '',
        retail_price: '',
        wholesale_price: '',
        distribution_price: '',
      })
    } else {
      setError(result.error ?? t('entity.create.error.failed'))
    }
  }

  const handleClose = (open: boolean) => {
    if (!open) {
      setForm({
        sku: '',
        variant_name: '',
        uom_id: '',
        retail_price: '',
        wholesale_price: '',
        distribution_price: '',
      })
      setError('')
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('entity.create.variant.title')}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-label-caps text-on-surface-variant">
              {t('entity.layout.product_variants.columns.sku')}
            </label>
            <input
              className="w-full bg-surface-container-high border border-outline-variant text-on-surface font-body-md px-3 py-2 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none"
              value={form.sku}
              onChange={e => setForm(p => ({ ...p, sku: e.target.value }))}
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-1">
            <label className="text-label-caps text-on-surface-variant">
              {t('entity.layout.product_variants.columns.variant_name')}
            </label>
            <input
              className="w-full bg-surface-container-high border border-outline-variant text-on-surface font-body-md px-3 py-2 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none"
              value={form.variant_name}
              onChange={e =>
                setForm(p => ({ ...p, variant_name: e.target.value }))
              }
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-1">
            <label className="text-label-caps text-on-surface-variant">
              {t('entity.layout.product_variants.columns.uom')}
            </label>
            <input
              className="w-full bg-surface-container-high border border-outline-variant text-on-surface font-body-md px-3 py-2 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none"
              value={form.uom_id}
              onChange={e => setForm(p => ({ ...p, uom_id: e.target.value }))}
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-1">
            <label className="text-label-caps text-on-surface-variant">
              {t('entity.layout.product_variants.columns.retail')}
            </label>
            <input
              type="number"
              className="w-full bg-surface-container-high border border-outline-variant text-on-surface font-body-md px-3 py-2 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none"
              value={form.retail_price}
              onChange={e =>
                setForm(p => ({ ...p, retail_price: e.target.value }))
              }
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-1">
            <label className="text-label-caps text-on-surface-variant">
              {t('entity.layout.product_variants.columns.wholesale')}
            </label>
            <input
              type="number"
              className="w-full bg-surface-container-high border border-outline-variant text-on-surface font-body-md px-3 py-2 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none"
              value={form.wholesale_price}
              onChange={e =>
                setForm(p => ({ ...p, wholesale_price: e.target.value }))
              }
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-1">
            <label className="text-label-caps text-on-surface-variant">
              {t('entity.layout.product_variants.columns.distribution')}
            </label>
            <input
              type="number"
              className="w-full bg-surface-container-high border border-outline-variant text-on-surface font-body-md px-3 py-2 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none"
              value={form.distribution_price}
              onChange={e =>
                setForm(p => ({ ...p, distribution_price: e.target.value }))
              }
              disabled={isSubmitting}
            />
          </div>
        </div>
        {error && <p className="text-body-sm text-error">{error}</p>}
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <span className="material-symbols-outlined text-sm animate-spin">
                sync
              </span>
            ) : (
              <span className="material-symbols-outlined text-sm">add</span>
            )}
            {t('entity.create.button')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

---

## Task 4: Wire Up EntityWorkspace

**File:** Modify `src/components/entity/EntityWorkspace.tsx`

**Changes:**

1. Import the three create modals
2. Add state for controlling which modal is open
3. Add state for `selectedProductId` (needed for variant creation)
4. Pass `onOpenChange` handler to `EntityHeader`
5. Wire button in EntityHeader to open appropriate modal
6. Render the modals at the bottom of the component

**Add imports (after existing imports):**

```tsx
import { ProductCreateModal } from './ProductCreateModal'
import { WarehouseCreateModal } from './WarehouseCreateModal'
import { VariantCreateModal } from './VariantCreateModal'
```

**Add state in EntityWorkspace component:**

```tsx
const [createModalOpen, setCreateModalOpen] = useState(false)
const [createModalType, setCreateModalType] = useState<
  'products' | 'warehouses' | 'product_variants' | null
>(null)
const [selectedProductId, setSelectedProductId] = useState<string>('')
```

**Add click handler in EntityHeader (or pass handleAddNew via props):**
The EntityHeader receives `entityType` and needs to communicate back. Option: pass `onAddNewClick` callback from parent.

**EntityHeader change:**

```tsx
function EntityHeader({
  entityType,
  onAddNewClick,
}: {
  entityType: string
  onAddNewClick?: () => void
}) {
  // ... existing code ...

  return (
    <header className="flex flex-col gap-2 px-margin-edge pb-6 bg-surface shadow-sm shrink-0">
      <div className="flex items-center justify-between">
        {/* ... existing left side ... */}
        <button
          className="bg-secondary text-on-secondary px-4 py-2 rounded shadow-sm hover:opacity-90 active:scale-95 transition-all font-label-caps text-label-caps flex items-center gap-2"
          onClick={onAddNewClick}
        >
          <span className="material-symbols-outlined">add</span>
          {addNewLabel.toUpperCase()}
        </button>
      </div>
    </header>
  )
}
```

**In EntityWorkspace, add handler:**

```tsx
const handleAddNewClick = useCallback(() => {
  setCreateModalType(
    entityType as 'products' | 'warehouses' | 'product_variants'
  )
  setCreateModalOpen(true)
}, [entityType])
```

**Update EntityHeader usage:**

```tsx
<EntityHeader entityType={entityType} onAddNewClick={handleAddNewClick} />
```

**Render modals before closing div:**

```tsx
<ProductCreateModal
  open={createModalOpen && createModalType === 'products'}
  onOpenChange={setCreateModalOpen}
  queryClient={queryClient}
/>
<WarehouseCreateModal
  open={createModalOpen && createModalType === 'warehouses'}
  onOpenChange={setCreateModalOpen}
  queryClient={queryClient}
/>
<VariantCreateModal
  open={createModalOpen && createModalType === 'product_variants'}
  onOpenChange={setCreateModalOpen}
  queryClient={queryClient}
  productId={selectedProductId}
/>
```

**Note:** For product_variants, the button should only work when a product is selected in context. For now, show an alert or disable if no product context.

---

## Task 5: Add i18n Keys

**Files to update:** `src/locales/*.json`

**New keys needed:**

```json
{
  "entity": {
    "create": {
      "product": {
        "title": "Add New Product"
      },
      "warehouse": {
        "title": "Add New Warehouse"
      },
      "variant": {
        "title": "Add New Variant"
      },
      "button": "Create",
      "error": {
        "required": "All required fields must be filled",
        "failed": "Failed to create"
      }
    }
  }
}
```

---

## Task 6: Verify and Test

1. Run `pnpm run check:all` to verify types and lint
2. Start the dev server: `pnpm run tauri dev`
3. Test each entity type:
   - Products: Click "Add New Product" → fill form → Create → verify table refreshes
   - Warehouses: Click "Add New Warehouse" → fill form → Create → verify table refreshes
   - Variants: Verify button is disabled or shows message about needing product context

---

## Spec Coverage Check

| Spec Requirement                 | Task      |
| -------------------------------- | --------- |
| ProductCreateModal               | Task 1    |
| WarehouseCreateModal             | Task 2    |
| VariantCreateModal               | Task 3    |
| Wire button to open modals       | Task 4    |
| Fields from entity-layout-config | Tasks 1-3 |
| Call existing create commands    | Tasks 1-3 |
| Invalidate query cache           | Tasks 1-3 |
| i18n keys                        | Task 5    |
| Testing                          | Task 6    |

---

**Plan complete and saved to `docs/superpowers/plans/2026-05-30-add-entity-creation.md`.**

**Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
