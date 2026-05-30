import { useState, useCallback, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { invoke } from '@tauri-apps/api/core'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { commands } from '@/lib/tauri-bindings'
import type { FilterState as BindingFilterState } from '@/lib/bindings'
import { getEntityLayout } from '@/lib/entity-layout'
import type {
  EntityWorkspaceProps,
  ColumnDef,
  VariantRow,
  FilterState,
  SortState,
  StockLevelWithVariant,
} from '@/lib/types/entity'
import { DataTableShell } from './DataTableShell'
import { ProductCreateModal } from './ProductCreateModal'
import { WarehouseCreateModal } from './WarehouseCreateModal'
import { VariantCreateModal } from './VariantCreateModal'
import { VariantDetailModal } from './VariantDetailModal'
import { cn } from '@/lib/utils'

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
    <header className="flex flex-col gap-2 px-margin-edge pb-6 bg-surface shadow-sm shrink-0">
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

async function exportToCSV(
  columns: ColumnDef[],
  data: Record<string, unknown>[]
) {
  const headers = columns
    .filter(c => c.visible)
    .map(c => c.label)
    .join(',')
  const rows = data.map(row =>
    columns
      .filter(c => c.visible)
      .map(c => {
        const value = row[c.id]
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value}"`
        }
        return String(value ?? '')
      })
      .join(',')
  )

  const csvFile = '\ufeff' + [headers, ...rows].join('\n')
  const filePath = `ma5zon-export-${Date.now()}.csv`

  try {
    await invoke('export_file', {
      filePath,
      content: csvFile,
    })
    console.error(`rust invoke export success!`)
  } catch (err) {
    console.error(`rust invoke export err: ${err}`)
  }
}

export function EntityWorkspace({ entityType }: EntityWorkspaceProps) {
  const queryClient = useQueryClient()
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [activeFilters, setActiveFilters] = useState<FilterState[]>([])
  const [sort, setSort] = useState<SortState | null>(null)
  const [variantsCache, setVariantsCache] = useState<Map<string, VariantRow[]>>(
    new Map()
  )
  const [loadingVariants, setLoadingVariants] = useState<Set<string>>(new Set())
  const [stockLevelsCache, setStockLevelsCache] = useState<
    Map<string, StockLevelWithVariant[]>
  >(new Map())
  const [loadingStockLevels, setLoadingStockLevels] = useState<Set<string>>(
    new Set()
  )
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [createModalType, setCreateModalType] = useState<
    'products' | 'warehouses' | 'product_variants' | null
  >(null)
  const [createModalProductId, setCreateModalProductId] = useState<string>('')
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    null
  )
  const [selectedVariantProductId, setSelectedVariantProductId] = useState<
    string | null
  >(null)
  const [columnPrefs, setColumnPrefs] = useState<ColumnDef[] | null>(null)
  const [variantDetailOpen, setVariantDetailOpen] = useState(false)

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
    setCreateModalType(
      entityType as 'products' | 'warehouses' | 'product_variants'
    )
    setCreateModalOpen(true)
  }, [entityType])

  const handleModalOpenChange = useCallback((open: boolean) => {
    setCreateModalOpen(open)
    if (!open) setCreateModalType(null)
  }, [])

  const handleVariantClick = useCallback(
    (variantId: string, productId: string) => {
      setSelectedVariantId(variantId)
      setSelectedVariantProductId(productId)
      setVariantDetailOpen(true)
    },
    []
  )

  const handleVariantSaved = useCallback(
    async (_variant: { product_id: string }) => {
      if (!selectedVariantProductId) return
      const result = await commands.variantsGetByProduct(
        selectedVariantProductId
      )
      if (result.status === 'ok') {
        const variantRows: VariantRow[] = result.data.map(v => ({
          ...v,
          uom_id: Number(v.uom_id),
        }))
        setVariantsCache(prev =>
          new Map(prev).set(selectedVariantProductId, variantRows)
        )
      }
    },
    [selectedVariantProductId]
  )

  const handleAddVariant = useCallback((productId: string) => {
    setCreateModalType('product_variants')
    setCreateModalProductId(productId)
    setCreateModalOpen(true)
  }, [])

  const handleRowToggleExpand = useCallback(
    async (id: string) => {
      const newExpanded = new Set(expandedIds)
      if (newExpanded.has(id)) {
        newExpanded.delete(id)
      } else {
        newExpanded.add(id)
        if (entityType === 'products' && !variantsCache.has(id)) {
          setLoadingVariants(prev => new Set(prev).add(id))
          try {
            const result = await commands.variantsGetByProduct(id)
            if (result.status === 'ok') {
              const variantRows: VariantRow[] = result.data.map(v => ({
                ...v,
                uom_id: Number(v.uom_id),
              }))
              setVariantsCache(prev => new Map(prev).set(id, variantRows))
            }
          } finally {
            setLoadingVariants(prev => {
              const next = new Set(prev)
              next.delete(id)
              return next
            })
          }
        }
        if (entityType === 'warehouses' && !stockLevelsCache.has(id)) {
          setLoadingStockLevels(prev => new Set(prev).add(id))
          try {
            const result = await commands.stockLevelsGetByWarehouseWithNames(id)
            if (result.status === 'ok') {
              setStockLevelsCache(prev => new Map(prev).set(id, result.data))
            }
          } finally {
            setLoadingStockLevels(prev => {
              const next = new Set(prev)
              next.delete(id)
              return next
            })
          }
        }
      }
      setExpandedIds(newExpanded)
    },
    [expandedIds, variantsCache, stockLevelsCache, entityType]
  )

  const { data: entityData, isLoading } = useQuery({
    queryKey: ['entity', entityType, activeFilters, sort],
    queryFn: async () => {
      const bindingFilters: BindingFilterState[] = activeFilters.map(f => ({
        column_id: f.columnId,
        operator: f.operator,
        value: f.value,
      }))
      const bindingSort = sort
        ? { column_id: sort.columnId, direction: sort.direction }
        : null
      switch (entityType) {
        case 'products': {
          const result = await commands.getAll(bindingFilters, [], bindingSort)
          return result.status === 'ok' ? result.data : []
        }
        case 'warehouses': {
          const result = await commands.warehousesGetAll(
            bindingFilters,
            [],
            bindingSort
          )
          return result.status === 'ok' ? result.data : []
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

  const handleSortChange = useCallback((newSort: SortState | null) => {
    setSort(newSort)
  }, [])

  const handleFiltersApply = useCallback(
    (filters: FilterState[]) => {
      setActiveFilters(filters)
      queryClient.invalidateQueries({ queryKey: ['entity', entityType] })
    },
    [entityType, queryClient]
  )

  const handleExport = async () => {
    await exportToCSV(columns, entityData ?? [])
  }

  return (
    <div className="px-margin-edge flex flex-col h-full bg-background py-6">
      <EntityHeader entityType={entityType} onAddNewClick={handleAddNewClick} />
      <DataTableShell
        entityType={entityType}
        queryClient={queryClient}
        columns={columns}
        data={entityData ?? []}
        pagination={{
          page: 1,
          pageSize: 10,
          totalRows: (entityData ?? []).length,
          totalPages: 1,
        }}
        isLoading={isLoading}
        onSaveColumnPrefs={handleSaveColumnPrefs}
        onFiltersApply={handleFiltersApply}
        onExport={handleExport}
        sort={sort}
        onSortChange={handleSortChange}
        expandedRowIds={expandedIds}
        variantsCache={variantsCache}
        onRowToggleExpand={handleRowToggleExpand}
        isLoadingVariants={id => loadingVariants.has(id)}
        onVariantClick={handleVariantClick}
        onAddVariant={handleAddVariant}
        stockLevelsCache={stockLevelsCache}
        isLoadingStockLevels={id => loadingStockLevels.has(id)}
      />
      <ProductCreateModal
        open={createModalOpen && createModalType === 'products'}
        onOpenChange={handleModalOpenChange}
        queryClient={queryClient}
      />
      <WarehouseCreateModal
        open={createModalOpen && createModalType === 'warehouses'}
        onOpenChange={handleModalOpenChange}
        queryClient={queryClient}
      />
      <VariantCreateModal
        open={createModalOpen && createModalType === 'product_variants'}
        onOpenChange={handleModalOpenChange}
        queryClient={queryClient}
        productId={createModalProductId}
      />
      {entityType === 'products' && selectedVariantId && (
        <VariantDetailModal
          open={variantDetailOpen}
          onOpenChange={setVariantDetailOpen}
          entityId={selectedVariantId}
          queryClient={queryClient}
          onDeleted={() => {
            setVariantDetailOpen(false)
            setSelectedVariantId(null)
          }}
          onSaved={handleVariantSaved}
        />
      )}
    </div>
  )
}
