import { useState, useCallback } from 'react'
import type {
  ColumnDef,
  EntityRow,
  PaginationState,
  SortState,
  FilterState,
} from '@/lib/types/entity'
import { Toolbar } from './Toolbar'
import { DataTable } from './DataTable'
import { PaginationFooter } from './PaginationFooter'
import { EntityDetailModal } from './EntityDetailModal'
import { FilterDialog } from './FilterDialog'
import { ColumnVisibilityDialog } from './ColumnVisibilityDialog'

interface DataTableShellProps {
  entityType: string
  columns: ColumnDef[]
  data: EntityRow[]
  pagination: PaginationState
  isLoading: boolean
  onSaveColumnPrefs: (columns: ColumnDef[]) => void
  onFiltersApply: (filters: FilterState[]) => void
  onExport: () => void
}

const defaultPagination: PaginationState = {
  page: 1,
  pageSize: 50,
  totalRows: 0,
  totalPages: 0,
}

export function DataTableShell({
  entityType,
  columns,
  data,
  pagination,
  isLoading,
  onSaveColumnPrefs,
  onFiltersApply,
  onExport,
}: DataTableShellProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [sort, setSort] = useState<SortState | null>(null)
  const [filters, setFilters] = useState<FilterState[]>([])
  const [searchValue, setSearchValue] = useState('')
  const [paginationState, setPaginationState] = useState<PaginationState>(
    pagination || defaultPagination
  )
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [detailEntityId, setDetailEntityId] = useState<string | null>(null)
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

  const handleRowClick = useCallback((id: string) => {
    setDetailEntityId(id)
    setDetailModalOpen(true)
  }, [])

  const handleBulkAction = useCallback((action: string) => {
    setSelectedIds(new Set())
  }, [])

  const handleColumnSave = useCallback((newColumns: ColumnDef[]) => {
    onSaveColumnPrefs(newColumns)
    setColumnDialogOpen(false)
  }, [onSaveColumnPrefs])

  return (
    <div className="flex flex-col h-full">
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
      <DataTable
        entityType={entityType}
        columns={columns}
        data={data}
        pagination={paginationState}
        sort={sort}
        filters={filters}
        isLoading={isLoading}
        selectedIds={selectedIds}
        onSort={handleSort}
        onPageChange={handlePageChange}
        onRowSelect={handleRowSelect}
        onRowClick={handleRowClick}
        onSaveColumnPrefs={onSaveColumnPrefs}
      />
      <PaginationFooter
        pagination={paginationState}
        onPageChange={handlePageChange}
        isLoading={isLoading}
      />
      <EntityDetailModal
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        entityType={entityType}
        entityId={detailEntityId}
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