import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type {
  StockLevelWithVariant,
  ProductWithStock,
} from '@/lib/types/entity'
import { useTranslation } from 'react-i18next'
import { Skeleton } from '@/components/ui/skeleton'
import { PaginationFooter } from '@/components/entity'
import { commands } from '@/lib/tauri-bindings'
import { getEntityLayout } from '@/lib/entity-layout'

export interface WarehousesSubTableProps {
  warehouseId: string
  onProductClick?: (productId: string) => void
}

export function WarehousesSubTable({
  warehouseId,
  onProductClick,
}: WarehousesSubTableProps) {
  const { t } = useTranslation()

  const { data: stockLevels = [], isLoading } = useQuery({
    queryKey: ['entity', 'warehouses', 'stockLevels', warehouseId],
    queryFn: async () => {
      const result =
        await commands.stockLevelsGetByWarehouseWithNames(warehouseId)
      if (result.status === 'ok') {
        return result.data as StockLevelWithVariant[]
      }
      return []
    },
    staleTime: Infinity,
  })
  const [localProductsCache, setLocalProductsCache] = useState<
    Map<string, ProductWithStock[]>
  >(new Map())
  const [loadingProducts, setLoadingProducts] = useState<Set<string>>(new Set())
  const [errorProducts, setErrorProducts] = useState<Map<string, string>>(
    new Map()
  )

  const subTablePagination = [5, 10, 15]
  const [productPagination, setProductPagination] = useState({
    page: 1,
    pageSize: subTablePagination[0] ?? 5,
    totalRows: 0,
    totalPages: 1,
  })
  const hasFetchedRef = useRef<Set<string>>(new Set())

  const WAREHOUSE_PRODUCT_COLUMNS = useMemo(() => {
    const columnsNames = ['name', 'company', 'quantity']
    return getEntityLayout('products', t, columnsNames)
  }, [t])

  const localProductsCacheRef = useRef(localProductsCache)

  useEffect(() => {
    localProductsCacheRef.current = localProductsCache
  }, [localProductsCache])

  const fetchProducts = useCallback(
    (page: number, pageSize: number) => {
      const cacheKey = `${warehouseId}-${page}-${pageSize}`
      const cached = localProductsCacheRef.current.get(cacheKey)
      if (cached) {
        return Promise.resolve(cached)
      }

      setLoadingProducts(prev => new Set(prev).add(cacheKey))
      setErrorProducts(prev => {
        const next = new Map(prev)
        next.delete(cacheKey)
        return next
      })

      return commands
        .productsGetByWarehousePaginated(
          warehouseId,
          pageSize,
          (page - 1) * pageSize
        )
        .then(result => {
          if (result.status === 'ok') {
            const products = result.data.data
            setLocalProductsCache(prev => new Map(prev).set(cacheKey, products))
            setProductPagination(prev => ({
              ...prev,
              totalRows: result.data.total_count,
              totalPages: Math.ceil(result.data.total_count / pageSize) || 1,
            }))
            return products
          } else {
            setErrorProducts(prev => new Map(prev).set(cacheKey, result.error))
            return []
          }
        })
        .catch(e => {
          setErrorProducts(prev => new Map(prev).set(cacheKey, String(e)))
          return []
        })
        .finally(() => {
          setLoadingProducts(prev => {
            const next = new Set(prev)
            next.delete(cacheKey)
            return next
          })
        })
    },
    [warehouseId]
  )

  useEffect(() => {
    const page = 1
    const pageSize = 10
    const cacheKey = `${warehouseId}-${page}-${pageSize}`

    if (
      !localProductsCacheRef.current.has(cacheKey) &&
      !hasFetchedRef.current.has(cacheKey)
    ) {
      hasFetchedRef.current.add(cacheKey)
      fetchProducts(page, pageSize)
    }
  }, [warehouseId, fetchProducts])

  const handlePageChange = useCallback(
    (page: number, pageSize: number) => {
      setProductPagination(prev => ({ ...prev, page, pageSize }))
      fetchProducts(page, pageSize)
    },
    [fetchProducts]
  )

  const cacheKey = `${warehouseId}-${productPagination.page}-${productPagination.pageSize}`
  const products = localProductsCache.get(cacheKey) ?? []
  const warehouseLoading = loadingProducts.has(cacheKey)
  const warehouseError = errorProducts.get(cacheKey)

  if (isLoading || warehouseLoading) {
    return (
      <div
        className="pl-8 py-3 bg-surface-container-low"
        data-testid="warehouses-subtable-skeleton"
      >
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
          {warehouseError && (
            <tr className="border-t border-outline-variant/30">
              <td
                colSpan={WAREHOUSE_PRODUCT_COLUMNS.length}
                className="px-3 py-2 text-error text-body-sm"
              >
                {t('entity.stock.errorLoadingProducts')}: {warehouseError}
              </td>
            </tr>
          )}
          {products.length === 0 && !warehouseError && (
            <tr className="border-t border-outline-variant/30">
              <td
                colSpan={WAREHOUSE_PRODUCT_COLUMNS.length}
                className="px-3 py-2 text-on-surface-variant text-body-sm"
              >
                {t('entity.stock.noProductsInWarehouse') ??
                  'No stock in this warehouse'}
              </td>
            </tr>
          )}
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
        pagination={productPagination}
        onPageChange={handlePageChange}
        isLoading={loadingProducts.has(cacheKey)}
        pageSizes={subTablePagination}
      />
    </div>
  )
}
