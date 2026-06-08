import { useMemo, useCallback, Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from '@tanstack/react-router'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef as TanstackColumnDef,
  type CellContext,
} from '@tanstack/react-table'
import type { ColumnDef, EntityRow, DataTableProps } from '@/lib/types/entity'
import type { QueryClient } from '@tanstack/react-query'
import { Skeleton } from '@/components/ui/skeleton'
import { useIsRTL } from '@/hooks/user-is-rtl'
import { useTabStore } from '@/store/workspace-store'
import { commands } from '@/lib/tauri-bindings'
import { VariantsSubTable } from './VariantsSubTable'
import { WarehousesSubTable } from './WarehousesSubTable'

function StatusBadge({ status }: { status: string }) {
  const badgeClass =
    status === 'Paid'
      ? 'bg-secondary/15 text-secondary'
      : status === 'Overdue'
        ? 'bg-error/15 text-error'
        : 'bg-tertiary-fixed-dim/15 text-tertiary'

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full ${badgeClass} text-[11px] font-bold`}
    >
      {status}
    </span>
  )
}

function DataCell({ column, value }: { column: ColumnDef; value: unknown }) {
  const { t } = useTranslation()

  if (column.type === 'status') {
    return <StatusBadge status={String(value)} />
  }
  if (column.type === 'currency') {
    const currencySymbol = t('common.currency')
    return (
      <span className="font-data-tabular tabular-nums">
        {currencySymbol}{' '}
        {(Number(value) || 0).toLocaleString('en-US', {
          minimumFractionDigits: 2,
        })}
      </span>
    )
  }
  if (column.type === 'number') {
    return (
      <span className="font-data-tabular tabular-nums text-right">
        {Number(value).toLocaleString()}
      </span>
    )
  }
  return <span>{String(value)}</span>
}

interface ExpandedRowProps {
  isExpanded?: (id: string) => boolean
  onVariantClick?: (variantId: string, productId: string) => void
  onAddVariant?: (productId: string) => void
  onProductClick?: (productId: string) => void
}

export function DataTable({
  entityType,
  queryClient,
  columns,
  data,
  sort,
  isLoading,
  selectedIds,
  onSort,
  onRowSelect,
  onRowClick,
  onVariantClick,
  onAddVariant,
  onProductClick,
}: DataTableProps & ExpandedRowProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const visibleColumns = useMemo(
    () => columns.filter(col => col.visible).sort((a, b) => a.order - b.order),
    [columns]
  )

  const isRTLlayout = useIsRTL()

  const selectColumn = useMemo<TanstackColumnDef<EntityRow>>(
    () => ({
      isUtil: true,
      id: 'select',
      size: 10,
      enableResizing: false,
      header: ({ table }) => (
        <input
          type="checkbox"
          className="w-4 h-4"
          aria-label={t('entity.workspace.selectAll')}
          checked={table.getIsAllRowsSelected()}
          onChange={table.getToggleAllRowsSelectedHandler()}
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          className="w-4 h-4"
          aria-label={t('entity.workspace.selectRow')}
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
          onClick={e => e.stopPropagation()}
        />
      ),
    }),
    [t]
  )

  const expandColumn = useMemo<TanstackColumnDef<EntityRow>>(
    () => ({
      isUtil: true,
      id: 'expand',
      size: 10,
      enableResizing: false,
      header: () => null,
      cell: (props: CellContext<EntityRow, unknown>) => (
        <ExpandCell
          rowId={props.row.original.id}
          entityType={entityType}
          queryClient={queryClient}
        />
      ),
    }),
    [entityType, queryClient]
  )

  const tableColumns = useMemo<TanstackColumnDef<EntityRow>[]>(() => {
    const cols: TanstackColumnDef<EntityRow>[] = [selectColumn]
    if (entityType === 'products' || entityType === 'warehouses')
      cols.push(expandColumn)
    cols.push(
      ...visibleColumns.map((col, idx) => ({
        id: col.id,
        accessorKey: col.id,
        header: col.label,
        size: col.width,
        enableSorting: col.sortable,
        enableResizing: idx + 1 != visibleColumns.length,
        cell: ({ getValue }: { getValue: () => unknown }) => (
          <DataCell column={col} value={getValue()} />
        ),
      }))
    )

    return cols
  }, [selectColumn, expandColumn, entityType, visibleColumns])

  const handleRowClick = useCallback(
    (id: string, _row: EntityRow) => {
      const modalType = entityType.slice(0, -1)
      navigate({
        to: '/entity/$entityType',
        params: { entityType: entityType },
        search: { entity_modal: modalType, entity_id: id },
      })
    },
    [navigate, entityType]
  )

  const internalOnRowClick = useCallback(
    (id: string, row: EntityRow) => {
      handleRowClick(id, row)
      onRowClick?.(id, row)
    },
    [handleRowClick, onRowClick]
  )

  const table = useReactTable({
    data,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row: EntityRow) => row.id,
    manualSorting: true,
    manualFiltering: true,
    manualPagination: true,
    enableRowSelection: true,
    enableColumnResizing: true,
    columnResizeDirection: isRTLlayout ? 'rtl' : 'ltr',
    columnResizeMode: 'onChange',
    defaultColumn: {
      minSize: 50,
      maxSize: 200,
    },

    onRowSelectionChange: set => {
      const currentSelection = Object.fromEntries(
        Object.keys(selectedIds).map(id => [id, true])
      )
      const newSelection =
        typeof set === 'function' ? set(currentSelection) : set
      const ids = Object.keys(newSelection).filter(k => newSelection[k])
      onRowSelect(new Set(ids))
    },
    state: {
      sorting: sort
        ? [{ id: sort.columnId, desc: sort.direction === 'desc' }]
        : [],
      rowSelection: Object.fromEntries(
        Object.keys(selectedIds).map(id => [id, true])
      ),
    },
  })

  const handleSortChange = useCallback(
    (columnId: string) => {
      if (!sort) {
        onSort({ columnId, direction: 'asc' })
      } else if (sort.columnId === columnId) {
        if (sort.direction === 'asc') {
          onSort({ columnId, direction: 'desc' })
        } else {
          onSort()
        }
      } else {
        onSort({ columnId, direction: 'asc' })
      }
    },
    [sort, onSort]
  )

  if (isLoading) {
    return (
      <main className="flex-1 overflow-auto no-scrollbar bg-surface-container-lowest">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-surface-container-high z-10 border-b border-outline">
            <tr className="font-label-caps text-label-caps text-on-surface-variant">
              <th className="px-3 py-3 font-medium border-r border-outline-variant w-10">
                <Skeleton className="h-4 w-4" />
              </th>
              <th className="px-3 py-3 font-medium border-r border-outline-variant w-10">
                <Skeleton className="h-4 w-4" />
              </th>
              {visibleColumns.map(col => (
                <th
                  key={col.id}
                  className="px-3 py-3 font-medium border-r border-outline-variant"
                >
                  <Skeleton className="h-4 w-full max-w-30" />
                </th>
              ))}
              <th className="px-3 py-3 font-medium text-center">
                <Skeleton className="h-4 w-16 mx-auto" />
              </th>
            </tr>
          </thead>
          <tbody className="font-body-sm text-body-sm">
            {Array.from({ length: 8 }).map((_, rowIndex) => (
              <tr key={rowIndex} className="border-b border-outline-variant/30">
                <td className="px-3 py-2">
                  <Skeleton className="h-4 w-4" />
                </td>
                <td className="px-3 py-2">
                  <Skeleton className="h-4 w-4" />
                </td>
                {visibleColumns.map(col => (
                  <td key={col.id} className="px-3 py-2">
                    <Skeleton className="h-5 w-full" />
                  </td>
                ))}
                <td className="px-3 py-2">
                  <Skeleton className="h-5 w-20 mx-auto" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>
    )
  }

  return (
    <>
      <div className="flex-1 overflow-auto border border-outline-variant rounded-lg bg-surface-container-lowest">
        <div className="min-w-0">
          <table className="w-full border-collapse text-body-sm">
            <thead className="sticky top-0 z-10 bg-surface-container-high border-b border-outline-variant shadow-sm">
              {table.getHeaderGroups().map(headerGroup => {
                const headers = headerGroup.headers
                return (
                  <tr key={headerGroup.id}>
                    {headers.map((header, _index) => {
                      const canResize = header.column.getCanResize()

                      return (
                        <th
                          key={header.id}
                          className="px-compact-padding py-2.5 text-left font-bold text-on-surface relative select-none"
                          style={{ width: header.getSize() ?? 20 }}
                        >
                          {canResize && (
                            <div
                              onMouseDown={header.getResizeHandler()}
                              onTouchStart={header.getResizeHandler()}
                              onClick={e => e.stopPropagation()}
                              className={`absolute top-0 h-full w-4 cursor-col-resize touch-none flex items-center justify-center
                              ${isRTLlayout ? 'inset-e-0' : 'inset-s-0'}
                            `}
                            >
                              <div
                                className={`h-full w-0.5 transition-colors  ${header.column.getIsResizing() ? 'bg-secondary' : 'bg-outline-variant hover:bg-secondary'}`}
                              />
                            </div>
                          )}
                          {header.isPlaceholder ? null : (
                            <div className="flex items-center justify-between">
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                              {header.column.columnDef.enableSorting && (
                                <button
                                  className="p-1 hover:bg-surface-bright rounded transition-colors focus-visible:ring-2 focus-visible:ring-secondary"
                                  onClick={() => handleSortChange(header.id)}
                                >
                                  <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
                                    {sort?.columnId === header.id
                                      ? sort.direction === 'asc'
                                        ? 'expand_less'
                                        : 'expand_more'
                                      : 'unfold_more'}
                                  </span>
                                </button>
                              )}
                            </div>
                          )}
                        </th>
                      )
                    })}
                  </tr>
                )
              })}
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {table.getRowModel().rows.map(row => (
                <Fragment key={row.id}>
                  <tr className="hover:bg-surface-container-high transition-colors group even:bg-surface-container-low/30">
                    {row.getVisibleCells().map(cell => {
                      const columnDef = columns.find(
                        c => c.id === cell.column.id
                      )
                      const isDataCol = columnDef?.isDataCol
                      return (
                        <td
                          key={cell.id}
                          className={`px-compact-padding py-2 text-on-surface ${isDataCol ? 'cursor-pointer hover:bg-surface-container-highest' : ''}`}
                          style={{
                            width: cell.column.getSize(),
                          }}
                          onClick={
                            isDataCol
                              ? () =>
                                  internalOnRowClick(
                                    row.original.id,
                                    row.original
                                  )
                              : undefined
                          }
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </td>
                      )
                    })}
                  </tr>
                  <ExpandedRow
                    rowId={row.original.id}
                    entityType={entityType}
                    columnsLength={columns.length}
                    onVariantClick={onVariantClick}
                    onAddVariant={onAddVariant}
                    onProductClick={onProductClick}
                  />
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

function ExpandCell({
  rowId,
  entityType,
  queryClient,
}: {
  rowId: string
  entityType: string
  queryClient: QueryClient
}) {
  const expanded = useTabStore(
    state => state.tabUIStates[state.activeTabId]?.expandedIds[rowId] === true
  )

  const onToggle = useCallback(
    (id: string) => {
      useTabStore.getState().toggleExpanded(id)
      const nowExpanded = useTabStore.getState().isExpanded(id)
      if (nowExpanded) {
        if (entityType === 'products') {
          queryClient.prefetchQuery({
            queryKey: ['entity', entityType, 'variants', id],
            queryFn: async () => {
              const result = await commands.variantsGetByProductWithStock(id)
              return result.status === 'ok' ? result.data : []
            },
          })
        }
        if (entityType === 'warehouses') {
          queryClient.prefetchQuery({
            queryKey: ['entity', entityType, 'stockLevels', id],
            queryFn: async () => {
              const result =
                await commands.stockLevelsGetByWarehouseWithNames(id)
              return result.status === 'ok' ? result.data : []
            },
          })
        }
      }
    },
    [entityType, queryClient]
  )

  return (
    <button
      className="p-1 hover:bg-surface-bright rounded transition-colors"
      onClick={e => {
        e.stopPropagation()
        onToggle(rowId)
      }}
    >
      <span
        className={`icon-directional material-symbols-outlined text-[18px] text-on-surface-variant transition-transform ${expanded ? 'rotate-90' : 'rotate-180'}`}
      >
        chevron_right
      </span>
    </button>
  )
}

function ExpandedRow({
  rowId,
  entityType,
  columnsLength,
  onVariantClick,
  onAddVariant,
  onProductClick,
}: {
  rowId: string
  entityType: string
  columnsLength: number
  onVariantClick?: (variantId: string, productId: string) => void
  onAddVariant?: (productId: string) => void
  onProductClick?: (productId: string) => void
}) {
  const isExpanded = useTabStore(
    state => state.tabUIStates[state.activeTabId]?.expandedIds[rowId] === true
  )

  if (!isExpanded) return null

  return (
    <tr>
      <td colSpan={columnsLength + 2} className="p-0">
        {entityType === 'products' && (
          <VariantsSubTable
            productId={rowId}
            onVariantClick={onVariantClick}
            onAddVariant={onAddVariant}
          />
        )}
        {entityType === 'warehouses' && (
          <WarehousesSubTable
            warehouseId={rowId}
            onProductClick={onProductClick}
          />
        )}
      </td>
    </tr>
  )
}
