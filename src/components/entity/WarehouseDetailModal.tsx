import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { commands } from '@/lib/tauri-bindings'
import { ConfirmationDialog } from './ConfirmationDialog'
import { WarehouseForm } from '@/components/entity-form'
import { updateWarehouseSchema } from '@/lib/validation/schemas'
import { EntityFieldGrid } from './EntityFieldGrid'
import { StockMovementsTable } from './StockMovementsTable'

interface WarehouseDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entityId: string
  queryClient: QueryClient
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

const WAREHOUSE_ROWS = [
  [
    { key: 'name', label: 'entity.warehouse.name', type: 'text' as const },
    { key: 'location', label: 'entity.warehouse.location', type: 'text' as const },
  ],
]

export function WarehouseDetailModal({
  open,
  onOpenChange,
  entityId,
  queryClient,
  onDeleted,
}: WarehouseDetailModalProps) {
  const { t } = useTranslation()
  const [entity, setEntity] = useState<Warehouse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', location: '' })
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [activeTab, setActiveTab] = useState<TabId>('details')
  const [loadError, setLoadError] = useState('')
  const [isDirty, setIsDirty] = useState(false)
  const [productNames, setProductNames] = useState<Map<string, string>>(new Map())
  const [variantNames, setVariantNames] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    if (!entity) return
    const isActuallyDirty =
      editForm.name !== entity.name || editForm.location !== entity.location
    setIsDirty(isActuallyDirty)
  }, [editForm, entity])

  const tabs: { id: TabId; label: string }[] = [
    { id: 'details', label: t('entity.detail.tabs.details') },
    { id: 'audits', label: t('entity.detail.tabs.audits') },
    { id: 'insights', label: t('entity.detail.tabs.insights') },
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
    const result = await commands.warehousesGetById(entityId)
    setIsLoading(false)
    if (result.status === 'ok') {
      if (result.data) {
        setEntity(result.data)
        setEditForm({
          name: result.data.name,
          location: result.data.location,
        })
      } else {
        setLoadError('Warehouse not found')
      }
    } else {
      setLoadError(result.error ?? 'Failed to load warehouse')
    }
  }, [entityId])

  const { data: movements, isLoading: isLoadingMovements, error: movementsError } = useQuery({
    queryKey: ['stock-movements-warehouse', entityId],
    queryFn: async () => {
      const result = await commands.stockMovementsGetByWarehouse(entityId)
      if (result.status === 'ok') return result.data
      throw new Error(result.error)
    },
  })

  useEffect(() => {
    if (!movements || movements.length === 0) {
      setProductNames(new Map())
      setVariantNames(new Map())
      return
    }

    const uniqueProductIds = [...new Set(movements.map(m => m.product_id))]
    const uniqueVariantIds = [...new Set(movements.map(m => m.variant_id))]

    const productNamesMap = new Map<string, string>()
    const variantNamesMap = new Map<string, string>()

    Promise.all([
      Promise.all(
        uniqueProductIds.map(async pid => {
          const productResult = await commands.getById(pid)
          if (productResult.status === 'ok' && productResult.data) {
            productNamesMap.set(pid, productResult.data.name)
          }
        })
      ),
      Promise.all(
        uniqueVariantIds.map(async vid => {
          const variantResult = await commands.variantsGetById(vid)
          if (variantResult.status === 'ok' && variantResult.data) {
            variantNamesMap.set(vid, variantResult.data.variant_name)
          }
        })
      ),
    ]).then(() => {
      setProductNames(new Map(productNamesMap))
      setVariantNames(new Map(variantNamesMap))
    })
  }, [movements])

  useEffect(() => {
    if (!open) {
      setEntity(null)
      setIsLoading(true)
      setLoadError('')
      setIsEditing(false)
      setEditForm({ name: '', location: '' })
      setIsDirty(false)
      setActiveTab('details')
      setDeleteError('')
      setSaveError('')
      setProductNames(new Map())
      setVariantNames(new Map())
    }
  }, [open])

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



  async function handleSave(values: { name: string; location: string }) {
    if (!entity) return
    setIsSaving(true)
    const result = await commands.warehousesUpdate(
      entity.id,
      values.name,
      values.location
    )
    setIsSaving(false)
    if (result.status === 'ok') {
      setEntity(result.data)
      setEditForm({
        name: result.data.name,
        location: result.data.location,
      })
      setIsEditing(false)
      queryClient.invalidateQueries({ queryKey: ['entity', 'warehouses'] })
    } else {
      setSaveError(result.error ?? 'Save failed')
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
      queryClient.invalidateQueries({ queryKey: ['entity', 'warehouses'] })
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
      <Dialog
        open={open}
        onOpenChange={open => {
          if (!open && isDirty) return
          onOpenChange(open)
        }}
      >
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
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="space-y-1">
                          <Skeleton className="h-3 w-20" />
                          <Skeleton className="h-5 w-full" />
                        </div>
                      ))}
                    </div>
                  ) : entity ? (
                    <div className="space-y-4">
                      {isEditing ? (
                        <WarehouseForm
                          schema={updateWarehouseSchema}
                          onSubmit={handleSave}
                          isLoading={isSaving}
                          initialValues={editForm}
                          submitText={t('entity.update.button')}
                        />
                      ) : (
                        <EntityFieldGrid rows={WAREHOUSE_ROWS} entity={entity} />
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
                  variant="warehouse"
                  productNames={productNames}
                  variantNames={variantNames}
                  emptyMessage={t('entity.stockMovement.noMovementsWarehouse')}
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
