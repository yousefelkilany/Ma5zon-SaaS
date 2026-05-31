import { useState, useCallback, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { QueryClient } from '@tanstack/react-query'
import type {
  ColumnDef,
  EntityRow,
  PaginationState,
  SortState,
  FilterState,
  VariantRow,
  StockLevelWithVariant,
} from '@/lib/types/entity'
import { Toolbar } from './Toolbar'
import { DataTable } from './DataTable'
import { PaginationFooter } from './PaginationFooter'
import { FilterDialog } from './FilterDialog'
import { ColumnVisibilityDialog } from './ColumnVisibilityDialog'
import { ConfirmationDialog } from './ConfirmationDialog'
import Fuse from 'fuse.js'
import { normalizeArabic } from '@/lib/utils'

interface DataTableShellProps {
  entityType: string
  queryClient: QueryClient
  columns: ColumnDef[]
  data: EntityRow[]
  pagination: PaginationState
  isLoading: boolean
  onSaveColumnPrefs: (columns: ColumnDef[]) => void
  onFiltersApply: (filters: FilterState[]) => void
  onExport: () => void
  onPrintSelected: (ids: Set<string>, data: EntityRow[]) => void
  onExportFormatSelect: (
    format: 'csv' | 'xlsx',
    selectedData: EntityRow[]
  ) => void
  onDelete: (ids: Set<string>) => void
  onPageChange?: (page: number, pageSize: number) => void
  sort?: SortState | null
  onSortChange?: (sort: SortState | null) => void
  expandedRowIds?: Set<string>
  variantsCache?: Map<string, VariantRow[]>
  onRowToggleExpand?: (id: string) => void
  isLoadingVariants?: (id: string) => boolean
  onVariantClick?: (variantId: string, productId: string) => void
  onAddVariant?: (productId: string) => void
  stockLevelsCache?: Map<string, StockLevelWithVariant[]>
  isLoadingStockLevels?: (id: string) => boolean
}

export function DataTableShell({
  entityType,
  queryClient,
  columns,
  data,
  pagination,
  isLoading,
  onSaveColumnPrefs,
  onFiltersApply,
  onExport,
  onPrintSelected,
  onExportFormatSelect,
  onDelete,
  onPageChange,
  sort: externalSort,
  onSortChange,
  expandedRowIds,
  variantsCache,
  onRowToggleExpand,
  isLoadingVariants,
  onVariantClick,
  onAddVariant,
  stockLevelsCache,
  isLoadingStockLevels,
}: DataTableShellProps) {
  const { t } = useTranslation()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [sort, setSort] = useState<SortState | null>(null)
  const [filters, setFilters] = useState<FilterState[]>([])
  const [searchValue, setSearchValue] = useState('')
  const [filterDialogOpen, setFilterDialogOpen] = useState(false)
  const [columnDialogOpen, setColumnDialogOpen] = useState(false)
  const [localColumns, setLocalColumns] = useState<ColumnDef[]>(columns)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const filteredData = useMemo(() => {
    if (!searchValue.trim() || searchValue.length < 2) {
      return data
    }

    const normalizedSearch = normalizeArabic(searchValue.toLowerCase())

    const searchableKeys = columns
      .filter(col => col.type !== 'actions' && col.visible)
      .map(col => col.id)

    const fuse = new Fuse(data, {
      keys: searchableKeys,
      includeScore: true,
      threshold: 0.3,
      minMatchCharLength: 2,
      getFn: (obj, path) => {
        const key = path[0]
        if (!key) return ''
        const value = obj[key]
        if (typeof value === 'string') {
          return normalizeArabic(value.toLowerCase())
        }
        return String(value ?? '')
      },
    })

    return fuse.search(normalizedSearch).map(result => result.item)
  }, [data, searchValue, columns])

  useEffect(() => {
    setLocalColumns(columns)
  }, [columns])

  useEffect(() => {
    if (externalSort !== undefined) {
      setSort(externalSort)
    }
  }, [externalSort])

  const handleSortChange = useCallback(
    (newSort: SortState | null) => {
      setSort(newSort)
      onSortChange?.(newSort)
    },
    [onSortChange]
  )

  const handlePageChange = useCallback(
    (page: number, pageSize: number) => {
      onPageChange?.(page, pageSize)
    },
    [onPageChange]
  )

  const handleRowSelect = useCallback((ids: Set<string>) => {
    setSelectedIds(ids)
  }, [])

  const handleRowClick = useCallback((_id: string) => {
    // Row click handling is done in DataTable with typed modals
  }, [])

  const handlePrintSelected = useCallback(() => {
    onPrintSelected(selectedIds, data)
  }, [selectedIds, data, onPrintSelected])

  const handleExportFormat = useCallback(
    (format: 'csv' | 'xlsx') => {
      const selectedData = data.filter(row => selectedIds.has(row.id))
      if (selectedData.length === 0) return
      onExportFormatSelect(format, selectedData)
    },
    [selectedIds, data, onExportFormatSelect]
  )

  const handleDeleteClick = useCallback(() => {
    setDeleteDialogOpen(true)
  }, [])

  const handleConfirmDelete = useCallback(() => {
    onDelete(selectedIds)
    setDeleteDialogOpen(false)
    setSelectedIds(new Set())
  }, [selectedIds, onDelete])

  const handleFiltersApply = useCallback(
    (newFilters: FilterState[]) => {
      setFilters(newFilters)
      onFiltersApply(newFilters)
    },
    [onFiltersApply]
  )

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Toolbar
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        activeFilterCount={filters.length}
        onFiltersClick={() => setFilterDialogOpen(true)}
        onColumnsClick={() => setColumnDialogOpen(true)}
        selectedCount={selectedIds.size}
        onPrintSelected={handlePrintSelected}
        onExportFormatSelect={handleExportFormat}
        onDelete={handleDeleteClick}
      />
      <div className="flex-1 overflow-hidden">
        <div className="h-full flex flex-col">
          <DataTable
            entityType={entityType}
            queryClient={queryClient}
            columns={localColumns}
            data={filteredData}
            sort={sort}
            isLoading={isLoading}
            selectedIds={selectedIds}
            onSort={handleSortChange}
            onRowSelect={handleRowSelect}
            onRowClick={handleRowClick}
            expandedRowIds={expandedRowIds}
            variantsCache={variantsCache}
            onRowToggleExpand={onRowToggleExpand}
            isLoadingVariants={isLoadingVariants}
            onVariantClick={onVariantClick}
            onAddVariant={onAddVariant}
            stockLevelsCache={stockLevelsCache}
            isLoadingStockLevels={isLoadingStockLevels}
          />
        </div>
      </div>
      <PaginationFooter
        pagination={pagination}
        onPageChange={handlePageChange}
        isLoading={isLoading}
      />
      <FilterDialog
        open={filterDialogOpen}
        onOpenChange={setFilterDialogOpen}
        columns={columns}
        filters={filters}
        onApply={handleFiltersApply}
      />
      <ColumnVisibilityDialog
        open={columnDialogOpen}
        onOpenChange={setColumnDialogOpen}
        columns={localColumns}
        onSave={cols => {
          setLocalColumns(cols)
          onSaveColumnPrefs(cols)
          setColumnDialogOpen(false)
        }}
      />
      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={open => {
          setDeleteDialogOpen(open)
        }}
        title={t('entity.workspace.deleteConfirmTitle')}
        description={t('entity.workspace.deleteConfirmDescription', {
          count: selectedIds.size,
        })}
        confirmLabel={t('entity.workspace.delete')}
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}
