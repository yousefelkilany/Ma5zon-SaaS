import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { commands } from '@/lib/tauri-bindings'
import type { StockLevel } from '@/lib/bindings'
import { ConfirmationDialog } from './ConfirmationDialog'
import { StockLevelsTable } from './StockLevelsTable'
import { StockMovementsTable } from './StockMovementsTable'
import { updateVariantSchema } from '@/lib/validation/schemas'
import { VariantForm } from '@/components/entity-form'
import { EntityFieldGrid } from './EntityFieldGrid'

interface VariantModalProps {
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

const VARIANT_ROWS = [
  [
    {
      key: 'sku',
      label: 'entity.layout.product_variants.columns.sku',
      type: 'text' as const,
    },
    {
      key: 'uom_id',
      label: 'entity.layout.product_variants.columns.uom',
      type: 'uom' as const,
    },
  ],
  [
    {
      key: 'variant_name',
      label: 'entity.layout.product_variants.columns.variant_name',
      type: 'text' as const,
    },
  ],
  [
    {
      key: 'retail_price',
      label: 'entity.layout.product_variants.columns.retail',
      type: 'currency' as const,
    },
    {
      key: 'wholesale_price',
      label: 'entity.layout.product_variants.columns.wholesale',
      type: 'currency' as const,
    },
    {
      key: 'distribution_price',
      label: 'entity.layout.product_variants.columns.distribution',
      type: 'currency' as const,
    },
  ],
]

export function VariantModal({
  entityId,
  queryClient,
  onDeleted,
  onSaved,
}: VariantModalProps) {
  const { t } = useTranslation()
  const [entity, setEntity] = useState<Variant | null>(null)
  const [isLoading, setIsLoading] = useState(true)
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
  const [isEditing, setIsEditing] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [loadError, setLoadError] = useState('')
  const [activeTab, setActiveTab] = useState<TabId>('details')
  const [warehouseNames, setWarehouseNames] = useState<Map<string, string>>(
    new Map()
  )
  const [currentPage, setCurrentPage] = useState(1)

  const tabs: { id: TabId; label: string }[] = [
    { id: 'details', label: t('entity.detail.tabs.details') },
    { id: 'stock', label: t('entity.detail.tabs.stock') },
    { id: 'audits', label: t('entity.detail.tabs.audits') },
    { id: 'insights', label: t('entity.detail.tabs.insights') },
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

  const { data: stockLevels, isLoading: isLoadingStock } = useQuery({
    queryKey: ['stock-levels-variant', entityId],
    queryFn: async () => {
      const result = await commands.stockLevelsGetByVariant(entityId)
      if (result.status !== 'ok') throw new Error(result.error)
      return result.data.map((l: StockLevel) => ({
        ...l,
        variant_name: '',
        sku: '',
      }))
    },
    enabled: activeTab === 'stock' && !!entityId,
  })

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses', 'all'],
    queryFn: async () => {
      const result = await commands.warehousesGetAll([], [], null)
      if (result.status === 'ok') return result.data
      return []
    },
  })

  useEffect(() => {
    if (warehouses) {
      const names = new Map<string, string>()
      for (const w of warehouses) {
        names.set(w.id, w.name)
      }
      setWarehouseNames(names)
    }
  }, [warehouses])

  const {
    data: movements,
    isLoading: isLoadingMovements,
    error: movementsError,
  } = useQuery({
    queryKey: ['stock-movements-variant', entityId],
    queryFn: async () => {
      const result = await commands.stockMovementsGetByVariant(entityId)
      if (result.status === 'ok') return result.data
      throw new Error(result.error)
    },
    enabled: !!entityId,
    retry: false,
  })

  useEffect(() => {
    loadEntity()
  }, [loadEntity])

  async function handleSave(values: {
    sku: string
    variant_name: string
    uom_id?: string
    retail_price?: number
    wholesale_price?: number
    distribution_price?: number
  }) {
    if (!entity) return
    setIsSaving(true)
    const result = await commands.variantsUpdate(entity.id, {
      sku: values.sku,
      variant_name: values.variant_name,
      uom_id: values.uom_id ?? '',
      retail_price: values.retail_price ?? 0,
      wholesale_price: values.wholesale_price ?? 0,
      distribution_price: values.distribution_price ?? 0,
    })
    setIsSaving(false)
    if (result.status === 'ok') {
      setEntity(result.data)
      setEditForm({
        sku: result.data.sku,
        variant_name: result.data.variant_name,
        uom_id: result.data.uom_id,
        retail_price: result.data.retail_price.toString(),
        wholesale_price: result.data.wholesale_price.toString(),
        distribution_price: result.data.distribution_price.toString(),
      })
      queryClient.invalidateQueries({ queryKey: ['entity', 'variants'] })
      onSaved?.(result.data)
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
      queryClient.invalidateQueries({ queryKey: ['entity', 'variants'] })
      onDeleted?.()
    } else {
      setDeleteError(result.error ?? 'Delete failed')
    }
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
      <Dialog open={true}>
        <DialogContent>
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
                      {isEditing ? (
                        <VariantForm
                          onSubmit={handleSave}
                          isLoading={isSaving}
                          initialValues={{
                            sku: editForm.sku,
                            variant_name: editForm.variant_name,
                            uom_id: editForm.uom_id,
                            retail_price: editForm.retail_price
                              ? parseFloat(editForm.retail_price)
                              : undefined,
                            wholesale_price: editForm.wholesale_price
                              ? parseFloat(editForm.wholesale_price)
                              : undefined,
                            distribution_price: editForm.distribution_price
                              ? parseFloat(editForm.distribution_price)
                              : undefined,
                          }}
                          schema={updateVariantSchema}
                          submitText={t('entity.update.button')}
                        />
                      ) : (
                        <EntityFieldGrid rows={VARIANT_ROWS} entity={entity} />
                      )}

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
                                onClick={() => setIsEditing(false)}
                                disabled={isSaving}
                              >
                                {t('common.cancel')}
                              </Button>
                            </>
                          ) : (
                            <Button onClick={() => setIsEditing(true)}>
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
                    stockLevels={stockLevels ?? []}
                    isLoading={isLoadingStock}
                    view="variant"
                    warehouseNames={warehouseNames}
                    onTransferSuccess={() =>
                      queryClient.invalidateQueries({
                        queryKey: ['stock-levels-variant', entityId],
                      })
                    }
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
                <StockMovementsTable
                  movements={movements ?? []}
                  isLoading={isLoadingMovements}
                  error={movementsError?.message ?? ''}
                  variant="variant"
                  warehouseNames={warehouseNames}
                  emptyMessage={t('entity.stockMovement.noMovementsVariant')}
                  isPaginated
                  currentPage={currentPage}
                  onPageChange={setCurrentPage}
                />
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
