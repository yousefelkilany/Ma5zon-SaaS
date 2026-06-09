import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { ProductWithStock } from '@/lib/types/entity'
import { useTranslation } from 'react-i18next'
import { Skeleton } from '@/components/ui/skeleton'
import { PaginationFooter } from '@/components/entity'
import { commands } from '@/lib/tauri-bindings'
import { getEntityLayout } from '@/lib/entity-layout'

export interface WarehousesSubTableProps {
  warehouseId: string
  onProductClick?: (productId: string) => void
}

const SUB_TABLE_PAGINATION = [5, 10, 15]

export function WarehousesSubTable({
  warehouseId,
  onProductClick,
}: WarehousesSubTableProps) {
  const { t } = useTranslation()

  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: SUB_TABLE_PAGINATION[0] ?? 5,
  })

  const { data: productsData, isLoading } = useQuery({
    queryKey: [
      'entity',
      'warehouses',
      'products',
      warehouseId,
      pagination.page,
      pagination.pageSize,
    ],
    queryFn: async () => {
      console.debug(
        '[asd]',
        pagination.pageSize,
        (pagination.page - 1) * pagination.pageSize
      )
      const result = await commands.productsGetByWarehousePaginated(
        warehouseId,
        (pagination.page - 1) * pagination.pageSize,
        pagination.pageSize
      )
      if (result.status === 'ok') {
        return result.data
      }
      console.error('Failed to load products:', result.error)
      return { data: [] as ProductWithStock[], total_count: 0 }
    },
    staleTime: Infinity,
  })

  const WAREHOUSE_PRODUCT_COLUMNS = useMemo(() => {
    const columnsNames = ['name', 'company', 'quantity']
    return getEntityLayout('product', t, columnsNames)
  }, [t])

  const products = productsData?.data ?? []
  const totalCount = productsData?.total_count ?? 0
  const totalPages = Math.ceil(totalCount / pagination.pageSize) || 1

  const handlePageChange = (page: number, pageSize: number) => {
    setPagination({ page, pageSize })
  }

  if (isLoading) {
    return (
      <div
        className="pl-8 py-3 bg-surface-container-low"
        data-testid="warehouses-subtable-skeleton"
      >
        <Skeleton className="h-16 w-full" />
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="pl-8 py-3 bg-surface-container-low text-on-surface-variant text-body-sm">
        <span>{t('entity.stock.noProductsInWarehouse')}</span>
      </div>
    )
  }

  return (
    <div className="pl-8 py-2 bg-surface-container-low">
      <table className="w-full text-body-sm">
        <thead>
          <tr className="border-b border-outline-variant">
            {WAREHOUSE_PRODUCT_COLUMNS.map(col => (
              <th
                key={col.id}
                className={`px-3 py-2 text-start text-on-surface-variant font-label-caps ${
                  col.type === 'number' ? 'text-end' : ''
                }`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {products.map(product => (
            <tr
              key={product.id}
              className="border-t border-outline-variant/30 hover:bg-surface-container-high transition-colors cursor-pointer"
              onClick={() => onProductClick?.(product.id)}
            >
              {WAREHOUSE_PRODUCT_COLUMNS.map(col => (
                <td
                  key={col.id}
                  className={`px-3 py-2 text-on-surface ${
                    col.type === 'number'
                      ? 'text-start text-on-surface font-data-tabular tabular-nums'
                      : ''
                  }`}
                >
                  {col.id === 'quantity'
                    ? product.quantity.toLocaleString()
                    : String(product[col.id as keyof ProductWithStock] ?? '-')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <PaginationFooter
        pagination={{
          page: pagination.page,
          pageSize: pagination.pageSize,
          totalRows: totalCount,
          totalPages,
        }}
        onPageChange={handlePageChange}
        isLoading={isLoading}
        pageSizes={SUB_TABLE_PAGINATION}
      />
    </div>
  )
}
