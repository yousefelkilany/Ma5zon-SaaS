import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import type { StockLevelWithVariant } from '@/lib/types/entity'
import { commands } from '@/lib/tauri-bindings'
import i18n from '@/i18n/config'
import { Skeleton } from '@/components/ui/skeleton'

interface StockLevelsTableProps {
  stockLevels: StockLevelWithVariant[]
  isLoading?: boolean
  view: 'variant' | 'product'
  warehouseNames?: Map<string, string>
}

export function StockLevelsTable({
  stockLevels,
  isLoading,
  view,
  warehouseNames,
}: StockLevelsTableProps) {
  const { t } = useTranslation()
  const locale = i18n.language
  const [transferState, setTransferState] = useState<{
    variantId: string
    warehouseId: string
    fromWarehouseId: string
  } | null>(null)

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    )
  }

  if (stockLevels.length === 0) {
    return (
      <p className="text-body-sm text-on-surface-variant p-4">
        {t('entity.stock.noLevels')}
      </p>
    )
  }

  if (view === 'variant') {
    return (
      <VariantStockView
        stockLevels={stockLevels}
        warehouseNames={warehouseNames}
        locale={locale}
        transferState={transferState}
        setTransferState={setTransferState}
      />
    )
  }

  return (
    <ProductStockPivot
      stockLevels={stockLevels}
      warehouseNames={warehouseNames}
      locale={locale}
      transferState={transferState}
      setTransferState={setTransferState}
    />
  )
}

function VariantStockView({
  stockLevels,
  warehouseNames,
  locale,
  transferState,
  setTransferState,
}: {
  stockLevels: StockLevelWithVariant[]
  warehouseNames?: Map<string, string>
  locale: string
  transferState: {
    variantId: string
    warehouseId: string
    fromWarehouseId: string
  } | null
  setTransferState: React.Dispatch<
    React.SetStateAction<{
      variantId: string
      warehouseId: string
      fromWarehouseId: string
    } | null>
  >
}) {
  const { t } = useTranslation()

  return (
    <table className="w-full text-body-sm">
      <thead>
        <tr className="border-b border-outline-variant">
          <th className="px-3 py-2 text-start text-on-surface-variant font-label-caps">
            {t('entity.warehouse.name')}
          </th>
          <th className="px-3 py-2 text-end text-on-surface-variant font-label-caps">
            {t('entity.stock.quantity')}
          </th>
        </tr>
      </thead>
      <tbody>
        {stockLevels.map((level, idx) => (
          <>
            <tr
              key={`${level.variant_id}-${level.warehouse_id}-${idx}`}
              className="border-t border-outline-variant/30"
            >
              <td className="px-3 py-2 text-on-surface">
                {warehouseNames?.get(level.warehouse_id) ?? level.warehouse_id}
              </td>
              <td className="px-3 py-2 text-end text-on-surface font-data-tabular tabular-nums">
                {level.quantity.toLocaleString(locale)}
                <button
                  onClick={() =>
                    setTransferState({
                      variantId: stockLevels[0]?.variant_id ?? '',
                      warehouseId: level.warehouse_id,
                      fromWarehouseId: level.warehouse_id,
                    })
                  }
                  className="ml-2 text-secondary hover:opacity-70"
                  title={t('entity.stock.transfer')}
                >
                  <span className="material-symbols-outlined text-sm">
                    swap_horiz
                  </span>
                </button>
              </td>
            </tr>
            {transferState?.warehouseId === level.warehouse_id && (
              <InlineTransferSection
                variantId={stockLevels[0]?.variant_id ?? ''}
                warehouseId={level.warehouse_id}
                warehouseNames={warehouseNames}
                onClose={() => setTransferState(null)}
              />
            )}
          </>
        ))}
      </tbody>
    </table>
  )
}

function ProductStockPivot({
  stockLevels,
  warehouseNames,
  locale,
  transferState,
  setTransferState,
}: {
  stockLevels: StockLevelWithVariant[]
  warehouseNames?: Map<string, string>
  locale: string
  transferState: {
    variantId: string
    warehouseId: string
    fromWarehouseId: string
  } | null
  setTransferState: React.Dispatch<
    React.SetStateAction<{
      variantId: string
      warehouseId: string
      fromWarehouseId: string
    } | null>
  >
}) {
  const { t } = useTranslation()

  const { rows, columns, totals } = useMemo(() => {
    const variantMap = new Map<string, Map<string, number>>()
    const warehouseSet = new Set<string>()
    const columnSums: Record<string, number> = {}
    let rowTotalSum = 0

    for (const level of stockLevels) {
      const variantMapEntry = variantMap.get(level.variant_id)
      if (!variantMapEntry) {
        variantMap.set(
          level.variant_id,
          new Map([[level.warehouse_id, level.quantity]])
        )
      } else {
        variantMapEntry.set(level.warehouse_id, level.quantity)
      }
      warehouseSet.add(level.warehouse_id)
      columnSums[level.warehouse_id] =
        (columnSums[level.warehouse_id] || 0) + level.quantity
      rowTotalSum += level.quantity
    }

    const variantRows: {
      variantId: string
      variantName: string
      sku: string
      quantities: Map<string, number>
      rowTotal: number
    }[] = []
    for (const [variantId, quantities] of variantMap) {
      let rowTotal = 0
      for (const q of quantities.values()) {
        rowTotal += q
      }
      const firstLevel = stockLevels.find(l => l.variant_id === variantId)
      variantRows.push({
        variantId,
        variantName: firstLevel?.variant_name ?? '',
        sku: firstLevel?.sku ?? '',
        quantities,
        rowTotal,
      })
    }

    const cols = Array.from(warehouseSet).sort()
    const totalRow = columnSums

    return {
      rows: variantRows,
      columns: cols,
      totals: { ...totalRow, _rowTotal: rowTotalSum },
    }
  }, [stockLevels])

  if (rows.length === 0) {
    return (
      <p className="text-body-sm text-on-surface-variant p-4">
        {t('entity.stock.noLevels')}
      </p>
    )
  }

  return (
    <table className="w-full text-body-sm">
      <thead>
        <tr className="border-b border-outline-variant">
          <th className="px-3 py-2 text-start text-on-surface-variant font-label-caps">
            {t('entity.variant.sku')}
          </th>
          <th className="px-3 py-2 text-start text-on-surface-variant font-label-caps">
            {t('entity.variant.name')}
          </th>
          {columns.map(wId => (
            <th
              key={wId}
              className="px-3 py-2 text-end text-on-surface-variant font-label-caps"
            >
              {warehouseNames?.get(wId) ?? wId}
            </th>
          ))}
          <th className="px-3 py-2 text-end text-on-surface-variant font-label-caps">
            {t('entity.stock.total')}
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map(row => (
          <>
            <tr
              key={row.variantId}
              className="border-t border-outline-variant/30"
            >
              <td className="px-3 py-2 text-on-surface-variant">{row.sku}</td>
              <td className="px-3 py-2 text-on-surface">{row.variantName}</td>
              {columns.map(col => (
                <td
                  key={col}
                  className="px-3 py-2 text-end text-on-surface font-data-tabular tabular-nums group"
                >
                  {row.quantities.get(col)?.toLocaleString(locale) ?? '-'}
                  <button
                    onClick={() =>
                      setTransferState({
                        variantId: row.variantId,
                        warehouseId: col,
                        fromWarehouseId: col,
                      })
                    }
                    className="ml-1 text-secondary hover:opacity-70 opacity-0 group-hover:opacity-100"
                    title={t('entity.stock.transfer')}
                  >
                    <span className="material-symbols-outlined text-xs">
                      swap_horiz
                    </span>
                  </button>
                </td>
              ))}
              <td className="px-3 py-2 text-end text-on-surface font-data-tabular tabular-nums font-bold">
                {row.rowTotal.toLocaleString(locale)}
              </td>
            </tr>
            {columns.map(col =>
              transferState?.variantId === row.variantId &&
              transferState?.warehouseId === col ? (
                <InlineTransferSection
                  key={`transfer-${col}`}
                  variantId={row.variantId}
                  warehouseId={col}
                  warehouseNames={warehouseNames}
                  onClose={() => setTransferState(null)}
                />
              ) : null
            )}
          </>
        ))}
      </tbody>
      <tfoot>
        <tr className="border-t-2 border-outline-variant font-bold">
          <td colSpan={2} className="px-3 py-2 text-on-surface">
            {t('entity.stock.total')}
          </td>
          {columns.map(col => (
            <td
              key={col}
              className="px-3 py-2 text-end text-on-surface font-data-tabular tabular-nums"
            >
              {((totals as Record<string, number>)[col] || 0).toLocaleString(
                locale
              )}
            </td>
          ))}
          <td className="px-3 py-2 text-end text-on-surface font-data-tabular tabular-nums">
            {totals._rowTotal.toLocaleString(locale)}
          </td>
        </tr>
      </tfoot>
    </table>
  )
}

function InlineTransferSection({
  variantId,
  warehouseId,
  warehouseNames,
  onClose,
}: {
  variantId: string
  warehouseId: string
  warehouseNames?: Map<string, string>
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [toWarehouseId, setToWarehouseId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses', 'all'],
    queryFn: async () => {
      const result = await commands.warehousesGetAll([], [], null)
      if (result.status === 'ok') {
        return result.data
      }
      return []
    },
  })

  const toWarehouseOptions =
    warehouses
      ?.filter(w => w.id !== warehouseId)
      .map(w => ({ value: w.id, label: w.name })) ?? []

  const handleSubmit = async () => {
    if (!toWarehouseId || !quantity) return
    setIsSubmitting(true)
    try {
      await commands.createTransfer(variantId, warehouseId, toWarehouseId, parseInt(quantity))
      onClose()
    } catch (err) {
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <tr className="bg-surface-bright/50">
      <td colSpan={3} className="px-3 py-3">
        <div className="flex items-center gap-3">
          <span className="text-body-sm text-on-surface-variant">
            {t('entity.stock.transferFrom')}
          </span>
          <select
            value={warehouseId}
            disabled
            className="bg-surface-disabled border border-outline-variant rounded px-2 py-1 text-body-sm text-on-surface-variant"
          >
            <option value={warehouseId}>
              {warehouseNames?.get(warehouseId) ?? warehouseId}
            </option>
          </select>
          <select
            value={toWarehouseId}
            onChange={e => setToWarehouseId(e.target.value)}
            className="bg-surface border border-outline-variant rounded px-2 py-1 text-body-sm"
          >
            <option value="">{t('entity.stock.selectWarehouse')}</option>
            {toWarehouseOptions.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <input
            type="number"
            value={quantity}
            onChange={e => setQuantity(e.target.value)}
            min="1"
            className="w-20 bg-surface border border-outline-variant rounded px-2 py-1 text-body-sm"
            placeholder={t('entity.stock.quantity')}
          />
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !toWarehouseId || !quantity}
            className="bg-secondary text-on-secondary px-3 py-1 rounded text-body-sm hover:opacity-90 disabled:opacity-50"
          >
            {t('entity.stock.confirm')}
          </button>
          <button
            onClick={onClose}
            className="text-body-sm text-on-surface-variant hover:text-on-surface"
          >
            {t('common.cancel')}
          </button>
        </div>
      </td>
    </tr>
  )
}
