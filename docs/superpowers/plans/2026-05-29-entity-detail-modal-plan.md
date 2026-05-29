# Entity Detail Modal — CRUD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the skeleton `EntityDetailModal` with typed, self-contained modals per entity type (Product, Warehouse, Variant) with inline editing and delete confirmation.

**Architecture:** Each typed modal owns its data fetching via existing Rust commands (`getById`, `update`, `delete`), maintains local edit state, and delegates delete confirmation to a shared `ConfirmationDialog` component.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Radix UI Dialog, TanStack Query (for cache invalidation), tauri-specta bindings

---

## File Structure

```
src/components/entity/
├── ConfirmationDialog.tsx       # Create — shared delete confirmation
├── ProductDetailModal.tsx       # Create — typed product modal
├── WarehouseDetailModal.tsx    # Create — typed warehouse modal
├── VariantDetailModal.tsx       # Create — typed variant modal
└── index.ts                    # Create — re-exports

src/components/entity/EntityDetailModal.tsx  # Delete — replaced by typed modals
src/components/entity/DataTable.tsx           # Modify — wire edit/delete buttons
```

---

## Task 1: Create ConfirmationDialog

**Files:**
- Create: `src/components/entity/ConfirmationDialog.tsx`

```tsx
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface ConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  isDestructive?: boolean
  isLoading?: boolean
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  isDestructive = true,
  isLoading = false,
}: ConfirmationDialogProps) {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            {cancelLabel ?? t('common.cancel')}
          </Button>
          <Button
            variant={isDestructive ? 'destructive' : 'default'}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="material-symbols-outlined text-sm animate-spin">
                sync
              </span>
            ) : null}
            {confirmLabel ?? t('common.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 1: Create ConfirmationDialog.tsx**

Create the file at `src/components/entity/ConfirmationDialog.tsx` with the code above.

- [ ] **Step 2: Commit**

```bash
git add src/components/entity/ConfirmationDialog.tsx
git commit -m "feat: add shared ConfirmationDialog component"
```

---

## Task 2: Create ProductDetailModal

**Files:**
- Create: `src/components/entity/ProductDetailModal.tsx`

- [ ] **Step 1: Create ProductDetailModal.tsx**

```tsx
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { commands } from '@/lib/tauri-bindings'
import { ConfirmationDialog } from './ConfirmationDialog'

interface ProductDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entityId: string
  onDeleted?: () => void
}

interface Product {
  id: string
  company: string
  name: string
  category: string
  created_at: string | null
  updated_at: string | null
  deleted_at: string | null
}

type TabId = 'details' | 'insights' | 'audits'

interface FieldConfig {
  key: keyof Product
  label: string
  type: 'text' | 'date'
}

const PRODUCT_FIELDS: FieldConfig[] = [
  { key: 'company', label: 'entity.product.company', type: 'text' },
  { key: 'name', label: 'entity.product.name', type: 'text' },
  { key: 'category', label: 'entity.product.category', type: 'text' },
  { key: 'created_at', label: 'entity.common.createdAt', type: 'date' },
  { key: 'updated_at', label: 'entity.common.updatedAt', type: 'date' },
]

export function ProductDetailModal({
  open,
  onOpenChange,
  entityId,
  onDeleted,
}: ProductDetailModalProps) {
  const { t } = useTranslation()
  const [entity, setEntity] = useState<Product | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({ company: '', name: '', category: '' })
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [activeTab, setActiveTab] = useState<TabId>('details')

  const tabs: { id: TabId; label: string }[] = [
    { id: 'details', label: t('entity.detail.tabs.details') },
    { id: 'insights', label: t('entity.detail.tabs.insights') },
    { id: 'audits', label: t('entity.detail.tabs.audits') },
  ]

  useEffect(() => {
    if (open && entityId) {
      loadEntity()
    }
  }, [open, entityId])

  useEffect(() => {
    if (!open) {
      setEntity(null)
      setIsLoading(true)
      setIsEditing(false)
      setEditForm({ company: '', name: '', category: '' })
      setActiveTab('details')
    }
  }, [open])

  async function loadEntity() {
    setIsLoading(true)
    const result = await commands.getById(entityId)
    setIsLoading(false)
    if (result.status === 'ok' && result.data) {
      setEntity(result.data)
      setEditForm({
        company: result.data.company,
        name: result.data.name,
        category: result.data.category,
      })
    }
  }

  async function handleSave() {
    if (!entity) return
    setIsSaving(true)
    const result = await commands.update(
      entity.id,
      editForm.company,
      editForm.name,
      editForm.category
    )
    setIsSaving(false)
    if (result.status === 'ok') {
      setEntity(result.data)
      setIsEditing(false)
    }
  }

  async function handleDelete() {
    if (!entity) return
    setIsDeleting(true)
    setDeleteError('')
    const result = await commands.delete(entity.id)
    setIsDeleting(false)
    if (result.status === 'ok') {
      setShowDeleteConfirm(false)
      onOpenChange(false)
      onDeleted?.()
    } else {
      setDeleteError(result.error ?? 'Delete failed')
    }
  }

  function handleCancelEdit() {
    if (entity) {
      setEditForm({
        company: entity.company,
        name: entity.name,
        category: entity.category,
      })
    }
    setIsEditing(false)
  }

  function handleEdit() {
    if (entity) {
      setEditForm({
        company: entity.company,
        name: entity.name,
        category: entity.category,
      })
    }
    setIsEditing(true)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <div className="flex flex-col h-full">
            {/* Tab Bar */}
            <div
              className="flex border-b border-outline-variant mb-4"
              role="tablist"
            >
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  id={`${tab.id}-tab`}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  aria-controls={`${tab.id}-panel`}
                  tabIndex={activeTab === tab.id ? 0 : -1}
                  className={`px-4 py-2 text-body-sm font-medium transition-colors border-b-2 -mb-px ${
                    activeTab === tab.id
                      ? 'border-secondary text-secondary'
                      : 'border-transparent text-on-surface-variant hover:text-on-surface'
                  }`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-auto">
              {activeTab === 'details' && (
                <div id="details-panel" role="tabpanel" aria-labelledby="details-tab">
                  {isLoading ? (
                    <div className="grid grid-cols-2 gap-4">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="space-y-1">
                          <Skeleton className="h-3 w-20" />
                          <Skeleton className="h-5 w-full" />
                        </div>
                      ))}
                    </div>
                  ) : entity ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        {PRODUCT_FIELDS.map(field => (
                          <div key={field.key} className="space-y-1">
                            <label className="text-label-caps text-label-caps text-on-surface-variant">
                              {t(field.label)}
                            </label>
                            {isEditing && field.type === 'text' ? (
                              <input
                                className="w-full bg-surface-container-high border border-outline-variant text-on-surface font-body-md px-3 py-2 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none"
                                value={editForm[field.key] as string}
                                onChange={e =>
                                  setEditForm(prev => ({
                                    ...prev,
                                    [field.key]: e.target.value,
                                  }))
                                }
                                disabled={isSaving}
                              />
                            ) : (
                              <p className="text-body-md text-on-surface">
                                {field.type === 'date'
                                  ? entity[field.key]
                                    ? new Date(entity[field.key]!).toLocaleString()
                                    : '—'
                                  : entity[field.key] ?? '—'}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Footer Actions */}
                      <div className="flex items-center justify-between pt-4 border-t border-outline-variant">
                        <Button
                          variant="ghost"
                          className="text-error"
                          onClick={() => setShowDeleteConfirm(true)}
                        >
                          <span className="material-symbols-outlined text-sm">
                            delete
                          </span>
                          {t('entity.detail.delete')}
                        </Button>
                        <div className="flex gap-2">
                          {isEditing ? (
                            <>
                              <Button
                                variant="outline"
                                onClick={handleCancelEdit}
                                disabled={isSaving}
                              >
                                {t('common.cancel')}
                              </Button>
                              <Button onClick={handleSave} disabled={isSaving}>
                                {isSaving ? (
                                  <span className="material-symbols-outlined text-sm animate-spin">
                                    sync
                                  </span>
                                ) : (
                                  <span className="material-symbols-outlined text-sm">
                                    save
                                  </span>
                                )}
                                {t('common.save')}
                              </Button>
                            </>
                          ) : (
                            <Button onClick={handleEdit}>
                              <span className="material-symbols-outlined text-sm">
                                edit
                              </span>
                              {t('entity.detail.edit')}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-body-md text-on-surface-variant">
                      {t('entity.detail.notFound')}
                    </p>
                  )}
                </div>
              )}

              {activeTab === 'insights' && (
                <div id="insights-panel" role="tabpanel" aria-labelledby="insights-tab">
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="space-y-1">
                          <Skeleton className="h-3 w-16" />
                          <Skeleton className="h-8 w-full" />
                        </div>
                      ))}
                    </div>
                    <Skeleton className="h-48 w-full rounded-lg" />
                  </div>
                </div>
              )}

              {activeTab === 'audits' && (
                <div id="audits-panel" role="tabpanel" aria-labelledby="audits-tab">
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <div className="flex-1 space-y-1">
                          <Skeleton className="h-4 w-48" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title={t('entity.detail.deleteConfirmTitle', {
          name: entity?.name ?? '',
        })}
        description={t('entity.detail.deleteConfirmMessage')}
        onConfirm={handleDelete}
        isDestructive
        isLoading={isDeleting}
      />
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/entity/ProductDetailModal.tsx
git commit -m "feat: add ProductDetailModal with inline edit and delete"
```

---

## Task 3: Create WarehouseDetailModal

**Files:**
- Create: `src/components/entity/WarehouseDetailModal.tsx`

- [ ] **Step 1: Create WarehouseDetailModal.tsx**

```tsx
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { commands } from '@/lib/tauri-bindings'
import { ConfirmationDialog } from './ConfirmationDialog'

interface WarehouseDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entityId: string
  onDeleted?: () => void
}

interface Warehouse {
  id: string
  name: string
  location: string
  created_at: string | null
  updated_at: string | null
  deleted_at: string | null
}

type TabId = 'details' | 'insights' | 'audits'

interface FieldConfig {
  key: keyof Warehouse
  label: string
  type: 'text' | 'date'
}

const WAREHOUSE_FIELDS: FieldConfig[] = [
  { key: 'name', label: 'entity.warehouse.name', type: 'text' },
  { key: 'location', label: 'entity.warehouse.location', type: 'text' },
  { key: 'created_at', label: 'entity.common.createdAt', type: 'date' },
  { key: 'updated_at', label: 'entity.common.updatedAt', type: 'date' },
]

export function WarehouseDetailModal({
  open,
  onOpenChange,
  entityId,
  onDeleted,
}: WarehouseDetailModalProps) {
  const { t } = useTranslation()
  const [entity, setEntity] = useState<Warehouse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', location: '' })
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [activeTab, setActiveTab] = useState<TabId>('details')

  const tabs: { id: TabId; label: string }[] = [
    { id: 'details', label: t('entity.detail.tabs.details') },
    { id: 'insights', label: t('entity.detail.tabs.insights') },
    { id: 'audits', label: t('entity.detail.tabs.audits') },
  ]

  useEffect(() => {
    if (open && entityId) {
      loadEntity()
    }
  }, [open, entityId])

  useEffect(() => {
    if (!open) {
      setEntity(null)
      setIsLoading(true)
      setIsEditing(false)
      setEditForm({ name: '', location: '' })
      setActiveTab('details')
    }
  }, [open])

  async function loadEntity() {
    setIsLoading(true)
    const result = await commands.warehousesGetById(entityId)
    setIsLoading(false)
    if (result.status === 'ok' && result.data) {
      setEntity(result.data)
      setEditForm({
        name: result.data.name,
        location: result.data.location,
      })
    }
  }

  async function handleSave() {
    if (!entity) return
    setIsSaving(true)
    const result = await commands.warehousesUpdate(
      entity.id,
      editForm.name,
      editForm.location
    )
    setIsSaving(false)
    if (result.status === 'ok') {
      setEntity(result.data)
      setIsEditing(false)
    }
  }

  async function handleDelete() {
    if (!entity) return
    setIsDeleting(true)
    setDeleteError('')
    const result = await commands.warehousesDelete(entity.id)
    setIsDeleting(false)
    if (result.status === 'ok') {
      setShowDeleteConfirm(false)
      onOpenChange(false)
      onDeleted?.()
    } else {
      setDeleteError(result.error ?? 'Delete failed')
    }
  }

  function handleCancelEdit() {
    if (entity) {
      setEditForm({ name: entity.name, location: entity.location })
    }
    setIsEditing(false)
  }

  function handleEdit() {
    if (entity) {
      setEditForm({ name: entity.name, location: entity.location })
    }
    setIsEditing(true)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <div className="flex flex-col h-full">
            {/* Tab Bar */}
            <div
              className="flex border-b border-outline-variant mb-4"
              role="tablist"
            >
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  id={`${tab.id}-tab`}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  aria-controls={`${tab.id}-panel`}
                  tabIndex={activeTab === tab.id ? 0 : -1}
                  className={`px-4 py-2 text-body-sm font-medium transition-colors border-b-2 -mb-px ${
                    activeTab === tab.id
                      ? 'border-secondary text-secondary'
                      : 'border-transparent text-on-surface-variant hover:text-on-surface'
                  }`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-auto">
              {activeTab === 'details' && (
                <div id="details-panel" role="tabpanel" aria-labelledby="details-tab">
                  {isLoading ? (
                    <div className="grid grid-cols-2 gap-4">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="space-y-1">
                          <Skeleton className="h-3 w-20" />
                          <Skeleton className="h-5 w-full" />
                        </div>
                      ))}
                    </div>
                  ) : entity ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        {WAREHOUSE_FIELDS.map(field => (
                          <div key={field.key} className="space-y-1">
                            <label className="text-label-caps text-label-caps text-on-surface-variant">
                              {t(field.label)}
                            </label>
                            {isEditing && field.type === 'text' ? (
                              <input
                                className="w-full bg-surface-container-high border border-outline-variant text-on-surface font-body-md px-3 py-2 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none"
                                value={editForm[field.key] as string}
                                onChange={e =>
                                  setEditForm(prev => ({
                                    ...prev,
                                    [field.key]: e.target.value,
                                  }))
                                }
                                disabled={isSaving}
                              />
                            ) : (
                              <p className="text-body-md text-on-surface">
                                {field.type === 'date'
                                  ? entity[field.key]
                                    ? new Date(entity[field.key]!).toLocaleString()
                                    : '—'
                                  : entity[field.key] ?? '—'}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Footer Actions */}
                      <div className="flex items-center justify-between pt-4 border-t border-outline-variant">
                        <Button
                          variant="ghost"
                          className="text-error"
                          onClick={() => setShowDeleteConfirm(true)}
                        >
                          <span className="material-symbols-outlined text-sm">
                            delete
                          </span>
                          {t('entity.detail.delete')}
                        </Button>
                        <div className="flex gap-2">
                          {isEditing ? (
                            <>
                              <Button
                                variant="outline"
                                onClick={handleCancelEdit}
                                disabled={isSaving}
                              >
                                {t('common.cancel')}
                              </Button>
                              <Button onClick={handleSave} disabled={isSaving}>
                                {isSaving ? (
                                  <span className="material-symbols-outlined text-sm animate-spin">
                                    sync
                                  </span>
                                ) : (
                                  <span className="material-symbols-outlined text-sm">
                                    save
                                  </span>
                                )}
                                {t('common.save')}
                              </Button>
                            </>
                          ) : (
                            <Button onClick={handleEdit}>
                              <span className="material-symbols-outlined text-sm">
                                edit
                              </span>
                              {t('entity.detail.edit')}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-body-md text-on-surface-variant">
                      {t('entity.detail.notFound')}
                    </p>
                  )}
                </div>
              )}

              {activeTab === 'insights' && (
                <div id="insights-panel" role="tabpanel" aria-labelledby="insights-tab">
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="space-y-1">
                          <Skeleton className="h-3 w-16" />
                          <Skeleton className="h-8 w-full" />
                        </div>
                      ))}
                    </div>
                    <Skeleton className="h-48 w-full rounded-lg" />
                  </div>
                </div>
              )}

              {activeTab === 'audits' && (
                <div id="audits-panel" role="tabpanel" aria-labelledby="audits-tab">
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <div className="flex-1 space-y-1">
                          <Skeleton className="h-4 w-48" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title={t('entity.detail.deleteConfirmTitle', {
          name: entity?.name ?? '',
        })}
        description={t('entity.detail.deleteConfirmMessage')}
        onConfirm={handleDelete}
        isDestructive
        isLoading={isDeleting}
      />
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/entity/WarehouseDetailModal.tsx
git commit -m "feat: add WarehouseDetailModal with inline edit and delete"
```

---

## Task 4: Create VariantDetailModal

**Files:**
- Create: `src/components/entity/VariantDetailModal.tsx`

- [ ] **Step 1: Create VariantDetailModal.tsx**

```tsx
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { commands } from '@/lib/tauri-bindings'
import { ConfirmationDialog } from './ConfirmationDialog'

interface VariantDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entityId: string
  onDeleted?: () => void
}

interface Variant {
  id: string
  product_id: string
  sku: string
  variant_name: string
  uom_id: string
  retail_price: number
  wholesale_price: number
  distribution_price: number
  created_at: string | null
  updated_at: string | null
  deleted_at: string | null
}

interface EditForm {
  sku: string
  variant_name: string
  uom_id: string
  retail_price: string
  wholesale_price: string
  distribution_price: string
}

type TabId = 'details' | 'insights' | 'audits'

interface FieldConfig {
  key: keyof EditForm | 'created_at' | 'updated_at'
  label: string
  type: 'text' | 'number' | 'date'
}

const VARIANT_FIELDS: FieldConfig[] = [
  { key: 'sku', label: 'entity.variant.sku', type: 'text' },
  { key: 'variant_name', label: 'entity.variant.name', type: 'text' },
  { key: 'uom_id', label: 'entity.variant.uom', type: 'text' },
  { key: 'retail_price', label: 'entity.variant.retailPrice', type: 'number' },
  { key: 'wholesale_price', label: 'entity.variant.wholesalePrice', type: 'number' },
  { key: 'distribution_price', label: 'entity.variant.distributionPrice', type: 'number' },
  { key: 'created_at', label: 'entity.common.createdAt', type: 'date' },
  { key: 'updated_at', label: 'entity.common.updatedAt', type: 'date' },
]

export function VariantDetailModal({
  open,
  onOpenChange,
  entityId,
  onDeleted,
}: VariantDetailModalProps) {
  const { t } = useTranslation()
  const [entity, setEntity] = useState<Variant | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState<EditForm>({
    sku: '',
    variant_name: '',
    uom_id: '',
    retail_price: '',
    wholesale_price: '',
    distribution_price: '',
  })
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [activeTab, setActiveTab] = useState<TabId>('details')

  const tabs: { id: TabId; label: string }[] = [
    { id: 'details', label: t('entity.detail.tabs.details') },
    { id: 'insights', label: t('entity.detail.tabs.insights') },
    { id: 'audits', label: t('entity.detail.tabs.audits') },
  ]

  useEffect(() => {
    if (open && entityId) {
      loadEntity()
    }
  }, [open, entityId])

  useEffect(() => {
    if (!open) {
      setEntity(null)
      setIsLoading(true)
      setIsEditing(false)
      setEditForm({
        sku: '',
        variant_name: '',
        uom_id: '',
        retail_price: '',
        wholesale_price: '',
        distribution_price: '',
      })
      setActiveTab('details')
    }
  }, [open])

  async function loadEntity() {
    setIsLoading(true)
    const result = await commands.variantsGetById(entityId)
    setIsLoading(false)
    if (result.status === 'ok' && result.data) {
      setEntity(result.data)
      setEditForm({
        sku: result.data.sku,
        variant_name: result.data.variant_name,
        uom_id: result.data.uom_id,
        retail_price: result.data.retail_price.toString(),
        wholesale_price: result.data.wholesale_price.toString(),
        distribution_price: result.data.distribution_price.toString(),
      })
    }
  }

  async function handleSave() {
    if (!entity) return
    setIsSaving(true)
    const result = await commands.variantsUpdate(entity.id, {
      sku: editForm.sku,
      variant_name: editForm.variant_name,
      uom_id: editForm.uom_id,
      retail_price: parseFloat(editForm.retail_price) || 0,
      wholesale_price: parseFloat(editForm.wholesale_price) || 0,
      distribution_price: parseFloat(editForm.distribution_price) || 0,
    })
    setIsSaving(false)
    if (result.status === 'ok') {
      setEntity(result.data)
      setIsEditing(false)
    }
  }

  async function handleDelete() {
    if (!entity) return
    setIsDeleting(true)
    setDeleteError('')
    const result = await commands.variantsDelete(entity.id)
    setIsDeleting(false)
    if (result.status === 'ok') {
      setShowDeleteConfirm(false)
      onOpenChange(false)
      onDeleted?.()
    } else {
      setDeleteError(result.error ?? 'Delete failed')
    }
  }

  function handleCancelEdit() {
    if (entity) {
      setEditForm({
        sku: entity.sku,
        variant_name: entity.variant_name,
        uom_id: entity.uom_id,
        retail_price: entity.retail_price.toString(),
        wholesale_price: entity.wholesale_price.toString(),
        distribution_price: entity.distribution_price.toString(),
      })
    }
    setIsEditing(false)
  }

  function handleEdit() {
    if (entity) {
      setEditForm({
        sku: entity.sku,
        variant_name: entity.variant_name,
        uom_id: entity.uom_id,
        retail_price: entity.retail_price.toString(),
        wholesale_price: entity.wholesale_price.toString(),
        distribution_price: entity.distribution_price.toString(),
      })
    }
    setIsEditing(true)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <div className="flex flex-col h-full">
            {/* Tab Bar */}
            <div
              className="flex border-b border-outline-variant mb-4"
              role="tablist"
            >
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  id={`${tab.id}-tab`}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  aria-controls={`${tab.id}-panel`}
                  tabIndex={activeTab === tab.id ? 0 : -1}
                  className={`px-4 py-2 text-body-sm font-medium transition-colors border-b-2 -mb-px ${
                    activeTab === tab.id
                      ? 'border-secondary text-secondary'
                      : 'border-transparent text-on-surface-variant hover:text-on-surface'
                  }`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-auto">
              {activeTab === 'details' && (
                <div id="details-panel" role="tabpanel" aria-labelledby="details-tab">
                  {isLoading ? (
                    <div className="grid grid-cols-2 gap-4">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="space-y-1">
                          <Skeleton className="h-3 w-20" />
                          <Skeleton className="h-5 w-full" />
                        </div>
                      ))}
                    </div>
                  ) : entity ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        {VARIANT_FIELDS.map(field => (
                          <div key={field.key} className="space-y-1">
                            <label className="text-label-caps text-label-caps text-on-surface-variant">
                              {t(field.label)}
                            </label>
                            {isEditing &&
                            (field.type === 'text' || field.type === 'number') ? (
                              <input
                                type={field.type === 'number' ? 'number' : 'text'}
                                className="w-full bg-surface-container-high border border-outline-variant text-on-surface font-body-md px-3 py-2 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none"
                                value={
                                  editForm[field.key as keyof EditForm] as string
                                }
                                onChange={e =>
                                  setEditForm(prev => ({
                                    ...prev,
                                    [field.key]: e.target.value,
                                  }))
                                }
                                disabled={isSaving}
                              />
                            ) : (
                              <p className="text-body-md text-on-surface">
                                {field.type === 'date'
                                  ? entity[field.key as 'created_at' | 'updated_at']
                                    ? new Date(
                                        entity[field.key as 'created_at' | 'updated_at']!
                                      ).toLocaleString()
                                    : '—'
                                  : field.type === 'number'
                                    ? Number(
                                        entity[field.key as keyof Variant]
                                      ).toLocaleString()
                                    : entity[field.key as keyof Variant] ?? '—'}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Footer Actions */}
                      <div className="flex items-center justify-between pt-4 border-t border-outline-variant">
                        <Button
                          variant="ghost"
                          className="text-error"
                          onClick={() => setShowDeleteConfirm(true)}
                        >
                          <span className="material-symbols-outlined text-sm">
                            delete
                          </span>
                          {t('entity.detail.delete')}
                        </Button>
                        <div className="flex gap-2">
                          {isEditing ? (
                            <>
                              <Button
                                variant="outline"
                                onClick={handleCancelEdit}
                                disabled={isSaving}
                              >
                                {t('common.cancel')}
                              </Button>
                              <Button onClick={handleSave} disabled={isSaving}>
                                {isSaving ? (
                                  <span className="material-symbols-outlined text-sm animate-spin">
                                    sync
                                  </span>
                                ) : (
                                  <span className="material-symbols-outlined text-sm">
                                    save
                                  </span>
                                )}
                                {t('common.save')}
                              </Button>
                            </>
                          ) : (
                            <Button onClick={handleEdit}>
                              <span className="material-symbols-outlined text-sm">
                                edit
                              </span>
                              {t('entity.detail.edit')}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-body-md text-on-surface-variant">
                      {t('entity.detail.notFound')}
                    </p>
                  )}
                </div>
              )}

              {activeTab === 'insights' && (
                <div id="insights-panel" role="tabpanel" aria-labelledby="insights-tab">
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="space-y-1">
                          <Skeleton className="h-3 w-16" />
                          <Skeleton className="h-8 w-full" />
                        </div>
                      ))}
                    </div>
                    <Skeleton className="h-48 w-full rounded-lg" />
                  </div>
                </div>
              )}

              {activeTab === 'audits' && (
                <div id="audits-panel" role="tabpanel" aria-labelledby="audits-tab">
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <div className="flex-1 space-y-1">
                          <Skeleton className="h-4 w-48" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title={t('entity.detail.deleteConfirmTitle', {
          name: entity?.variant_name ?? '',
        })}
        description={t('entity.detail.deleteConfirmMessage')}
        onConfirm={handleDelete}
        isDestructive
        isLoading={isDeleting}
      />
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/entity/VariantDetailModal.tsx
git commit -m "feat: add VariantDetailModal with inline edit and delete"
```

---

## Task 5: Create entity components index and wire DataTable

**Files:**
- Create: `src/components/entity/index.ts`
- Modify: `src/components/entity/DataTable.tsx:159-186`

- [ ] **Step 1: Create index.ts**

```ts
export { ConfirmationDialog } from './ConfirmationDialog'
export { ProductDetailModal } from './ProductDetailModal'
export { WarehouseDetailModal } from './WarehouseDetailModal'
export { VariantDetailModal } from './VariantDetailModal'
```

- [ ] **Step 2: Modify DataTable.tsx actions cell (lines 159-186)**

Replace the actions `div` content (lines 159-186) with buttons that open the modals:

```tsx
{
  id: 'actions',
  size: 100,
  enableResizing: false,
  header: () => (
    <span className="text-center">
      {t('entity.workspace.columns.actions')}
    </span>
  ),
  cell: ({ row }) => {
    const entityType = // determine entity type from row or context
    return (
      <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          className="p-1 text-on-surface-variant hover:text-primary"
          title={t('entity.workspace.edit')}
          aria-label={t('entity.workspace.edit')}
          onClick={e => {
            e.stopPropagation()
            onEditClick?.(row.original.id, row.original)
          }}
        >
          <span
            className="material-symbols-outlined text-[18px]"
            aria-hidden="true"
          >
            edit
          </span>
        </button>
        <button
          className="p-1 text-on-surface-variant hover:text-error"
          title={t('entity.workspace.delete')}
          aria-label={t('entity.workspace.delete')}
          onClick={e => {
            e.stopPropagation()
            onDeleteClick?.(row.original.id, row.original)
          }}
        >
          <span
            className="material-symbols-outlined text-[18px]"
            aria-hidden="true"
          >
            delete
          </span>
        </button>
      </div>
    )
  },
},
```

Also add `onEditClick` and `onDeleteClick` to `DataTableProps` in `src/lib/types/entity.ts`.

- [ ] **Step 3: Add translations for entity detail keys**

Add to `locales/en.json` (or relevant locale):

```json
{
  "entity": {
    "detail": {
      "tabs": {
        "details": "Details",
        "insights": "Insights",
        "audits": "Audits"
      },
      "edit": "Edit",
      "delete": "Delete",
      "save": "Save",
      "cancel": "Cancel",
      "notFound": "Entity not found",
      "deleteConfirmTitle": "Delete {{name}}?",
      "deleteConfirmMessage": "This action cannot be undone."
    },
    "product": {
      "company": "Company",
      "name": "Name",
      "category": "Category"
    },
    "warehouse": {
      "name": "Name",
      "location": "Location"
    },
    "variant": {
      "sku": "SKU",
      "name": "Variant Name",
      "uom": "Unit of Measure",
      "retailPrice": "Retail Price",
      "wholesalePrice": "Wholesale Price",
      "distributionPrice": "Distribution Price"
    },
    "common": {
      "createdAt": "Created At",
      "updatedAt": "Updated At"
    }
  },
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "confirm": "Confirm",
    "delete": "Delete",
    "edit": "Edit"
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/entity/index.ts src/components/entity/DataTable.tsx src/lib/types/entity.ts locales/en.json
git commit -m "feat: wire DataTable actions to typed detail modals"
```

---

## Task 6: Delete old EntityDetailModal

**Files:**
- Delete: `src/components/entity/EntityDetailModal.tsx`

- [ ] **Step 1: Remove EntityDetailModal.tsx**

```bash
rm -f src/components/entity/EntityDetailModal.tsx
```

- [ ] **Step 2: Update any imports**

Search for imports of `EntityDetailModal` and remove or replace them.

```bash
rg "EntityDetailModal" --type tsx
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "refactor: remove skeleton EntityDetailModal, replaced by typed modals"
```

---

## Task 7: Add i18n translation keys

**Files:**
- Modify: `locales/en.json`, `locales/ar.json` (if exists)

Add the translation keys listed in Task 5 Step 3 to all locale files.

---

## Self-Review Checklist

- [ ] All 4 typed modals follow the same pattern
- [ ] ConfirmationDialog is used by all modals
- [ ] DataTable edit/delete buttons are wired to open modals
- [ ] Loading, saving, deleting states are handled
- [ ] Edit mode toggles inline inputs correctly
- [ ] Cancel reverts to original values
- [ ] Delete shows confirmation dialog
- [ ] Translations exist for all hardcoded strings
- [ ] No "TODO" or placeholder code remaining

---

**Plan complete.** Saved to `docs/superpowers/plans/2026-05-29-entity-detail-modal-plan.md`.
