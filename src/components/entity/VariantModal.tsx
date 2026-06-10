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
import { updateVariantSchema } from '@/lib/validation/schemas'
import { VariantForm } from '@/components/entity-form'
import { EntityFieldGrid } from './EntityFieldGrid'
import { EntityMissingState } from './EntityMissingState'
import { useUnsavedGuard } from '@/hooks/use-unsaved-guard'
import { useUIStore } from '@/store/ui-store'
import {
  useGetVariant,
  useStockLevelsForVariant,
  useStockMovements,
  useWarehouses,
} from '@/services/entity/queries'
import {
  useCreateVariant,
  useUpdateVariant,
  useSoftDeleteVariant,
} from '@/services/entity/mutations'
import {
  registerModalHandle,
  type ModalHandle,
} from '@/components/layout/modal-handle-registry'
import {
  type EntityModalTab,
  EntityModalTabs,
  type EntityType,
  variantEntity,
} from '@/lib/utils'

interface VariantModalProps {
  entityId?: string
  productId?: string
  queryClient: QueryClient
  mode: 'view' | 'create'
  onDeleted?: () => void
  container?: HTMLElement
  entityType?: EntityType
}

interface EditForm {
  sku: string
  variant_name: string
  uom_id: string | undefined
  retail_price: number | undefined
  wholesale_price: number | undefined
  distribution_price: number | undefined
}

const VARIANT_ROWS = [
  [
    {
      key: 'sku',
      label: 'entity.layout.variant.columns.sku',
      type: 'text' as const,
    },
    {
      key: 'uom_id',
      label: 'entity.layout.variant.columns.uom',
      type: 'uom' as const,
    },
  ],
  [
    {
      key: 'variant_name',
      label: 'entity.layout.variant.columns.variant_name',
      type: 'text' as const,
    },
  ],
  [
    {
      key: 'retail_price',
      label: 'entity.layout.variant.columns.retail',
      type: 'currency' as const,
    },
    {
      key: 'wholesale_price',
      label: 'entity.layout.variant.columns.wholesale',
      type: 'currency' as const,
    },
    {
      key: 'distribution_price',
      label: 'entity.layout.variant.columns.distribution',
      type: 'currency' as const,
    },
  ],
]

export function VariantModal({
  entityId,
  productId,
  mode,
  onDeleted,
  container,
  entityType = 'variant',
}: VariantModalProps) {
  const { t } = useTranslation()
  const reactQueryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState<EditForm>({
    sku: '',
    variant_name: '',
    uom_id: '',
    retail_price: undefined,
    wholesale_price: undefined,
    distribution_price: undefined,
  })
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [activeTab, setActiveTab] = useState<EntityModalTab>('details')
  const [createDraft, setCreateDraft] = useState<Record<
    string,
    unknown
  > | null>(null)
  const [editDraft, setEditDraft] = useState<Record<string, unknown> | null>(
    null
  )
  const [isDirty, setIsDirty] = useState(false)

  // ----- Data hooks -----
  const { data: entity, isLoading } = useGetVariant(
    mode === 'view' ? entityId : undefined
  )
  const { data: stockLevels, isLoading: isLoadingStock } =
    useStockLevelsForVariant(mode === 'view' ? entityId : undefined)
  const {
    data: movements,
    isLoading: isLoadingMovements,
    error: movementsError,
  } = useStockMovements('variant', mode === 'view' ? entityId : undefined)
  const { data: warehouses } = useWarehouses()

  const warehouseNames = new Map<string, string>()
  if (warehouses) for (const w of warehouses) warehouseNames.set(w.id, w.name)

  // ----- Sync edit form when entity loads -----
  useEffect(() => {
    if (entity) {
      setEditForm({
        sku: entity.sku,
        variant_name: entity.variant_name,
        uom_id: entity.uom_id,
        retail_price: entity.retail_price,
        wholesale_price: entity.wholesale_price,
        distribution_price: entity.distribution_price,
      })
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

  const saveAndCloseRef = useRef<(() => Promise<void> | void) | undefined>(
    undefined
  )

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
          setEditForm({
            sku: entity.sku,
            variant_name: entity.variant_name,
            uom_id: entity.uom_id,
            retail_price: entity.retail_price,
            wholesale_price: entity.wholesale_price,
            distribution_price: entity.distribution_price,
          })
        }
        useUIStore.getState().clearTabState(entityType)
      },
      saveAndClose: () => saveAndCloseRef.current?.(),
    }
    return registerModalHandle(entityType, handle)
  }, [mode, entityId, entityType, entity])

  // ----- Mutations -----
  const updateVariant = useUpdateVariant({
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
  const createVariantMut = useCreateVariant({
    onSettled: (data, error) => {
      if (!error && data) {
        reactQueryClient.invalidateQueries({ queryKey: ['entity', 'variants'] })
        useUIStore.getState().clearTabState(entityType)
        onDeleted?.()
      }
    },
  })
  const deleteVariant = useSoftDeleteVariant({
    onSettled: (_data, error) => {
      if (!error) {
        setShowDeleteConfirm(false)
        reactQueryClient.invalidateQueries({ queryKey: ['entity', 'variants'] })
        onDeleted?.()
      }
    },
  })

  useEffect(() => {
    saveAndCloseRef.current = async () => {
      if (mode === 'create') {
        if (!productId) return
        await createVariantMut.mutateAsync({
          values: editForm as never,
          productId,
        })
      } else if (entity) {
        await updateVariant.mutateAsync({
          id: entity.id,
          values: editForm as never,
        })
      }
    }
  })

  // ----- Unsaved guard -----
  const guard = useUnsavedGuard({
    isDirty,
    onDiscard: () => {
      if (entity) {
        setEditForm({
          sku: entity.sku,
          variant_name: entity.variant_name,
          uom_id: entity.uom_id,
          retail_price: entity.retail_price,
          wholesale_price: entity.wholesale_price,
          distribution_price: entity.distribution_price,
        })
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
        if (!productId) return
        createVariantMut.mutate({ values: editForm as never, productId })
      } else if (entity) {
        updateVariant.mutate({ id: entity.id, values: editForm as never })
      }
    },
    context: { entityName: entity?.variant_name ?? '' },
  })

  // ----- Save handlers -----
  function handleSave(values: {
    sku: string
    variant_name: string
    uom_id?: string
    retail_price?: number
    wholesale_price?: number
    distribution_price?: number
  }) {
    const normalized: EditForm = {
      sku: values.sku,
      variant_name: values.variant_name,
      uom_id: values.uom_id ?? '',
      retail_price: values.retail_price,
      wholesale_price: values.wholesale_price,
      distribution_price: values.distribution_price,
    }
    if (mode === 'create') {
      if (!productId) return
      createVariantMut.mutate({ values: normalized as never, productId })
    } else if (entity) {
      updateVariant.mutate({ id: entity.id, values: normalized as never })
    }
  }

  function handleDelete() {
    if (entity) deleteVariant.mutate({ id: entity.id })
  }

  function handleEdit() {
    if (entity) {
      setEditForm({
        sku: entity.sku,
        variant_name: entity.variant_name,
        uom_id: entity.uom_id,
        retail_price: entity.retail_price,
        wholesale_price: entity.wholesale_price,
        distribution_price: entity.distribution_price,
      })
    }
    setIsEditing(true)
  }

  function handleCancelEdit() {
    if (entity) {
      setEditForm({
        sku: entity.sku,
        variant_name: entity.variant_name,
        uom_id: entity.uom_id,
        retail_price: entity.retail_price,
        wholesale_price: entity.wholesale_price,
        distribution_price: entity.distribution_price,
      })
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
      editForm.sku !== entity.sku ||
      editForm.variant_name !== entity.variant_name ||
      (editForm.uom_id ?? '') !== entity.uom_id ||
      editForm.retail_price !== entity.retail_price ||
      editForm.wholesale_price !== entity.wholesale_price ||
      editForm.distribution_price !== entity.distribution_price
    setIsDirty(isChanged)
  }, [editForm, entity, createDraft, mode])

  // ----- Render -----
  if (mode === 'create') {
    if (!productId) return null
    return (
      <>
        <Dialog
          open={true}
          onClose={guard.requestClose}
          modal={false}
          {...(container ? { container } : {})}
        >
          <DialogPanel onClose={guard.requestClose}>
            <DialogTitle>{t('entity.create.variant.title')}</DialogTitle>
            <VariantForm
              productId={productId}
              onSubmit={handleSave}
              isLoading={createVariantMut.isPending}
              initialValues={editForm}
              onChange={values => {
                setEditForm(values)
                setCreateDraft(values as unknown as Record<string, unknown>)
                useUIStore
                  .getState()
                  .setTabCreateDraft(
                    entityType,
                    values as unknown as Record<string, unknown>
                  )
              }}
            />
          </DialogPanel>
        </Dialog>
        <guard.ConfirmDialog />
      </>
    )
  }

  if (mode === 'view' && !isLoading && entity === undefined) {
    return <EntityMissingState onClose={() => onDeleted?.()} />
  }

  return (
    <>
      <Dialog
        open={true}
        onClose={guard.requestClose}
        modal={false}
        {...(container ? { container } : {})}
      >
        <DialogPanel onClose={guard.requestClose}>
          <DialogTitle>
            {entity?.variant_name ?? t('entity.detail.loading')}
          </DialogTitle>
          <DialogDescription>{entity ? entity.sku : ''}</DialogDescription>

          <div role="tablist" className="flex border-b mb-4">
            {EntityModalTabs.map(id => (
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
                    <VariantForm
                      onSubmit={handleSave}
                      isLoading={updateVariant.isPending}
                      initialValues={editForm}
                      onChange={values => {
                        setEditForm(values)
                        setEditDraft(
                          values as unknown as Record<string, unknown>
                        )
                        useUIStore
                          .getState()
                          .setTabEditDraft(
                            entityType,
                            values as unknown as Record<string, unknown>
                          )
                      }}
                      schema={updateVariantSchema}
                      submitText={t('entity.update.button')}
                    />
                  ) : (
                    <EntityFieldGrid rows={VARIANT_ROWS} entity={entity} />
                  )}

                  {updateVariant.isError && (
                    <p className="text-body-sm text-error">
                      {(updateVariant.error as Error).message}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t">
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
                          <Button variant="outline" onClick={handleCancelEdit}>
                            {t('common.cancel')}
                          </Button>
                          <Button
                            onClick={() => handleSave(editForm)}
                            disabled={!isDirty || updateVariant.isPending}
                          >
                            {t('entity.update.button')}
                          </Button>
                          <Button
                            onClick={guard.requestClose}
                            disabled={!isDirty || updateVariant.isPending}
                          >
                            {t('common.saveAndClose')}
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
              ) : null}
            </div>
          )}

          {activeTab === 'stock' && (
            <StockLevelsTable
              stockLevels={(stockLevels ?? []).map(l => ({
                ...l,
                variant_name: '',
                sku: '',
              }))}
              isLoading={isLoadingStock}
              entity={variantEntity}
              warehouseNames={warehouseNames}
              onTransferSuccess={() =>
                reactQueryClient.invalidateQueries({
                  queryKey: ['stock-levels-variant', entityId],
                })
              }
            />
          )}

          {activeTab === 'audits' && (
            <StockMovementsTable
              movements={movements ?? []}
              isLoading={isLoadingMovements}
              error={movementsError?.message ?? ''}
              entity={variantEntity}
              warehouseNames={warehouseNames}
              emptyMessage={t('entity.stockMovement.noMovementsVariant')}
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
        title={t('entity.detail.deleteConfirmTitle', {
          name: entity?.variant_name ?? '',
        })}
        description={t('entity.detail.deleteConfirmMessage')}
        onConfirm={handleDelete}
        isDestructive
        isLoading={deleteVariant.isPending}
        error={
          deleteVariant.isError ? (deleteVariant.error as Error).message : ''
        }
      />
    </>
  )
}
