import { useState, useCallback } from 'react'
import type {
  StockLevelWithVariant,
  ProductWithStock,
  VariantWithStock,
} from '@/lib/types/entity'
import { useTranslation } from 'react-i18next'
import { Skeleton } from '@/components/ui/skeleton'
import { PaginationFooter } from '@/components/entity'
import { formatCurrency } from '@/lib/utils'
import i18n from '@/i18n/config'
import { ChevronRightIcon, ChevronDownIcon } from 'lucide-react'
import { commands } from '@/lib/tauri-bindings'

type Commands = typeof commands & {
  productsGetByWarehouseWithStock: (
    warehouseId: string
  ) => Promise<
    | { status: 'ok'; data: ProductWithStock[] }
    | { status: 'error'; error: string }
  >
  variantsGetByProductAndWarehouse: (
    productId: string,
    warehouseId: string
  ) => Promise<
    | { status: 'ok'; data: VariantWithStock[] }
    | { status: 'error'; error: string }
  >
}

export interface WarehousesSubTableProps {
  stockLevels: StockLevelWithVariant[]
  isLoading?: boolean
  warehouseId: string
  expandedProductIds?: Set<string>
  productsCache?: Map<string, ProductWithStock[]>
  variantsCache?: Map<string, VariantWithStock[]>
  onProductExpand?: (productId: string) => void
  isLoadingProducts?: (warehouseId: string) => boolean
  isLoadingVariants?: (productId: string) => boolean
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
  const [expandedWarehouses, setExpandedWarehouses] = useState<Set<string>>(
    new Set()
  )
  const [localProductsCache, setLocalProductsCache] = useState<
    Map<string, ProductWithStock[]>
  >(new Map())
  const [localVariantsCache, setLocalVariantsCache] = useState<
    Map<string, VariantWithStock[]>
  >(new Map())
  const [loadingProducts, setLoadingProducts] = useState<Set<string>>(new Set())
  const [loadingVariants, setLoadingVariants] = useState<Set<string>>(new Set())
  const [errorProducts, setErrorProducts] = useState<Map<string, string>>(
    new Map()
  )
  const [errorVariants, setErrorVariants] = useState<Map<string, string>>(
    new Map()
  )
  const [productPagination, setProductPagination] = useState({
    page: 1,
    pageSize: 10,
    totalRows: 0,
    totalPages: 1,
  })

  const typedCommands = commands as Commands

  const handleWarehouseExpand = useCallback(
    async (whId: string) => {
      const newExpanded = new Set(expandedWarehouses)
      if (newExpanded.has(whId)) {
        newExpanded.delete(whId)
      } else {
        newExpanded.add(whId)
        setProductPagination(prev => ({ ...prev, page: 1 }))
        if (!productsCache.has(whId) && !localProductsCache.has(whId)) {
          setLoadingProducts(prev => new Set(prev).add(whId))
          setErrorProducts(prev => {
            const next = new Map(prev)
            next.delete(whId)
            return next
          })
          try {
            const result = await typedCommands.productsGetByWarehouseWithStock(
              whId,
              productPagination.pageSize,
              (productPagination.page - 1) * productPagination.pageSize
            )
            if (result.status === 'ok') {
              setLocalProductsCache(prev =>
                new Map(prev).set(whId, result.data)
              )
            } else {
              setErrorProducts(prev => new Map(prev).set(whId, result.error))
            }
          } catch (e) {
            setErrorProducts(prev => new Map(prev).set(whId, String(e)))
          } finally {
            setLoadingProducts(prev => {
              const next = new Set(prev)
              next.delete(whId)
              return next
            })
          }
        }
      }
      setExpandedWarehouses(newExpanded)
      onWarehouseExpand?.(whId)
    },
    [
      expandedWarehouses,
      productsCache,
      localProductsCache,
      onWarehouseExpand,
      typedCommands,
      productPagination.page,
      productPagination.pageSize,
    ]
  )

  const handleProductPageChange = useCallback(
    (page: number, pageSize: number) => {
      setProductPagination(prev => ({ ...prev, page, pageSize }))
    },
    []
  )

  const handleProductExpand = useCallback(
    async (productId: string, whId: string) => {
      const cacheKey = `${productId}-${whId}`
      const newExpanded = new Set(expandedProductIds)
      if (newExpanded.has(productId)) {
        newExpanded.delete(productId)
      } else {
        newExpanded.add(productId)
        if (!variantsCache.has(cacheKey) && !localVariantsCache.has(cacheKey)) {
          setLoadingVariants(prev => new Set(prev).add(cacheKey))
          setErrorVariants(prev => {
            const next = new Map(prev)
            next.delete(cacheKey)
            return next
          })
          try {
            const result = await typedCommands.variantsGetByProductAndWarehouse(
              productId,
              whId
            )
            if (result.status === 'ok') {
              setLocalVariantsCache(prev =>
                new Map(prev).set(cacheKey, result.data)
              )
            } else {
              setErrorVariants(prev =>
                new Map(prev).set(cacheKey, result.error)
              )
            }
          } catch (e) {
            setErrorVariants(prev => new Map(prev).set(cacheKey, String(e)))
          } finally {
            setLoadingVariants(prev => {
              const next = new Set(prev)
              next.delete(cacheKey)
              return next
            })
          }
        }
      }
      onProductExpand?.(productId)
    },
    [
      expandedProductIds,
      variantsCache,
      localVariantsCache,
      onProductExpand,
      typedCommands,
    ]
  )

  const products = productsCache.has(warehouseId)
    ? (productsCache.get(warehouseId) ?? [])
    : (localProductsCache.get(warehouseId) ?? [])
  const isWarehouseExpanded = expandedWarehouses.has(warehouseId)
  const warehouseLoading =
    isLoadingProducts(warehouseId) || loadingProducts.has(warehouseId)
  const warehouseError = errorProducts.get(warehouseId)

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
            <th className="px-3 py-2 text-start text-on-surface-variant font-label-caps w-10">
              <button
                onClick={() => handleWarehouseExpand(warehouseId)}
                className="p-1 hover:bg-surface-container-high rounded transition-colors"
                aria-label={
                  isWarehouseExpanded
                    ? 'Collapse warehouse'
                    : 'Expand warehouse'
                }
              >
                {isWarehouseExpanded ? (
                  <ChevronDownIcon className="size-4" />
                ) : (
                  <ChevronRightIcon className="size-4" />
                )}
              </button>
            </th>
            <th className="px-3 py-2 text-start text-on-surface-variant font-label-caps">
              {t('entity.stock.warehouseProduct') ?? 'Product'}
            </th>
            <th className="px-3 py-2 text-start text-on-surface-variant font-label-caps">
              {t('entity.stock.sku') ?? 'SKU'}
            </th>
            <th className="px-3 py-2 text-end text-on-surface-variant font-label-caps">
              {t('entity.stock.quantity') ?? 'Qty'}
            </th>
          </tr>
        </thead>
        <tbody>
          {isWarehouseExpanded && (
            <>
              {warehouseError && (
                <tr className="border-t border-outline-variant/30">
                  <td colSpan={4} className="px-3 py-2 text-error text-body-sm">
                    {t('entity.stock.errorLoadingProducts')}: {warehouseError}
                  </td>
                </tr>
              )}
              {products.length === 0 && !warehouseError && (
                <tr className="border-t border-outline-variant/30">
                  <td
                    colSpan={4}
                    className="px-3 py-2 text-on-surface-variant text-body-sm"
                  >
                    {t('entity.stock.noProductsInWarehouse') ??
                      'No stock in this warehouse'}
                  </td>
                </tr>
              )}
              {products.map(product => {
                const cacheKey = `${product.id}-${warehouseId}`
                const isProductExpanded = expandedProductIds.has(product.id)
                const variants = variantsCache.has(cacheKey)
                  ? (variantsCache.get(cacheKey) ?? [])
                  : (localVariantsCache.get(cacheKey) ?? [])
                const productLoading =
                  isLoadingVariants(product.id) || loadingVariants.has(cacheKey)
                const productError = errorVariants.get(cacheKey)

                return (
                  <>
                    <tr key={product.id}>
                      <td className="px-3 py-2">
                        <button
                          onClick={() =>
                            handleProductExpand(product.id, warehouseId)
                          }
                          className="p-1 hover:bg-surface-container-high rounded transition-colors"
                          aria-label={
                            isProductExpanded
                              ? 'Collapse product'
                              : 'Expand product'
                          }
                        >
                          {isProductExpanded ? (
                            <ChevronDownIcon className="size-4" />
                          ) : (
                            <ChevronRightIcon className="size-4" />
                          )}
                        </button>
                      </td>
                      <td className="px-3 py-2 text-on-surface font-medium">
                        {product.name}
                      </td>
                      <td className="px-3 py-2 text-on-surface-variant">—</td>
                      <td className="px-3 py-2 text-end text-on-surface-variant">
                        —
                      </td>
                    </tr>
                    {isProductExpanded && (
                      <>
                        {productError && (
                          <tr className="border-t border-outline-variant/30 bg-surface-container-lowest">
                            <td
                              colSpan={4}
                              className="px-8 py-2 text-error text-body-sm"
                            >
                              {t('entity.stock.errorLoadingVariants')}:{' '}
                              {productError}
                            </td>
                          </tr>
                        )}
                        {productLoading && (
                          <tr className="border-t border-outline-variant/30 bg-surface-container-lowest">
                            <td colSpan={4} className="px-8 py-2">
                              <Skeleton className="h-8 w-full" />
                            </td>
                          </tr>
                        )}
                        {!productLoading &&
                          variants.length === 0 &&
                          !productError && (
                            <tr className="border-t border-outline-variant/30 bg-surface-container-lowest">
                              <td
                                colSpan={4}
                                className="px-8 py-2 text-on-surface-variant text-body-sm"
                              >
                                {t('entity.stock.noVariants') ??
                                  'No variants found'}
                              </td>
                            </tr>
                          )}
                        {!productLoading &&
                          variants.map(variant => (
                            <tr
                              key={variant.variant_id}
                              className="border-t border-outline-variant/30 bg-surface-container-lowest"
                            >
                              <td className="px-8 py-1" />
                              <td className="px-8 py-1 text-on-surface pl-10 text-body-sm">
                                {variant.variant_name}
                              </td>
                              <td className="px-3 py-1 text-on-surface text-body-sm font-data-tabular tabular-nums">
                                {variant.sku}
                              </td>
                              <td className="px-3 py-1 text-end text-on-surface text-body-sm font-data-tabular tabular-nums">
                                {formatCurrency(variant.quantity, locale)}
                              </td>
                            </tr>
                          ))}
                      </>
                    )}
                  </>
                )
              })}
              <PaginationFooter
                pagination={productPagination}
                onPageChange={handleProductPageChange}
                isLoading={isLoadingProducts(warehouseId)}
              />
            </>
          )}
          {!isWarehouseExpanded &&
            stockLevels.map(level => (
              <tr
                key={`${level.variant_id}-${warehouseId}`}
                className="border-t border-outline-variant/30"
              >
                <td className="px-3 py-2" />
                <td className="px-3 py-2 text-on-surface">
                  {level.variant_name}
                </td>
                <td className="px-3 py-2 text-on-surface font-data-tabular tabular-nums">
                  {level.sku}
                </td>
                <td className="px-3 py-2 text-end text-on-surface font-data-tabular tabular-nums">
                  {formatCurrency(level.quantity, locale)}
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  )
}
