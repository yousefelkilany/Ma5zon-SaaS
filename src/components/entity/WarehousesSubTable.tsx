import type { StockLevelWithVariant, ProductWithStock, VariantWithStock } from "@/lib/types/entity"
import { useTranslation } from "react-i18next"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency } from "@/lib/utils"
import { useMemo } from "react"
import i18n from "@/i18n/config"
import {
  useReactTable,
  getCoreRowModel,
  type ColumnDef,
} from "@tanstack/react-table"
import { ChevronRightIcon } from "lucide-react"

export interface WarehousesSubTableProps {
  stockLevels: StockLevelWithVariant[]
  isLoading?: boolean
  warehouseId: string
  expandedProductIds?: Set<string>
  productsCache?: Map<string, ProductWithStock[]>
  variantsCache?: Map<string, VariantWithStock[]>
  onWarehouseExpand?: (warehouseId: string) => void
  onProductExpand?: (productId: string) => void
  isLoadingProducts?: (warehouseId: string) => boolean
  isLoadingVariants?: (productId: string) => boolean
}

interface StockLevelRow {
  variant_id: string
  variant_name: string
  sku: string
  quantity: number
}

export function WarehousesSubTable({
  stockLevels,
  isLoading,
  warehouseId,
  expandedProductIds = new Set(),
  productsCache = new Map(),
  variantsCache = new Map(),
  onWarehouseExpand,
  onProductExpand,
  isLoadingProducts = () => false,
  isLoadingVariants = () => false,
}: WarehousesSubTableProps) {
  const { t } = useTranslation()
  const locale = i18n.language

  const columns = useMemo<ColumnDef<StockLevelRow>[]>(
    () => [
      {
        id: "variant_name",
        header: t("entity.stock.variantName") ?? "Variant",
        accessorKey: "variant_name",
      },
      {
        id: "sku",
        header: t("entity.stock.sku") ?? "SKU",
        accessorKey: "sku",
      },
      {
        id: "quantity",
        header: t("entity.stock.quantity") ?? "Qty",
        accessorKey: "quantity",
        cell: ({ getValue }) =>
          formatCurrency(getValue() as number, locale),
      },
    ],
    [t, locale]
  )

  const table = useReactTable({
    data: stockLevels,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  if (isLoading) {
    return (
      <div className="pl-8 py-3 bg-surface-container-low" data-testid="warehouses-subtable-skeleton">
        <Skeleton className="h-16 w-full" />
      </div>
    )
  }

  if (stockLevels.length === 0) {
    return (
      <div className="pl-8 py-3 bg-surface-container-low text-on-surface-variant text-body-sm">
        <span>{t("entity.stock.noLevels")}</span>
      </div>
    )
  }

  return (
    <div className="pl-8 py-2 bg-surface-container-low">
      <table className="w-full text-body-sm">
        <thead>
          <tr className="border-b border-outline-variant">
            {table.getHeaderGroups().map(headerGroup => (
              <th key={headerGroup.id} className="px-3 py-2 text-start text-on-surface-variant font-label-caps">
                {headerGroup.headers.map(header => header.column.columnDef.header as string)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.getRowModel().rows.map(row => (
            <tr key={row.id} className="border-t border-outline-variant/30">
              {row.getVisibleCells().map(cell => (
                <td key={cell.id} className="px-3 py-2 text-on-surface">
                  {typeof cell.column.columnDef.cell === "function"
                    ? cell.column.columnDef.cell(cell.getContext())
                    : String(cell.getValue() ?? "-")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}