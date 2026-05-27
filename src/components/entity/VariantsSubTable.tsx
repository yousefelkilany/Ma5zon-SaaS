import type { VariantRow } from '@/lib/types/entity'
import { Skeleton } from '@/components/ui/skeleton'

interface VariantsSubTableProps {
  variants: VariantRow[]
  isLoading?: boolean
}

function formatPrice(price: number | undefined): string {
  if (price === undefined) return '-'
  return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
}

export function VariantsSubTable({ variants, isLoading }: VariantsSubTableProps) {
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
            <th className="px-3 py-2 text-left text-on-surface-variant font-label-caps">
              SKU
            </th>
            <th className="px-3 py-2 text-left text-on-surface-variant font-label-caps">
              Variant Name
            </th>
            <th className="px-3 py-2 text-left text-on-surface-variant font-label-caps">
              UOM
            </th>
            <th className="px-3 py-2 text-right text-on-surface-variant font-label-caps">
              Retail
            </th>
            <th className="px-3 py-2 text-right text-on-surface-variant font-label-caps">
              Wholesale
            </th>
            <th className="px-3 py-2 text-right text-on-surface-variant font-label-caps">
              Distribution
            </th>
          </tr>
        </thead>
        <tbody>
          {variants.map(variant => (
            <tr
              key={variant.id}
              className="border-t border-outline-variant/30 hover:bg-surface-container-high transition-colors"
            >
              <td className="px-3 py-2 text-on-surface font-data-tabular tabular-nums">
                {variant.sku}
              </td>
              <td className="px-3 py-2 text-on-surface">
                {variant.variant_name}
              </td>
              <td className="px-3 py-2 text-on-surface">
                {variant.uom_id}
              </td>
              <td className="px-3 py-2 text-right text-on-surface font-data-tabular tabular-nums">
                {formatPrice((variant as Record<string, unknown>).retail_price as number)}
              </td>
              <td className="px-3 py-2 text-right text-on-surface font-data-tabular tabular-nums">
                {formatPrice((variant as Record<string, unknown>).wholesale_price as number)}
              </td>
              <td className="px-3 py-2 text-right text-on-surface font-data-tabular tabular-nums">
                {formatPrice((variant as Record<string, unknown>).dist_price as number)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}