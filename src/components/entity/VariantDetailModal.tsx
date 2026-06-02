import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import type { QueryClient } from '@tanstack/react-query'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { commands } from '@/lib/tauri-bindings'
import type { StockLevelWithVariant } from '@/lib/types/entity'
import type { StockLevel } from '@/lib/bindings'
import { ConfirmationDialog } from './ConfirmationDialog'
import { StockLevelsTable } from './StockLevelsTable'
import { updateVariantSchema } from '@/lib/validation/schemas'

interface VariantDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entityId: string
  queryClient: QueryClient
  onDeleted?: () => void
  onSaved?: (variant: Variant) => void
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

type TabId = 'details' | 'stock' | 'insights' | 'audits'

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
  {
    key: 'wholesale_price',
    label: 'entity.variant.wholesalePrice',
    type: 'number',
  },
  {
    key: 'distribution_price',
    label: 'entity.variant.distributionPrice',
    type: 'number',
  },
  { key: 'created_at', label: 'entity.common.createdAt', type: 'date' },
  { key: 'updated_at', label: 'entity.common.updatedAt', type: 'date' },
]

export function VariantDetailModal({
  open,
  onOpenChange,
  entityId,
  queryClient,
  onDeleted,
  onSaved,
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
  const [saveError, setSaveError] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [loadError, setLoadError] = useState('')
  const [activeTab, setActiveTab] = useState<TabId>('details')
  const [stockLevels, setStockLevels] = useState<StockLevelWithVariant[]>([])
  const [isLoadingStock, setIsLoadingStock] = useState(false)
  const [stockLoadError, setStockLoadError] = useState('')
  const [warehouseNames, setWarehouseNames] = useState<Map<string, string>>(
    new Map()
  )
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const tabs: { id: TabId; label: string }[] = [
    { id: 'details', label: t('entity.detail.tabs.details') },
    { id: 'stock', label: t('entity.detail.tabs.stock') },
    { id: 'insights', label: t('entity.detail.tabs.insights') },
    { id: 'audits', label: t('entity.detail.tabs.audits') },
  ]

  const loadEntity = useCallback(async () => {
    setIsLoading(true)
    setLoadError('')
    const result = await commands.variantsGetById(entityId)
    setIsLoading(false)
    if (result.status === 'ok') {
      if (result.data) {
        setEntity(result.data)
        setEditForm({
          sku: result.data.sku,
          variant_name: result.data.variant_name,
          uom_id: result.data.uom_id,
          retail_price: result.data.retail_price.toString(),
          wholesale_price: result.data.wholesale_price.toString(),
          distribution_price: result.data.distribution_price.toString(),
        })
      } else {
        setLoadError('Variant not found')
      }
    } else {
      setLoadError(result.error ?? 'Failed to load variant')
    }
  }, [entityId])

  const loadStockLevels = useCallback(async () => {
    if (!entityId) return
    setIsLoadingStock(true)
    const result = await commands.stockLevelsGetByVariant(entityId)
    console.log('[DEBUG] stockLevelsGetByVariant result:', result)
    setIsLoadingStock(false)
    if (result.status === 'ok') {
      console.log('[DEBUG] stock levels data:', result.data)
      setStockLevels(
        result.data.map((l: StockLevel) => ({
          ...l,
          variant_name: '',
          sku: '',
        }))
      )
      const whResult = await commands.warehousesGetAll([], [], null)
      if (whResult.status === 'ok') {
        const names = new Map<string, string>()
        for (const w of whResult.data) {
          names.set(w.id, w.name)
        }
        setWarehouseNames(names)
      }
    } else {
      console.error('[DEBUG] stock levels error:', result.error)
      setStockLoadError(result.error ?? 'Failed to load stock')
    }
  }, [entityId])

  useEffect(() => {
    if (
      activeTab === 'stock' &&
      stockLevels.length === 0 &&
      !isLoadingStock &&
      !stockLoadError
    ) {
      loadStockLevels()
    }
  }, [
    activeTab,
    stockLevels.length,
    isLoadingStock,
    stockLoadError,
    loadStockLevels,
  ])

  useEffect(() => {
    if (!open) {
      setEntity(null)
      setIsLoading(true)
      setLoadError('')
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
      setDeleteError('')
      setSaveError('')
      setStockLevels([])
      setStockLoadError('')
      setWarehouseNames(new Map())
      setFieldErrors({})
    }
  }, [open])

  useEffect(() => {
    if (open && entityId) {
      loadEntity()
    }
  }, [open, entityId, loadEntity])

  async function handleSave() {
    if (!entity) return
    setSaveError('')
    const parsedData = {
      sku: editForm.sku,
      variant_name: editForm.variant_name,
      uom_id: editForm.uom_id,
      retail_price: parseFloat(editForm.retail_price) || 0,
      wholesale_price: parseFloat(editForm.wholesale_price) || 0,
      distribution_price: parseFloat(editForm.distribution_price) || 0,
    }
    const validationResult = updateVariantSchema.safeParse(parsedData)
    if (!validationResult.success) {
      const errors = validationResult.error.flatten().fieldErrors
      setFieldErrors(
        Object.fromEntries(
          Object.entries(errors).map(([k, v]) => [k, v?.[0] ?? ''])
        )
      )
      return
    }
    setFieldErrors({})
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
      queryClient.invalidateQueries({ queryKey: ['entity', 'variants'] })
      onSaved?.(result.data)
    } else {
      setSaveError(result.error ?? 'Save failed')
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
      queryClient.invalidateQueries({ queryKey: ['entity', 'variants'] })
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

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
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
                            <label className="text-label-caps text-on-surface-variant">
                              {t(field.label)}
                            </label>
                            {isEditing &&
                            (field.type === 'text' ||
                              field.type === 'number') ? (
                              <div className="space-y-1">
                                <input
                                  type={
                                    field.type === 'number' ? 'number' : 'text'
                                  }
                                  className="w-full bg-surface-container-high border border-outline-variant text-on-surface font-body-md px-3 py-2 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none"
                                  value={
                                    editForm[
                                      field.key as keyof EditForm
                                    ] as string
                                  }
                                  onChange={e =>
                                    setEditForm(prev => ({
                                      ...prev,
                                      [field.key]: e.target.value,
                                    }))
                                  }
                                  disabled={isSaving}
                                />
                                {fieldErrors[
                                  field.key as keyof typeof fieldErrors
                                ] && (
                                  <p className="text-body-sm text-error">
                                    {
                                      fieldErrors[
                                        field.key as keyof typeof fieldErrors
                                      ]
                                    }
                                  </p>
                                )}
                              </div>
                            ) : (
                              <p className="text-body-md text-on-surface">
                                {field.type === 'date'
                                  ? entity[
                                      field.key as 'created_at' | 'updated_at'
                                    ]
                                    ? new Date(
                                        entity[
                                          field.key as
                                            | 'created_at'
                                            | 'updated_at'
                                        ] ?? ''
                                      ).toLocaleString()
                                    : '—'
                                  : field.type === 'number'
                                    ? Number(
                                        entity[field.key as keyof Variant]
                                      ).toLocaleString()
                                    : (entity[field.key as keyof Variant] ??
                                      '—')}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>

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
                    view="variant"
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
          name: entity?.variant_name ?? '',
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
