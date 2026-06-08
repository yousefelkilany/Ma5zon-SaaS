import { useState, useCallback, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from '@tanstack/react-router'
import { commands } from '@/lib/tauri-bindings'
import type { FilterState as BindingFilterState } from '@/lib/bindings'
import { getEntityLayout } from '@/lib/entity-layout'
import type {
  ColumnDef,
  FilterState,
  SortState,
  EntityRow,
} from '@/lib/types/entity'
import { DataTableShell } from './DataTableShell'
import { cn } from '@/lib/utils'
import { PrintPreviewDialog } from './PrintPreviewDialog'
import { exportSelectedToCSV, exportSelectedToExcel } from '@/lib/utils'
import { useTabStore } from '@/store/workspace-store'

function EntityHeader({
  entityType,
  onAddNewClick,
}: {
  entityType: string
  onAddNewClick?: () => void
}) {
  const { t } = useTranslation()

  const sections: Record<string, string> = {
    products: t('entity.workspace.section.inventory'),
    warehouses: t('entity.workspace.section.warehouses'),
    invoices: t('entity.workspace.section.sales'),
    customers: t('entity.workspace.section.partners'),
    bills: t('entity.workspace.section.purchases'),
    vendors: t('entity.workspace.section.partners'),
  }

  const section = sections[entityType] ?? ''
  const label = t(`sidebar.nav.${entityType}`, { defaultValue: entityType })
  const singularLabel = t(`sidebar.nav.singular.${entityType}`, {
    defaultValue: label,
  })
  const addNewLabel = t('entity.workspace.addNew', { entity: singularLabel })

  return (
    <header className="flex flex-col gap-2 px-margin-edge pb-6 bg-surface shadow-sm shrink-0 -mt-6 pt-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <nav className="flex items-center space-x-2 text-on-surface-variant mb-1">
            <span className="font-label-caps text-label-caps">{section}</span>
            <span
              className={cn(
                'material-symbols-outlined text-sm',
                document.documentElement.getAttribute('dir') == 'rtl' &&
                  'rotate-180'
              )}
            >
              chevron_right
            </span>
            <span className="font-label-caps text-label-caps text-on-surface">
              {label}
            </span>
          </nav>
          <h1 className="font-headline-md text-headline-md text-on-surface">
            {label}
          </h1>
        </div>
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

export function EntityWorkspace() {
  const { entityType } = useParams({ from: '/entity/:entityType' }) as {
    entityType: string
  }
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [sort, setSort] = useState<SortState | undefined>()
  const [columnPrefs, setColumnPrefs] = useState<ColumnDef[] | null>(null)
  const [printPreviewOpen, setPrintPreviewOpen] = useState(false)
  const [selectedForPrint, setSelectedForPrint] = useState<EntityRow[]>([])
  const [_isExporting, setIsExporting] = useState(false)
  const [_isDeleting, setIsDeleting] = useState(false)

  const tabUIState = useTabStore(state => state.tabUIStates[state.activeTabId])
  const page = tabUIState?.page ?? 1
  const pageSize = tabUIState?.pageSize ?? 10
  const totalCount = tabUIState?.totalCount ?? 0
  const totalPages = tabUIState?.totalPages ?? 1
  const setPaginationTotal = useTabStore(state => state.setPaginationTotal)

  useEffect(() => {
    const saved = localStorage.getItem(`user_prefs_columns_${entityType}`)
    if (saved) {
      try {
        setColumnPrefs(JSON.parse(saved))
      } catch (e) {
        console.error(e)
      }
    }
  }, [entityType])

  const handleAddNewClick = useCallback(() => {
    const createModalMap: Record<string, string> = {
      products: 'create-product',
      warehouses: 'create-warehouse',
    }
    const modalType = createModalMap[entityType]
    if (modalType) {
      navigate({
        to: '/entity/:entityType',
        params: { entityType: entityType },
        search: { entity_modal: modalType },
      })
    }
  }, [navigate, entityType])

  const handleProductClick = useCallback(
    (productId: string) => {
      navigate({
        to: '/entity/:entityType',
        params: { entityType: entityType },
        search: { entity_modal: 'product', entity_id: productId },
      })
    },
    [navigate, entityType]
  )

  const handleVariantClick = useCallback(
    (variantId: string, _productId: string) => {
      navigate({
        to: '/entity/:entityType',
        params: { entityType: entityType },
        search: { entity_modal: 'variant', entity_id: variantId },
      })
    },
    [navigate, entityType]
  )

  const handleAddVariant = useCallback(
    (productId: string) => {
      navigate({
        to: '/entity/:entityType',
        params: { entityType: entityType },
        search: { entity_modal: 'create-variant', entity_id: productId },
      })
    },
    [navigate, entityType]
  )

  const { data: entityData, isLoading } = useQuery({
    queryKey: ['entity', entityType, sort, page, pageSize],
    queryFn: async () => {
      const activeTabIdAtFetch = useTabStore.getState().activeTabId
      const tabUIStateAtFetch =
        useTabStore.getState().tabUIStates[activeTabIdAtFetch]
      const currentFilters = tabUIStateAtFetch?.filters ?? []
      const bindingFilters: BindingFilterState[] = currentFilters.map(f => ({
        column_id: f.columnId,
        operator: f.operator,
        value: f.value,
      }))
      const bindingSort = sort
        ? { column_id: sort.columnId, direction: sort.direction }
        : null
      switch (entityType) {
        case 'products': {
          const result = await commands.getProductsWithStockPaginated(
            bindingFilters,
            [],
            bindingSort,
            page,
            pageSize
          )
          if (result.status === 'ok') {
            setPaginationTotal(
              result.data.total_count,
              result.data.total_pages,
              activeTabIdAtFetch
            )
            return result.data.data
          }
          return []
        }
        case 'warehouses': {
          const result = await commands.warehousesGetPaginated(
            bindingFilters,
            [],
            bindingSort,
            page,
            pageSize
          )
          if (result.status === 'ok') {
            setPaginationTotal(
              result.data.total_count,
              result.data.total_pages,
              activeTabIdAtFetch
            )
            return result.data.data
          }
          return []
        }
        default:
          return []
      }
    },
  })

  const { t } = useTranslation()

  const columns: ColumnDef[] = useMemo(() => {
    const defaultCols = getEntityLayout(entityType, t)
    if (columnPrefs) {
      return defaultCols.map(col => {
        const saved = columnPrefs.find(c => c.id === col.id)
        return saved ? { ...col, ...saved } : col
      })
    }
    return defaultCols
  }, [entityType, t, columnPrefs])

  const handleSaveColumnPrefs = useCallback(
    (columns: ColumnDef[]) => {
      setColumnPrefs(columns)
      localStorage.setItem(
        `user_prefs_columns_${entityType}`,
        JSON.stringify(columns)
      )
      queryClient.invalidateQueries({ queryKey: ['entity', entityType] })
    },
    [entityType, queryClient]
  )

  const handleSortChange = useCallback(
    (newSort?: SortState) => {
      setSort(newSort)
      useTabStore.getState().setPage(1)
    },
    [setSort]
  )

  const handlePageChange = useCallback(
    (newPage: number, newPageSize: number) => {
      useTabStore.getState().setPage(newPage, newPageSize)
      queryClient.invalidateQueries({ queryKey: ['entity', entityType] })
    },
    [entityType, queryClient]
  )

  const handleFiltersApply = useCallback(
    (filters: FilterState[]) => {
      useTabStore.getState().setFilters(filters)
      useTabStore.getState().setPage(1)
      queryClient.invalidateQueries({ queryKey: ['entity', entityType] })
    },
    [entityType, queryClient]
  )

  const handleBulkPrint = useCallback((ids: Set<string>, data: EntityRow[]) => {
    const selectedData = data.filter(row => ids.has(row.id))
    if (selectedData.length === 0) return
    setSelectedForPrint(selectedData)
    setPrintPreviewOpen(true)
  }, [])

  const handleExportFormatSelect = useCallback(
    async (format: 'csv' | 'xlsx', selectedData: EntityRow[]) => {
      if (selectedData.length === 0) return
      setIsExporting(true)
      try {
        if (format === 'csv') {
          await exportSelectedToCSV(columns, selectedData)
        } else {
          await exportSelectedToExcel(columns, selectedData)
        }
      } finally {
        setIsExporting(false)
      }
    },
    [columns]
  )

  const handleBulkDelete = useCallback(
    async (ids: Set<string>) => {
      if (ids.size === 0) return

      setIsDeleting(true)
      try {
        for (const id of ids) {
          let result: { status: 'ok' | 'error'; error?: string } | null = null

          switch (entityType) {
            case 'products': {
              result = await commands.softDelete(id)
              break
            }
            case 'warehouses': {
              result = await commands.warehousesDelete(id)
              break
            }
          }

          if (result?.status === 'error') {
            console.error(`Failed to delete ${entityType} ${id}:`, result.error)
          }
        }

        queryClient.invalidateQueries({ queryKey: ['entity', entityType] })
      } finally {
        setIsDeleting(false)
      }
    },
    [entityType, queryClient]
  )

  return (
    <div className="px-margin-edge flex flex-col h-full bg-background py-6">
      <EntityHeader entityType={entityType} onAddNewClick={handleAddNewClick} />
      <DataTableShell
        entityType={entityType}
        queryClient={queryClient}
        columns={columns}
        data={entityData ?? []}
        pagination={{
          page,
          pageSize,
          totalRows: totalCount,
          totalPages,
        }}
        onPageChange={handlePageChange}
        isLoading={isLoading}
        onSaveColumnPrefs={handleSaveColumnPrefs}
        onFiltersApply={handleFiltersApply}
        onPrintSelected={handleBulkPrint}
        onExportFormatSelect={handleExportFormatSelect}
        onDelete={handleBulkDelete}
        sort={sort}
        onSortChange={handleSortChange}
        onVariantClick={handleVariantClick}
        onAddVariant={handleAddVariant}
        onProductClick={handleProductClick}
      />
      <PrintPreviewDialog
        open={printPreviewOpen}
        onOpenChange={setPrintPreviewOpen}
        columns={columns}
        selectedData={selectedForPrint}
        entityType={entityType}
        onPrint={() => {
          setPrintPreviewOpen(false)
        }}
      />
    </div>
  )
}
