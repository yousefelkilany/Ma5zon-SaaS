import type { StockLevelWithVariant } from '@/lib/types/entity'
import { useTranslation } from 'react-i18next'
import { Skeleton } from '@/components/ui/skeleton'
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
            <th className="px-3 py-2 text-start text-on-surface-variant font-label-caps">
              {t('entity.variant.name')}
            </th>
            <th className="px-3 py-2 text-start text-on-surface-variant font-label-caps">
              SKU
            </th>
            <th className="px-3 py-2 text-end text-on-surface-variant font-label-caps">
              {t('entity.stock.quantity')}
            </th>
          </tr>
        </thead>
        <tbody>
          {stockLevels.map(level => (
            <tr
              key={`${level.variant_id}-${warehouseId}`}
              className="border-t border-outline-variant/30"
            >
              <td className="px-3 py-2 text-on-surface">
                {level.variant_name}
              </td>
              <td className="px-3 py-2 text-on-surface-variant">{level.sku}</td>
              <td className="px-3 py-2 text-end text-on-surface font-data-tabular tabular-nums">
                {level.quantity.toLocaleString(locale, {
                  minimumFractionDigits: 2,
                })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
