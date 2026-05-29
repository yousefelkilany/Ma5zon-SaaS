import type { VariantRow } from '@/lib/types/entity'
import { useTranslation } from 'react-i18next'
import { getEntityLayout } from '@/lib/entity-layout'
import { formatCurrency } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { useMemo } from 'react'
import i18n from '@/i18n/config'

interface VariantsSubTableProps {
  variants: VariantRow[]
  isLoading?: boolean
}

export function VariantsSubTable({ variants, isLoading }: VariantsSubTableProps) {
  const { t } = useTranslation()

  const columns = useMemo(() => getEntityLayout('product_variants', t), [t])
  const locale = i18n.language

  if (isLoading) {
    return (
      <div className="pl-8 py-3 bg-surface-container-low">
        <Skeleton className="h-16 w-full" />
      </div>
    )
  }

  if (variants.length === 0) {
    return (
      <div className="pl-8 py-3 bg-surface-container-low text-on-surface-variant text-body-sm">
        No variants found
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
          {variants.map(variant => (
            <tr
              key={variant.id}
              className="border-t border-outline-variant/30 hover:bg-surface-container-high transition-colors"
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
                    ? formatCurrency(variant[col.id as keyof VariantRow] as number, locale)
                    : String(variant[col.id as keyof VariantRow] ?? '-')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}