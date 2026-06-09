import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { ConfirmationDialog } from './ConfirmationDialog'
import { StockLevelsTable } from './StockLevelsTable'
import { StockMovementsTable } from './StockMovementsTable'
import { ProductForm } from '@/components/entity-form'
import { updateProductSchema } from '@/lib/validation/schemas'
import { EntityFieldGrid } from './EntityFieldGrid'
import { useUnsavedGuard } from '@/hooks/use-unsaved-guard'
import { useUIStore } from '@/store/ui-store'
import {
  useGetProduct,
  useStockLevelsForProduct,
  useStockMovements,
  useWarehouses,
} from '@/services/entity/queries'
import {
  useCreateProduct,
  useUpdateProduct,
  useSoftDeleteProduct,
} from '@/services/entity/mutations'
import { registerModalHandle, type ModalHandle } from '@/components/layout/modal-handle-registry'

interface ProductModalProps {
  entityId?: string
  queryClient: QueryClient
  mode: 'view' | 'create'
  onDeleted?: () => void
  container?: HTMLElement
  entityType?: 'products' | 'variants' | 'warehouses'
}

type TabId = 'details' | 'stock' | 'insights' | 'audits'

const PRODUCT_ROWS = [
  [
    { key: 'company', label: 'entity.product.company', type: 'text' as const },
    { key: 'category', label: 'entity.product.category', type: 'text' as const },
  ],
  [{ key: 'name', label: 'entity.product.name', type: 'text' as const }],
  [
    { key: 'updated_at', label: 'entity.common.updatedAt', type: 'date' as const },
    { key: 'created_at', label: 'entity.common.createdAt', type: 'date' as const },
  ],
]

export function ProductModal({
  entityId,
  mode,
  onDeleted,
  container,
  entityType = 'products',
}: ProductModalProps) {
  const { t } = useTranslation()
  const reactQueryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({ company: '', name: '', category: '' })
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [activeTab, setActiveTab] = useState<TabId>('details')
  const [createDraft, setCreateDraft] = useState<Record<string, unknown> | null>(null)
  const [editDraft, setEditDraft] = useState<Record<string, unknown> | null>(null)
  const [isDirty, setIsDirty] = useState(false)

  // ----- Data hooks -----
  const { data: entity, isLoading } = useGetProduct(mode === 'view' ? entityId : undefined)
  const { data: stockLevels, isLoading: isLoadingStock } = useStockLevelsForProduct(
    mode === 'view' ? entityId : undefined
  )
  const { data: movements, isLoading: isLoadingMovements, error: movementsError } = useStockMovements(
    'product',
    mode === 'view' ? entityId : undefined
  )
  const { data: warehouses } = useWarehouses()

  const warehouseNames = new Map<string, string>()
  if (warehouses) for (const w of warehouses) warehouseNames.set(w.id, w.name)

  // ----- Sync edit form when entity loads -----
  useEffect(() => {
    if (entity) {
      setEditForm({ company: entity.company, name: entity.name, category: entity.category })
    }
  }, [entity])

  // ----- Register imperative handle for the per-tab effect in MainWindowContent -----
  const editDraftRef = useRef(editDraft)
  useEffect(() => {
    editDraftRef.current = editDraft
  }, [editDraft])
  const createDraftRef = useRef(createDraft)
  useEffect(() => {
    createDraftRef.current = createDraft
  }, [createDraft])
  const isDirtyRef = useRef(isDirty)
  useEffect(() => {
    isDirtyRef.current = isDirty
  }, [isDirty])

  const saveAndCloseRef = useRef<(() => Promise<void> | void) | undefined>(undefined)

  useEffect(() => {
    if (mode !== 'view' && !entityId) return
    const handle: ModalHandle = {
      getIsDirty: () => isDirtyRef.current,
      getCreateDraft: () => createDraftRef.current ?? undefined,
      getEditDraft: () => editDraftRef.current ?? undefined,
      discardDrafts: () => {
        setEditDraft(null)
        setCreateDraft(null)
        setIsDirty(false)
        if (entity) {
          setEditForm({ company: entity.company, name: entity.name, category: entity.category })
        }
        useUIStore.getState().clearTabState(entityType)
      },
      saveAndClose: () => saveAndCloseRef.current?.(),
    }
    return registerModalHandle(entityType, handle)
  }, [mode, entityId, entityType, entity])

  // ----- Mutations -----
  const updateProduct = useUpdateProduct({
    onSettled: (data, error) => {
      if (!error && data) {
        setIsEditing(false)
        setIsDirty(false)
        setEditDraft(null)
        useUIStore.getState().setTabIsDirty(entityType, false)
        useUIStore.getState().setTabEditDraft(entityType, undefined)
      }
    },
  })
  const createProduct = useCreateProduct({
    onSettled: (data, error) => {
      if (!error && data) {
        reactQueryClient.invalidateQueries({ queryKey: ['entity', 'products'] })
        useUIStore.getState().clearTabState(entityType)
        onDeleted?.()
      }
    },
  })
  const deleteProduct = useSoftDeleteProduct({
    onSettled: (_data, error) => {
      if (!error) {
        setShowDeleteConfirm(false)
        reactQueryClient.invalidateQueries({ queryKey: ['entity', 'products'] })
        onDeleted?.()
      }
    },
  })

  useEffect(() => {
    saveAndCloseRef.current = async () => {
      if (mode === 'create') {
        await createProduct.mutateAsync({ values: editForm })
      } else if (entity) {
        await updateProduct.mutateAsync({ id: entity.id, values: editForm })
      }
    }
  })

  // ----- Unsaved guard -----
  const guard = useUnsavedGuard({
    isDirty,
    onDiscard: () => {
      if (entity) {
        setEditForm({ company: entity.company, name: entity.name, category: entity.category })
      }
      setIsEditing(false)
      setIsDirty(false)
      setEditDraft(null)
      setCreateDraft(null)
      useUIStore.getState().setTabIsDirty(entityType, false)
      useUIStore.getState().setTabEditDraft(entityType, undefined)
      useUIStore.getState().setTabCreateDraft(entityType, undefined)
      onDeleted?.()
    },
    onSaveAndClose: async () => {
      if (mode === 'create') {
        createProduct.mutate({ values: editForm })
      } else if (entity) {
        updateProduct.mutate({ id: entity.id, values: editForm })
      }
    },
    context: { entityName: entity?.name ?? '' },
  })

  // ----- Save handlers -----
  function handleSave(values: { company: string; name: string; category: string }) {
    if (mode === 'create') {
      createProduct.mutate({ values })
    } else if (entity) {
      updateProduct.mutate({ id: entity.id, values })
    }
  }

  function handleDelete() {
    if (entity) deleteProduct.mutate({ id: entity.id })
  }

  function handleEdit() {
    if (entity) {
      setEditForm({ company: entity.company, name: entity.name, category: entity.category })
    }
    setIsEditing(true)
  }

  function handleCancelEdit() {
    if (entity) {
      setEditForm({ company: entity.company, name: entity.name, category: entity.category })
    }
    setIsEditing(false)
    setIsDirty(false)
    setEditDraft(null)
  }

  // Track form changes for the unsaved guard
  useEffect(() => {
    if (mode === 'create') {
      setIsDirty(!!createDraft && Object.keys(createDraft).length > 0)
      return
    }
    if (!entity) return
    const isChanged =
      editForm.company !== entity.company ||
      editForm.name !== entity.name ||
      editForm.category !== entity.category
    setIsDirty(isChanged)
  }, [editForm, entity, createDraft, mode])

  // ----- Render -----
  if (mode === 'create') {
    return (
      <>
        <Dialog open={true} onClose={guard.requestClose} modal={false} {...(container ? { container } : {})}>
          <DialogPanel onClose={guard.requestClose}>
            <DialogTitle>{t('entity.create.product.title')}</DialogTitle>
            <ProductForm
              onSubmit={handleSave}
              isLoading={createProduct.isPending}
              initialValues={editForm}
              onChange={(values) => {
                setEditForm(values)
                setCreateDraft(values as unknown as Record<string, unknown>)
                useUIStore.getState().setTabCreateDraft(entityType, values as unknown as Record<string, unknown>)
              }}
            />
          </DialogPanel>
        </Dialog>
        <guard.ConfirmDialog />
      </>
    )
  }

  return (
    <>
      <Dialog open={true} onClose={guard.requestClose} modal={false} {...(container ? { container } : {})}>
        <DialogPanel onClose={guard.requestClose}>
          <DialogTitle>{entity?.name ?? t('entity.detail.loading')}</DialogTitle>
          <DialogDescription>
            {entity ? `${entity.company} — ${entity.category}` : ''}
          </DialogDescription>

          <div role="tablist" className="flex border-b mb-4">
            {(['details', 'stock', 'insights', 'audits'] as const).map(id => (
              <button
                key={id}
                role="tab"
                aria-selected={activeTab === id}
                onClick={() => setActiveTab(id)}
                className={`px-4 py-2 ${activeTab === id ? 'border-b-2 border-secondary' : ''}`}
              >
                {t('entity.detail.tabs.' + id)}
              </button>
            ))}
          </div>

          {activeTab === 'details' && (
            <div>
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
                      isLoading={updateProduct.isPending}
                      initialValues={editForm}
                      onChange={(values) => {
                        setEditForm(values)
                        setEditDraft(values as unknown as Record<string, unknown>)
                        useUIStore.getState().setTabEditDraft(entityType, values as unknown as Record<string, unknown>)
                      }}
                      submitText={t('entity.update.button')}
                    />
                  ) : (
                    <EntityFieldGrid rows={PRODUCT_ROWS} entity={entity} />
                  )}

                  {updateProduct.isError && (
                    <p className="text-body-sm text-error">
                      {(updateProduct.error as Error).message}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t">
                    <Button
                      variant="ghost"
                      className="text-error"
                      onClick={() => setShowDeleteConfirm(true)}
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                      {t('entity.detail.delete')}
                    </Button>
                    <div className="flex gap-2">
                      {isEditing ? (
                        <>
                          <Button variant="outline" onClick={handleCancelEdit}>
                            {t('common.cancel')}
                          </Button>
                          <Button
                            onClick={() => handleSave(editForm)}
                            disabled={!isDirty || updateProduct.isPending}
                          >
                            {t('entity.update.button')}
                          </Button>
                          <Button
                            onClick={guard.requestClose}
                            disabled={!isDirty || updateProduct.isPending}
                          >
                            {t('common.saveAndClose')}
                          </Button>
                        </>
                      ) : (
                        <Button onClick={handleEdit}>
                          <span className="material-symbols-outlined text-sm">edit</span>
                          {t('entity.detail.edit')}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {activeTab === 'stock' && (
            <StockLevelsTable
              stockLevels={stockLevels ?? []}
              isLoading={isLoadingStock}
              view="product"
              warehouseNames={warehouseNames}
              onTransferSuccess={() =>
                reactQueryClient.invalidateQueries({
                  queryKey: ['stock-levels-product', entityId],
                })
              }
            />
          )}

          {activeTab === 'audits' && (
            <StockMovementsTable
              movements={movements ?? []}
              isLoading={isLoadingMovements}
              error={movementsError?.message ?? ''}
              variant="product"
              warehouseNames={warehouseNames}
              emptyMessage={t('entity.stockMovement.noMovementsProduct')}
            />
          )}

          {activeTab === 'insights' && (
            <div className="space-y-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-48 w-full rounded-lg" />
            </div>
          )}
        </DialogPanel>
      </Dialog>
      <guard.ConfirmDialog />
      <ConfirmationDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title={t('entity.detail.deleteConfirmTitle', { name: entity?.name ?? '' })}
        description={t('entity.detail.deleteConfirmMessage')}
        onConfirm={handleDelete}
        isDestructive
        isLoading={deleteProduct.isPending}
        error={deleteProduct.isError ? (deleteProduct.error as Error).message : ''}
      />
    </>
  )
}
