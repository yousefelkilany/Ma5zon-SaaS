import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { QueryClient } from '@tanstack/react-query'
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
import { FilterDialog } from './FilterDialog'
import { ColumnVisibilityDialog } from './ColumnVisibilityDialog'
import { ConfirmationDialog } from './ConfirmationDialog'
import Fuse from 'fuse.js'
import { normalizeArabic } from '@/lib/utils'
import { useTabStore } from '@/store/tab-store'

interface DataTableShellProps {
  entityType: string
  queryClient: QueryClient
  columns: ColumnDef[]
  data: EntityRow[]
  pagination: PaginationState
  isLoading: boolean
  onSaveColumnPrefs: (columns: ColumnDef[]) => void
  onFiltersApply: (filters: FilterState[]) => void
  onPrintSelected: (ids: Set<string>, data: EntityRow[]) => void
  onExportFormatSelect: (
    format: 'csv' | 'xlsx',
    selectedData: EntityRow[]
  ) => void
  onDelete: (ids: Set<string>) => void
  onPageChange?: (page: number, pageSize: number) => void
  sort?: SortState | null
  onSortChange?: (sort: SortState | null) => void
  onVariantClick?: (variantId: string, productId: string) => void
  onAddVariant?: (productId: string) => void
  onProductClick?: (productId: string) => void
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
  onPrintSelected,
  onExportFormatSelect,
  onDelete,
  onPageChange,
  sort: _externalSort,
  onSortChange,
  onVariantClick,
  onAddVariant,
  onProductClick,
}: DataTableShellProps) {
  const { t } = useTranslation()
  const { tabUIStates, activeTabId } = useTabStore()
  const currentTabState = tabUIStates[activeTabId]
  const selectedIds = useMemo(
    () => currentTabState?.selectedIds ?? {},
    [currentTabState?.selectedIds]
  )
  const isExpanded = useMemo(
    () => (id: string) => useTabStore.getState().isExpanded(id),
    []
  )
  const sort = currentTabState?.sort ?? null
  const filters = currentTabState?.filters ?? []
  const searchValue = currentTabState?.searchValue ?? ''
  const setSelectedIds = useTabStore(state => state.setSelectedIds)
  const setSort = useTabStore(state => state.setSort)
  const setFilters = useTabStore(state => state.setFilters)
  const setSearchValue = useTabStore(state => state.setSearchValue)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [filterDialogOpen, setFilterDialogOpen] = useState(false)
  const [columnDialogOpen, setColumnDialogOpen] = useState(false)
  const [localColumns, setLocalColumns] = useState<ColumnDef[]>(columns)

  const clientSearchIds = useMemo((): Record<string, boolean> | null => {
    if (!searchValue.trim() || searchValue.length < 2) {
      return null
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

    return Object.fromEntries(
      fuse.search(normalizedSearch).map(r => [r.item.id, true])
    )
  }, [data, searchValue, columns])

  const clientSearchResults = useMemo(
    () =>
      clientSearchIds ? data.filter(row => clientSearchIds[row.id]) : data,
    [data, clientSearchIds]
  )

  const handleSearchChange = useCallback(
    (value: string) => {
      const currentSelectedIds = currentTabState?.selectedIds ?? {}
      if (value.trim().length < 2 || !clientSearchIds) {
        setSearchValue(value)
        return
      }
      const intersectedIds = Object.fromEntries(
        Object.keys(currentSelectedIds)
          .filter(id => clientSearchIds[id])
          .map(id => [id, true])
      )
      setSelectedIds(intersectedIds)
      setSearchValue(value)
    },
    [clientSearchIds, currentTabState, setSearchValue, setSelectedIds]
  )

  const cachedDataMap = useRef<Map<string, EntityRow>>(new Map())
  useEffect(() => {
    cachedDataMap.current.clear()
    for (const row of data) {
      if (row.id) cachedDataMap.current.set(row.id, row)
    }
  }, [data])

  useEffect(() => {
    setLocalColumns(columns)
  }, [columns])

  const handleSortChange = useCallback(
    (newSort: SortState | null) => {
      setSelectedIds({})
      setSort(newSort)
      onSortChange?.(newSort)
    },
    [onSortChange, setSort, setSelectedIds]
  )

  const handlePageChange = useCallback(
    (page: number, pageSize: number) => {
      setSelectedIds({})
      onPageChange?.(page, pageSize)
    },
    [onPageChange, setSelectedIds]
  )

  const handleRowSelect = useCallback(
    (ids: Set<string>) => {
      setSelectedIds(Object.fromEntries([...ids].map(id => [id, true])))
    },
    [setSelectedIds]
  )

  const handleRowClick = useCallback((_id: string) => {
    // Row click handling is done in DataTable with typed modals
  }, [])

  const handlePrintSelected = useCallback(() => {
    const selectedData = data.filter(row => selectedIds[row.id])
    if (selectedData.length === 0) return
    onPrintSelected(new Set(Object.keys(selectedIds)), selectedData)
  }, [selectedIds, data, onPrintSelected])

  const handleExportFormat = useCallback(
    (format: 'csv' | 'xlsx') => {
      const selectedData = data.filter(row => selectedIds[row.id])
      if (selectedData.length === 0) return
      onExportFormatSelect(format, selectedData)
    },
    [selectedIds, data, onExportFormatSelect]
  )

  const handleDeleteClick = useCallback(() => {
    setDeleteDialogOpen(true)
  }, [])

  const handleConfirmDelete = useCallback(() => {
    onDelete(new Set(Object.keys(selectedIds)))
    setDeleteDialogOpen(false)
    setSelectedIds({})
  }, [selectedIds, onDelete, setSelectedIds])

  const handleFiltersApply = useCallback(
    (newFilters: FilterState[]) => {
      setSelectedIds({})
      setFilters(newFilters)
      onFiltersApply(newFilters)
    },
    [onFiltersApply, setFilters, setSelectedIds]
  )

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Toolbar
        searchValue={searchValue}
        onSearchChange={handleSearchChange}
        activeFilterCount={filters.length}
        onFiltersClick={() => setFilterDialogOpen(true)}
        onColumnsClick={() => setColumnDialogOpen(true)}
        selectedCount={Object.keys(selectedIds).length}
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
            data={clientSearchResults}
            sort={sort}
            isLoading={isLoading}
            selectedIds={selectedIds}
            onSort={handleSortChange}
            onRowSelect={handleRowSelect}
            onRowClick={handleRowClick}
            isExpanded={isExpanded}
            onVariantClick={onVariantClick}
            onAddVariant={onAddVariant}
            onProductClick={onProductClick}
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
          count: Object.keys(selectedIds).length,
        })}
        confirmLabel={t('entity.workspace.delete')}
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}
