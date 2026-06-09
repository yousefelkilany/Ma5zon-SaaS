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
import { StockMovementsTable } from './StockMovementsTable'
import { WarehouseForm } from '@/components/entity-form'
import { updateWarehouseSchema } from '@/lib/validation/schemas'
import { EntityFieldGrid } from './EntityFieldGrid'
import { useUnsavedGuard } from '@/hooks/use-unsaved-guard'
import { useUIStore } from '@/store/ui-store'
import {
  useGetWarehouse,
  useStockMovements,
  useWarehouses,
} from '@/services/entity/queries'
import {
  useCreateWarehouse,
  useUpdateWarehouse,
  useSoftDeleteWarehouse,
} from '@/services/entity/mutations'
import type { WarehouseUpdateValues } from '@/services/entity/types'
import {
  registerModalHandle,
  type ModalHandle,
} from '@/components/layout/modal-handle-registry'
import { warehouseEntity, type EntityType } from '@/lib/utils'

interface WarehouseModalProps {
  entityId?: string
  queryClient: QueryClient
  mode: 'view' | 'create'
  onDeleted?: () => void
  container?: HTMLElement
  entityType?: EntityType
}

interface EditForm {
  name: string
  location: string
}

const TabTypes = ['details', 'audits', 'insights'] as const
type TabId = (typeof TabTypes)[number]

const WAREHOUSE_ROWS = [
  [
    { key: 'name', label: 'entity.warehouse.name', type: 'text' as const },
    {
      key: 'location',
      label: 'entity.warehouse.location',
      type: 'text' as const,
    },
  ],
]

export function WarehouseModal({
  entityId,
  mode,
  onDeleted,
  container,
  entityType = warehouseEntity,
}: WarehouseModalProps) {
  const { t } = useTranslation()
  const reactQueryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState<EditForm>({ name: '', location: '' })
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [activeTab, setActiveTab] = useState<TabId>('details')
  const [createDraft, setCreateDraft] = useState<Record<
    string,
    unknown
  > | null>(null)
  const [editDraft, setEditDraft] = useState<Record<string, unknown> | null>(
    null
  )
  const [isDirty, setIsDirty] = useState(false)

  // ----- Data hooks -----
  const { data: entity, isLoading } = useGetWarehouse(
    mode === 'view' ? entityId : undefined
  )
  const {
    data: movements,
    isLoading: isLoadingMovements,
    error: movementsError,
  } = useStockMovements('warehouse', mode === 'view' ? entityId : undefined)
  const { data: warehouses } = useWarehouses()

  const warehouseNames = new Map<string, string>()
  if (warehouses) for (const w of warehouses) warehouseNames.set(w.id, w.name)

  // ----- Sync edit form when entity loads -----
  useEffect(() => {
    if (entity) {
      setEditForm({ name: entity.name, location: entity.location })
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
          setEditForm({ name: entity.name, location: entity.location })
        }
        useUIStore.getState().clearTabState(entityType)
      },
      saveAndClose: () => saveAndCloseRef.current?.(),
    }
    return registerModalHandle(entityType, handle)
  }, [mode, entityId, entityType, entity])

  // ----- Mutations -----
  const updateWarehouse = useUpdateWarehouse({
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
  const createWarehouseMut = useCreateWarehouse({
    onSettled: (data, error) => {
      if (!error && data) {
        reactQueryClient.invalidateQueries({
          queryKey: ['entity', 'warehouses'],
        })
        useUIStore.getState().clearTabState(entityType)
        onDeleted?.()
      }
    },
  })
  const deleteWarehouse = useSoftDeleteWarehouse({
    onSettled: (_data, error) => {
      if (!error) {
        setShowDeleteConfirm(false)
        reactQueryClient.invalidateQueries({
          queryKey: ['entity', 'warehouses'],
        })
        onDeleted?.()
      }
    },
  })

  useEffect(() => {
    saveAndCloseRef.current = async () => {
      if (mode === 'create') {
        await createWarehouseMut.mutateAsync({
          values: editForm as unknown as WarehouseUpdateValues,
        })
      } else if (entity) {
        await updateWarehouse.mutateAsync({
          id: entity.id,
          values: editForm as unknown as WarehouseUpdateValues,
        })
      }
    }
  })

  // ----- Unsaved guard -----
  const guard = useUnsavedGuard({
    isDirty,
    onDiscard: () => {
      if (entity) {
        setEditForm({ name: entity.name, location: entity.location })
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
        createWarehouseMut.mutate({
          values: editForm as unknown as WarehouseUpdateValues,
        })
      } else if (entity) {
        updateWarehouse.mutate({
          id: entity.id,
          values: editForm as unknown as WarehouseUpdateValues,
        })
      }
    },
    context: { entityName: entity?.name ?? '' },
  })

  // ----- Save handlers -----
  function handleSave(values: EditForm) {
    if (mode === 'create') {
      createWarehouseMut.mutate({
        values: values as unknown as WarehouseUpdateValues,
      })
    } else if (entity) {
      updateWarehouse.mutate({
        id: entity.id,
        values: values as unknown as WarehouseUpdateValues,
      })
    }
  }

  function handleDelete() {
    if (entity) deleteWarehouse.mutate({ id: entity.id })
  }

  function handleEdit() {
    if (entity) {
      setEditForm({ name: entity.name, location: entity.location })
    }
    setIsEditing(true)
  }

  function handleCancelEdit() {
    if (entity) {
      setEditForm({ name: entity.name, location: entity.location })
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
      editForm.name !== entity.name || editForm.location !== entity.location
    setIsDirty(isChanged)
  }, [editForm, entity, createDraft, mode])

  // ----- Render -----
  if (mode === 'create') {
    return (
      <>
        <Dialog
          open={true}
          onClose={guard.requestClose}
          modal={false}
          {...(container ? { container } : {})}
        >
          <DialogPanel onClose={guard.requestClose}>
            <DialogTitle>{t('entity.create.warehouse.title')}</DialogTitle>
            <WarehouseForm
              onSubmit={handleSave}
              isLoading={createWarehouseMut.isPending}
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
            {entity?.name ?? t('entity.detail.loading')}
          </DialogTitle>
          <DialogDescription>{entity ? entity.location : ''}</DialogDescription>

          <div role="tablist" className="flex border-b mb-4">
            {TabTypes.map(id => (
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
                      isLoading={updateWarehouse.isPending}
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
                      submitText={t('entity.update.button')}
                    />
                  ) : (
                    <EntityFieldGrid rows={WAREHOUSE_ROWS} entity={entity} />
                  )}

                  {updateWarehouse.isError && (
                    <p className="text-body-sm text-error">
                      {(updateWarehouse.error as Error).message}
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
                            disabled={!isDirty || updateWarehouse.isPending}
                          >
                            {t('entity.update.button')}
                          </Button>
                          <Button
                            onClick={guard.requestClose}
                            disabled={!isDirty || updateWarehouse.isPending}
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

          {activeTab === 'audits' && (
            <StockMovementsTable
              movements={movements ?? []}
              isLoading={isLoadingMovements}
              error={movementsError?.message ?? ''}
              entity={warehouseEntity}
              warehouseNames={warehouseNames}
              emptyMessage={t('entity.stockMovement.noMovementsWarehouse')}
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
          name: entity?.name ?? '',
        })}
        description={t('entity.detail.deleteConfirmMessage')}
        onConfirm={handleDelete}
        isDestructive
        isLoading={deleteWarehouse.isPending}
        error={
          deleteWarehouse.isError
            ? (deleteWarehouse.error as Error).message
            : ''
        }
      />
    </>
  )
}
