import type { StockLevelWithVariant } from '@/lib/types/entity'
import { useTranslation } from 'react-i18next'
import { Skeleton } from '@/components/ui/skeleton'
import { getEntityLayout } from '@/lib/entity-layout'
import { formatCurrency } from '@/lib/utils'
import { useMemo } from 'react'
import i18n from '@/i18n/config'

interface WarehousesSubTableProps {
  stockLevels: StockLevelWithVariant[]
  isLoading?: boolean
  warehouseId: string
}

export function WarehousesSubTable({
  stockLevels,
  isLoading,
  warehouseId,
}: WarehousesSubTableProps) {
  const { t } = useTranslation()
  const locale = i18n.language

  const columns = useMemo(() => getEntityLayout('stock_levels', t), [t])

  if (isLoading) {
    return (
      <div className="pl-8 py-3 bg-surface-container-low">
        <Skeleton className="h-16 w-full" />
      </div>
    )
  }

  if (stockLevels.length === 0) {
    return (
      <div className="pl-8 py-3 bg-surface-container-low text-on-surface-variant text-body-sm">
        <span>{t('entity.stock.noLevels')}</span>
      </div>
    )
  }

  return (
    <div className="pl-8 py-2 bg-surface-container-low">
      <table className="w-full text-body-sm">
        <thead>
          <tr className="border-b border-outline-variant">
            {columns.map(col => (
              <th
                key={col.id}
                className={`px-3 py-2 text-start text-on-surface-variant font-label-caps ${
                  col.type === 'currency' ? 'text-end' : ''
                }`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {stockLevels.map(level => (
            <tr
              key={`${level.variant_id}-${warehouseId}`}
              className="border-t border-outline-variant/30"
            >
              {columns.map(col => (
                <td
                  key={col.id}
                  className={`px-3 py-2 text-on-surface ${
                    col.type === 'currency'
                      ? 'text-right text-on-surface font-data-tabular tabular-nums'
                      : ''
                  }`}
                >
                  {col.type === 'currency'
                    ? formatCurrency(
                        level[col.id as keyof StockLevelWithVariant] as number,
                        locale
                      )
                    : String(level[col.id as keyof StockLevelWithVariant] ?? '-')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
