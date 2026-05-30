import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { StockLevelWithVariant } from '@/lib/types/entity'
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
      />
    )
  }

  return (
    <ProductStockPivot
      stockLevels={stockLevels}
      warehouseNames={warehouseNames}
      locale={locale}
    />
  )
}

function VariantStockView({
  stockLevels,
  warehouseNames,
  locale,
}: {
  stockLevels: StockLevelWithVariant[]
  warehouseNames?: Map<string, string>
  locale: string
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
          <tr
            key={`${level.variant_id}-${level.warehouse_id}-${idx}`}
            className="border-t border-outline-variant/30"
          >
            <td className="px-3 py-2 text-on-surface">
              {warehouseNames?.get(level.warehouse_id) ?? level.warehouse_id}
            </td>
            <td className="px-3 py-2 text-end text-on-surface font-data-tabular tabular-nums">
              {level.quantity.toLocaleString(locale)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function ProductStockPivot({
  stockLevels,
  warehouseNames,
  locale,
}: {
  stockLevels: StockLevelWithVariant[]
  warehouseNames?: Map<string, string>
  locale: string
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
            {t('entity.variant.name')}
          </th>
          <th className="px-3 py-2 text-start text-on-surface-variant font-label-caps">
            SKU
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
          <tr
            key={row.variantId}
            className="border-t border-outline-variant/30"
          >
            <td className="px-3 py-2 text-on-surface">{row.variantName}</td>
            <td className="px-3 py-2 text-on-surface-variant">{row.sku}</td>
            {columns.map(col => (
              <td
                key={col}
                className="px-3 py-2 text-end text-on-surface font-data-tabular tabular-nums"
              >
                {row.quantities.get(col)?.toLocaleString(locale) ?? '-'}
              </td>
            ))}
            <td className="px-3 py-2 text-end text-on-surface font-data-tabular tabular-nums font-bold">
              {row.rowTotal.toLocaleString(locale)}
            </td>
          </tr>
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
