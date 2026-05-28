import { useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef as TanstackColumnDef,
} from '@tanstack/react-table'
import type {
  ColumnDef,
  EntityRow,
  DataTableProps,
  VariantRow,
} from '@/lib/types/entity'
import { Skeleton } from '@/components/ui/skeleton'
import { useIsRTL } from '@/hooks/user-is-rtl'
import { VariantsSubTable } from './VariantsSubTable'

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
  expandedRowIds?: Set<string>
  variantsCache?: Map<string, VariantRow[]>
  onRowToggleExpand?: (id: string) => void
  isLoadingVariants?: (id: string) => boolean
}

export function DataTable({
  columns,
  data,
  sort,
  isLoading,
  selectedIds,
  onSort,
  onRowSelect,
  onRowClick,
  expandedRowIds,
  variantsCache,
  onRowToggleExpand,
  isLoadingVariants,
}: DataTableProps & ExpandedRowProps) {
  const { t } = useTranslation()
  const visibleColumns = useMemo(
    () => columns.filter(col => col.visible).sort((a, b) => a.order - b.order),
    [columns]
  )

  const isRTLlayout = useIsRTL()

  const tableColumns = useMemo<TanstackColumnDef<EntityRow>[]>(
    () => [
      {
        id: 'select',
        size: 40,
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
      },
      {
        id: 'expand',
        size: 40,
        enableResizing: false,
        header: () => null,
        cell: ({ row }) => (
          <button
            className="p-1 hover:bg-surface-bright rounded transition-colors"
            onClick={e => {
              e.stopPropagation()
              onRowToggleExpand?.(row.original.id)
            }}
          >
            <span
              className={`material-symbols-outlined text-[18px] text-on-surface-variant transition-transform ${expandedRowIds?.has(row.original.id) ? 'rotate-90' : ''}`}
            >
              chevron_right
            </span>
          </button>
        ),
      },
      ...visibleColumns.map(col => ({
        id: col.id,
        accessorKey: col.id,
        header: col.label,
        size: col.width,
        enableSorting: col.sortable,
        enableResizing: true,
        cell: ({ getValue }: { getValue: () => unknown }) => (
          <DataCell column={col} value={getValue()} />
        ),
      })),
      {
        id: 'actions',
        size: 100,
        enableResizing: false,
        header: () => (
          <span className="text-center">
            {t('entity.workspace.columns.actions')}
          </span>
        ),
        cell: () => (
          <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              className="p-1 text-on-surface-variant hover:text-primary"
              title={t('entity.workspace.edit')}
              aria-label={t('entity.workspace.edit')}
            >
              <span
                className="material-symbols-outlined text-[18px]"
                aria-hidden="true"
              >
                edit
              </span>
            </button>
            <button
              className="p-1 text-on-surface-variant hover:text-error"
              title={t('entity.workspace.delete')}
              aria-label={t('entity.workspace.delete')}
            >
              <span
                className="material-symbols-outlined text-[18px]"
                aria-hidden="true"
              >
                delete
              </span>
            </button>
          </div>
        ),
      },
    ],
    [visibleColumns, expandedRowIds, onRowToggleExpand, t]
  )

  const table = useReactTable({
    data,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
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
      const newSelection =
        typeof set === 'function'
          ? set(Object.fromEntries([...selectedIds].map(id => [id, true])))
          : set
      const ids = Object.keys(newSelection).filter(k => newSelection[k])
      onRowSelect(new Set(ids))
    },
    state: {
      sorting: sort
        ? [{ id: sort.columnId, desc: sort.direction === 'desc' }]
        : [],
      rowSelection: Object.fromEntries([...selectedIds].map(id => [id, true])),
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
          onSort(null)
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
    <div className="flex-1 overflow-auto border border-outline-variant rounded-lg bg-surface-container-lowest">
      <div className="min-w-0">
        <table
          className="w-full border-collapse text-body-sm"
          style={{ tableLayout: 'fixed' }}
        >
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
                        style={{ width: header.getSize() }}
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
              <>
                <tr
                  key={row.id}
                  className="hover:bg-surface-container-high transition-colors group even:bg-surface-container-low/30"
                >
                  {row.getVisibleCells().map(cell => {
                    const columnDef = columns.find(c => c.id === cell.column.id)
                    const isNameCol = columnDef?.isNameColumn
                    return (
                      <td
                        key={cell.id}
                        className={`px-compact-padding py-2 text-on-surface ${isNameCol ? 'cursor-pointer hover:bg-surface-container-highest' : ''}`}
                        style={{ width: cell.column.getSize() }}
                        onClick={
                          isNameCol
                            ? () => onRowClick(row.original.id, row.original)
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
                {expandedRowIds?.has(row.original.id) && (
                  <tr key={`${row.id}-detail`}>
                    <td colSpan={columns.length + 2} className="p-0">
                      <VariantsSubTable
                        variants={variantsCache?.get(row.original.id) ?? []}
                        isLoading={isLoadingVariants?.(row.original.id)}
                      />
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
