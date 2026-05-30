import { useState, useCallback } from 'react'
import { QueryClient } from '@tanstack/react-query'
import type {
  ColumnDef,
  EntityRow,
  PaginationState,
  SortState,
  FilterState,
  VariantRow,
} from '@/lib/types/entity'
import { Toolbar } from './Toolbar'
import { DataTable } from './DataTable'
import { PaginationFooter } from './PaginationFooter'

import { FilterDialog } from './FilterDialog'
import { ColumnVisibilityDialog } from './ColumnVisibilityDialog'

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
  expandedRowIds?: Set<string>
  variantsCache?: Map<string, VariantRow[]>
  onRowToggleExpand?: (id: string) => void
  isLoadingVariants?: (id: string) => boolean
}

const defaultPagination: PaginationState = {
  page: 1,
  pageSize: 10,
  totalRows: 0,
  totalPages: 0,
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
  expandedRowIds,
  variantsCache,
  onRowToggleExpand,
  isLoadingVariants,
}: DataTableShellProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [sort, setSort] = useState<SortState | null>(null)
  const [filters] = useState<FilterState[]>([])
  const [searchValue, setSearchValue] = useState('')
  const [paginationState, setPaginationState] = useState<PaginationState>(
    pagination || defaultPagination
  )
  const [filterDialogOpen, setFilterDialogOpen] = useState(false)
  const [columnDialogOpen, setColumnDialogOpen] = useState(false)

  const handleSort = useCallback((newSort: SortState | null) => {
    setSort(newSort)
  }, [])

  const handlePageChange = useCallback((page: number, pageSize: number) => {
    setPaginationState(prev => ({ ...prev, page, pageSize }))
  }, [])

  const handleRowSelect = useCallback((ids: Set<string>) => {
    setSelectedIds(ids)
  }, [])

  const handleRowClick = useCallback((_id: string) => {
    // Row click handling is done in DataTable with typed modals
  }, [])

  const handleBulkAction = useCallback((_action: string) => {
    setSelectedIds(new Set())
  }, [])

  const handleColumnSave = useCallback(
    (newColumns: ColumnDef[]) => {
      onSaveColumnPrefs(newColumns)
      queryClient.invalidateQueries({ queryKey: ['entity', entityType] })
      setColumnDialogOpen(false)
    },
    [onSaveColumnPrefs, queryClient, entityType]
  )

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Toolbar
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        activeFilterCount={filters.length}
        onFiltersClick={() => setFilterDialogOpen(true)}
        onColumnsClick={() => setColumnDialogOpen(true)}
        hasSelection={selectedIds.size > 0}
        selectedCount={selectedIds.size}
        onBulkAction={handleBulkAction}
        onExport={onExport}
      />
      <div className="flex-1 overflow-hidden">
        <div className="h-full flex flex-col">
          <DataTable
            entityType={entityType}
            queryClient={queryClient}
            columns={columns}
            data={data}
            sort={sort}
            isLoading={isLoading}
            selectedIds={selectedIds}
            onSort={handleSort}
            onRowSelect={handleRowSelect}
            onRowClick={handleRowClick}
            expandedRowIds={expandedRowIds}
            variantsCache={variantsCache}
            onRowToggleExpand={onRowToggleExpand}
            isLoadingVariants={isLoadingVariants}
          />
        </div>
      </div>
      <PaginationFooter
        pagination={paginationState}
        onPageChange={handlePageChange}
        isLoading={isLoading}
      />
      <FilterDialog
        open={filterDialogOpen}
        onOpenChange={setFilterDialogOpen}
        columns={columns}
        filters={filters}
        onApply={onFiltersApply}
      />
      <ColumnVisibilityDialog
        open={columnDialogOpen}
        onOpenChange={setColumnDialogOpen}
        columns={columns}
        onSave={handleColumnSave}
      />
    </div>
  )
}