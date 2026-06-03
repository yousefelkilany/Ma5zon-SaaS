import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import type { QueryClient } from '@tanstack/react-query'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { commands } from '@/lib/tauri-bindings'
import { ConfirmationDialog } from './ConfirmationDialog'
import type { StockLevelWithVariant } from '@/lib/types/entity'
import { StockLevelsTable } from './StockLevelsTable'
import { ProductForm } from '@/components/entity-form'
import { updateProductSchema } from '@/lib/validation/schemas'

interface ProductDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entityId: string
  queryClient: QueryClient
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

type TabId = 'details' | 'stock' | 'insights' | 'audits'

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
  queryClient,
  onDeleted,
}: ProductDetailModalProps) {
  const { t } = useTranslation()
  const [entity, setEntity] = useState<Product | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    company: '',
    name: '',
    category: '',
  })
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [activeTab, setActiveTab] = useState<TabId>('details')
  const [loadError, setLoadError] = useState('')
  const [stockLevels, setStockLevels] = useState<StockLevelWithVariant[]>([])
  const [isLoadingStock, setIsLoadingStock] = useState(false)
  const [warehouseNames, setWarehouseNames] = useState<Map<string, string>>(
    new Map()
  )
  const [isDirty, setIsDirty] = useState(false)

  const tabs: { id: TabId; label: string }[] = [
    { id: 'details', label: t('entity.detail.tabs.details') },
    { id: 'stock', label: t('entity.detail.tabs.stock') },
    { id: 'insights', label: t('entity.detail.tabs.insights') },
    { id: 'audits', label: t('entity.detail.tabs.audits') },
  ]

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const currentIndex = tabs.findIndex(tab => tab.id === activeTab)
    if (e.key === 'ArrowRight') {
      const nextTab = tabs[(currentIndex + 1) % tabs.length]
      if (nextTab) setActiveTab(nextTab.id)
    } else if (e.key === 'ArrowLeft') {
      const prevTab = tabs[(currentIndex - 1 + tabs.length) % tabs.length]
      if (prevTab) setActiveTab(prevTab.id)
    }
  }

  const loadEntity = useCallback(async () => {
    setIsLoading(true)
    setLoadError('')
    const result = await commands.getById(entityId)
    setIsLoading(false)
    if (result.status === 'ok') {
      if (result.data) {
        setEntity(result.data)
        setIsDirty(false)
        setEditForm({
          company: result.data.company,
          name: result.data.name,
          category: result.data.category,
        })
      } else {
        setLoadError(t('entity.detail.notFound'))
      }
    } else {
      setLoadError(result.error ?? 'Failed to load product')
    }
  }, [entityId, t])

  const loadStockLevels = useCallback(async () => {
    if (!entityId) return
    setIsLoadingStock(true)
    const result = await commands.stockLevelsGetByProduct(entityId)
    setIsLoadingStock(false)
    if (result.status === 'ok') {
      setStockLevels(result.data)
      const whResult = await commands.warehousesGetAll([], [], null)
      if (whResult.status === 'ok') {
        const names = new Map<string, string>()
        for (const w of whResult.data) {
          names.set(w.id, w.name)
        }
        setWarehouseNames(names)
      }
    } else {
      setLoadError(result.error ?? 'Failed to load stock levels')
    }
  }, [entityId])

  useEffect(() => {
    if (!open) {
      setEntity(null)
      setIsLoading(true)
      setIsEditing(false)
      setEditForm({ company: '', name: '', category: '' })
      setActiveTab('details')
      setDeleteError('')
      setStockLevels([])
      setWarehouseNames(new Map())
    }
  }, [open])

  useEffect(() => {
    if (
      activeTab === 'stock' &&
      stockLevels.length === 0 &&
      !isLoadingStock &&
      !loadError
    ) {
      loadStockLevels()
    }
  }, [
    activeTab,
    stockLevels.length,
    isLoadingStock,
    loadError,
    loadStockLevels,
  ])

  useEffect(() => {
    if (open && entityId) {
      loadEntity()
    }
  }, [open, entityId, loadEntity])

  useEffect(() => {
    if (!showDeleteConfirm) {
      setDeleteError('')
    }
  }, [showDeleteConfirm])

  useEffect(() => {
    setIsDirty(true)
  }, [editForm])

  async function handleSave(values: {
    company: string
    name: string
    category: string
  }) {
    if (!entity) return
    setIsSaving(true)
    const saveResult = await commands.update(
      entity.id,
      values.company,
      values.name,
      values.category
    )
    setIsSaving(false)
    if (saveResult.status === 'ok') {
      setEntity(saveResult.data)
      setIsEditing(false)
      queryClient.invalidateQueries({ queryKey: ['entity', 'products'] })
    } else {
      setSaveError(saveResult.error ?? 'Save failed')
    }
  }

  async function handleDelete() {
    if (!entity) return
    setIsDeleting(true)
    setDeleteError('')
    const result = await commands.softDelete(entity.id)
    setIsDeleting(false)
    if (result.status === 'ok') {
      setShowDeleteConfirm(false)
      onOpenChange(false)
      queryClient.invalidateQueries({ queryKey: ['entity', 'products'] })
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
      <Dialog
        open={open}
        onOpenChange={open => {
          if (!open && isDirty) return
          onOpenChange(open)
        }}
      >
        <DialogContent className="min-w-xl max-w-fit">
          <div className="flex flex-col h-full">
            {/* Tab Bar */}
            <div
              className="flex border-b border-outline-variant mb-4"
              role="tablist"
              onKeyDown={handleKeyDown}
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
                <div
                  id="details-panel"
                  role="tabpanel"
                  aria-labelledby="details-tab"
                >
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
                      {isEditing ? (
                        <ProductForm
                          schema={updateProductSchema}
                          onSubmit={handleSave}
                          isLoading={isSaving}
                          initialValues={editForm}
                        />
                      ) : (
                        <div className="grid grid-cols-2 gap-4">
                          {PRODUCT_FIELDS.map(field => (
                            <div key={field.key} className="space-y-1">
                              <label className="text-label-caps text-on-surface-variant">
                                {t(field.label)}
                              </label>
                              <p className="text-body-md text-on-surface">
                                {field.type === 'date'
                                  ? entity[field.key]
                                    ? new Date(
                                        entity[field.key] as string
                                      ).toLocaleString()
                                    : '—'
                                  : (entity[field.key] ?? '—')}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Footer Actions */}
                      {saveError && (
                        <p className="text-body-sm text-error">{saveError}</p>
                      )}
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
                  ) : loadError ? (
                    <p className="text-body-md text-error">{loadError}</p>
                  ) : (
                    <p className="text-body-md text-on-surface-variant">
                      {t('entity.detail.notFound')}
                    </p>
                  )}
                </div>
              )}

              {activeTab === 'stock' && (
                <div
                  id="stock-panel"
                  role="tabpanel"
                  aria-labelledby="stock-tab"
                >
                  <StockLevelsTable
                    stockLevels={stockLevels}
                    isLoading={isLoadingStock}
                    view="product"
                    warehouseNames={warehouseNames}
                  />
                </div>
              )}

              {activeTab === 'insights' && (
                <div
                  id="insights-panel"
                  role="tabpanel"
                  aria-labelledby="insights-tab"
                >
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
                <div
                  id="audits-panel"
                  role="tabpanel"
                  aria-labelledby="audits-tab"
                >
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
        error={deleteError}
      />
    </>
  )
}
