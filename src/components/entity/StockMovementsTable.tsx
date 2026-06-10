import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { StockMovement } from '@/lib/bindings'
import { Skeleton } from '@/components/ui/skeleton'
import i18n from '@/i18n/config'
import { cn, productEntity, variantEntity, warehouseEntity } from '@/lib/utils'
import type { MovementScope } from '@/services/entity/queryKeys'
import { useWarehouses } from '@/services/entity/queries'

function groupMovementsByVariantId(
  movements: StockMovement[]
): Map<string, StockMovement[]> {
  const groups = new Map<string, StockMovement[]>()
  for (const movement of movements) {
    const existing = groups.get(movement.variant_id) ?? []
    groups.set(movement.variant_id, [...existing, movement])
  }
  return groups
}

interface StockMovementsTableProps {
  movements: StockMovement[]
  isLoading: boolean
  error?: string
  entity?: MovementScope
  emptyMessage?: string
  isPaginated?: boolean
  currentPage?: number
  totalPages?: number
  onPageChange?: (page: number) => void
  onRetry?: () => void
}

export function StockMovementsTable({
  movements,
  isLoading,
  error,
  entity = variantEntity,
  emptyMessage,
  isPaginated,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  onRetry,
}: StockMovementsTableProps) {
  const { t } = useTranslation()
  const locale = i18n.language

  const productNames = new Map<string, string>()
  const variantNames = new Map<string, string>()
  const warehouseNames = new Map<string, string>()

  const { data: warehouses } = useWarehouses()
  if (warehouses) for (const w of warehouses) warehouseNames.set(w.id, w.name)

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-4 text-center">
        <span className="material-symbols-outlined text-4xl text-error">
          error
        </span>
        <p className="text-body-sm text-on-surface-variant">{error}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-body-sm text-secondary hover:opacity-70"
          >
            {t('common.retry')}
          </button>
        )}
      </div>
    )
  }

  if (movements.length === 0) {
    return (
      <div className="p-4 text-center">
        <p className="text-body-sm text-on-surface-variant">
          {emptyMessage ??
            t('entity.stockMovement.noMovements', 'No stock movements')}
        </p>
      </div>
    )
  }

  if (entity === productEntity) {
    return (
      <ProductMovementsView
        movements={movements}
        warehouseNames={warehouseNames}
        variantNames={variantNames}
        locale={locale}
      />
    )
  }

  if (entity === warehouseEntity) {
    return (
      <WarehouseMovementsView
        movements={movements}
        warehouseNames={warehouseNames}
        productNames={productNames}
        locale={locale}
      />
    )
  }

  return (
    <VariantMovementsView
      movements={movements}
      warehouseNames={warehouseNames}
      variantNames={variantNames}
      locale={locale}
      isPaginated={isPaginated}
      currentPage={currentPage}
      totalPages={totalPages}
      onPageChange={onPageChange}
    />
  )
}

function VariantMovementsView({
  movements,
  warehouseNames,
  variantNames,
  locale,
  isPaginated,
  currentPage,
  totalPages: externalTotalPages,
  onPageChange,
  pageSize: externalPageSize,
}: {
  movements: StockMovement[]
  warehouseNames?: Map<string, string>
  variantNames?: Map<string, string>
  locale: string
  isPaginated?: boolean
  currentPage?: number
  totalPages?: number
  onPageChange?: (page: number) => void
  pageSize?: number
}) {
  const { t } = useTranslation()
  const effectivePageSize = externalPageSize ?? 10

  const groupedMovements = useMemo(() => {
    return groupMovementsByVariantId(movements)
  }, [movements])

  const totalGroups = groupedMovements.size
  const totalPages =
    externalTotalPages ?? Math.ceil(totalGroups / effectivePageSize)
  const startIndex = ((currentPage ?? 1) - 1) * effectivePageSize
  const endIndex = startIndex + effectivePageSize
  const paginatedGroups = Array.from(groupedMovements.entries()).slice(
    startIndex,
    endIndex
  )

  return (
    <div className="flex flex-col">
      <div className="max-h-150 overflow-auto">
        {paginatedGroups.map(([variantId, variantMovements]) => (
          <div key={variantId} className="border-b border-outline-variant">
            <div className="bg-surface-bright px-4 py-2">
              <span className="text-body-sm font-medium text-on-surface">
                {variantNames?.get(variantId) ?? variantId}
              </span>
            </div>
            <table className="w-full text-body-sm">
              <thead>
                <tr className="border-b border-outline-variant">
                  <th className="px-3 py-2 text-start text-on-surface-variant font-label-caps">
                    {t('entity.stockMovement.movementType')}
                  </th>
                  <th className="px-3 py-2 text-end text-on-surface-variant font-label-caps">
                    {t('entity.stockMovement.quantity')}
                  </th>
                  <th className="px-3 py-2 text-start text-on-surface-variant font-label-caps">
                    {t('entity.stockMovement.fromWarehouse')}
                  </th>
                  <th className="px-3 py-2 text-start text-on-surface-variant font-label-caps">
                    {t('entity.stockMovement.toWarehouse')}
                  </th>
                  <th className="px-3 py-2 text-start text-on-surface-variant font-label-caps">
                    {t('entity.stock.date')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {variantMovements.map((movement, idx) => (
                  <tr
                    key={`${movement.id}-${idx}`}
                    className="border-t border-outline-variant/30"
                  >
                    <td className="px-3 py-2 text-on-surface">
                      {movement.movement_type}
                    </td>
                    <td className="px-3 py-2 text-end text-on-surface font-data-tabular tabular-nums">
                      {movement.quantity.toLocaleString(locale)}
                    </td>
                    <td className="px-3 py-2 text-on-surface">
                      {movement.from_warehouse_id
                        ? (warehouseNames?.get(movement.from_warehouse_id) ??
                          movement.from_warehouse_id)
                        : '-'}
                    </td>
                    <td className="px-3 py-2 text-on-surface">
                      {movement.to_warehouse_id
                        ? (warehouseNames?.get(movement.to_warehouse_id) ??
                          movement.to_warehouse_id)
                        : '-'}
                    </td>
                    <td className="px-3 py-2 text-on-surface">
                      {new Date(movement.created_at).toLocaleDateString(locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
      {isPaginated && (
        <div className="flex items-center justify-between border-t border-outline-variant px-4 py-3">
          <button
            onClick={() => onPageChange?.((currentPage ?? 1) - 1)}
            disabled={(currentPage ?? 1) <= 1}
            className={cn(
              'text-body-sm px-3 py-1 rounded border border-outline-variant',
              'hover:bg-surface-bright disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {t('common.previous')}
          </button>
          <span className="text-body-sm text-on-surface-variant">
            {currentPage ?? 1} / {totalPages ?? 1}
          </span>
          <button
            onClick={() => onPageChange?.((currentPage ?? 1) + 1)}
            disabled={(currentPage ?? 1) >= (totalPages ?? 1)}
            className={cn(
              'text-body-sm px-3 py-1 rounded border border-outline-variant',
              'hover:bg-surface-bright disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {t('common.next')}
          </button>
        </div>
      )}
    </div>
  )
}

function ProductMovementsView({
  movements,
  warehouseNames,
  variantNames,
  locale,
}: {
  movements: StockMovement[]
  warehouseNames?: Map<string, string>
  variantNames?: Map<string, string>
  locale: string
}) {
  const { t } = useTranslation()

  const groupedMovements = useMemo(() => {
    return groupMovementsByVariantId(movements)
  }, [movements])

  return (
    <div className="max-h-150 overflow-y-auto">
      {Array.from(groupedMovements.entries()).map(
        ([variantId, variantMovements]) => (
          <div key={variantId} className="border-b border-outline-variant">
            <div className="bg-surface-bright px-4 py-2">
              <span className="text-body-sm font-medium text-on-surface">
                {variantNames?.get(variantId) ?? variantId}
              </span>
            </div>
            <table className="w-full text-body-sm">
              <thead>
                <tr className="border-b border-outline-variant">
                  <th className="px-3 py-2 text-start text-on-surface-variant font-label-caps">
                    {t('entity.stockMovement.movementType')}
                  </th>
                  <th className="px-3 py-2 text-end text-on-surface-variant font-label-caps">
                    {t('entity.stockMovement.quantity')}
                  </th>
                  <th className="px-3 py-2 text-start text-on-surface-variant font-label-caps">
                    {t('entity.stockMovement.fromWarehouse')}
                  </th>
                  <th className="px-3 py-2 text-start text-on-surface-variant font-label-caps">
                    {t('entity.stockMovement.toWarehouse')}
                  </th>
                  <th className="px-3 py-2 text-start text-on-surface-variant font-label-caps">
                    {t('entity.stock.date')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {variantMovements.map((movement, idx) => (
                  <tr
                    key={`${movement.id}-${idx}`}
                    className="border-t border-outline-variant/30"
                  >
                    <td className="px-3 py-2 text-on-surface">
                      {movement.movement_type}
                    </td>
                    <td className="px-3 py-2 text-end text-on-surface font-data-tabular tabular-nums">
                      {movement.quantity.toLocaleString(locale)}
                    </td>
                    <td className="px-3 py-2 text-on-surface">
                      {movement.from_warehouse_id
                        ? (warehouseNames?.get(movement.from_warehouse_id) ??
                          movement.from_warehouse_id)
                        : '-'}
                    </td>
                    <td className="px-3 py-2 text-on-surface">
                      {movement.to_warehouse_id
                        ? (warehouseNames?.get(movement.to_warehouse_id) ??
                          movement.to_warehouse_id)
                        : '-'}
                    </td>
                    <td className="px-3 py-2 text-on-surface">
                      {new Date(movement.created_at).toLocaleDateString(locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  )
}

function WarehouseMovementsView({
  movements,
  warehouseNames,
  productNames,
  locale,
}: {
  movements: StockMovement[]
  warehouseNames?: Map<string, string>
  productNames?: Map<string, string>
  locale: string
}) {
  const { t } = useTranslation()

  const groupedMovements = useMemo(() => {
    const groups = new Map<
      string,
      { productId: string; movements: StockMovement[] }
    >()
    let currentProductId: string | null = null
    let currentGroup: StockMovement[] = []

    for (const movement of movements) {
      if (currentProductId !== movement.product_id) {
        if (currentProductId !== null && currentGroup.length > 0) {
          groups.set(currentProductId, {
            productId: currentProductId,
            movements: currentGroup,
          })
        }
        currentProductId = movement.product_id
        currentGroup = [movement]
      } else {
        currentGroup.push(movement)
      }
    }
    if (currentProductId !== null && currentGroup.length > 0) {
      groups.set(currentProductId, {
        productId: currentProductId,
        movements: currentGroup,
      })
    }

    return groups
  }, [movements])

  return (
    <div>
      {Array.from(groupedMovements.entries()).map(
        ([productId, { movements: productMovements }]) => (
          <div key={productId} className="border-b border-outline-variant">
            <div className="bg-surface-bright px-4 py-2">
              <span className="text-body-sm font-medium text-on-surface">
                {productNames?.get(productId) ?? productId} (
                {productMovements.length} movements)
              </span>
            </div>
            <table className="w-full text-body-sm">
              <thead>
                <tr className="border-b border-outline-variant">
                  <th className="px-3 py-2 text-start text-on-surface-variant font-label-caps">
                    {t('entity.stockMovement.movementType')}
                  </th>
                  <th className="px-3 py-2 text-end text-on-surface-variant font-label-caps">
                    {t('entity.stockMovement.quantity')}
                  </th>
                  <th className="px-3 py-2 text-start text-on-surface-variant font-label-caps">
                    {t('entity.stockMovement.fromWarehouse')}
                  </th>
                  <th className="px-3 py-2 text-start text-on-surface-variant font-label-caps">
                    {t('entity.stockMovement.toWarehouse')}
                  </th>
                  <th className="px-3 py-2 text-start text-on-surface-variant font-label-caps">
                    {t('entity.stock.date')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {productMovements.map((movement, idx) => (
                  <tr
                    key={`${movement.id}-${idx}`}
                    className="border-t border-outline-variant/30"
                  >
                    <td className="px-3 py-2 pl-8 text-on-surface">
                      {movement.movement_type}
                    </td>
                    <td className="px-3 py-2 text-end text-on-surface font-data-tabular tabular-nums">
                      {movement.quantity.toLocaleString(locale)}
                    </td>
                    <td className="px-3 py-2 text-on-surface">
                      {movement.from_warehouse_id
                        ? (warehouseNames?.get(movement.from_warehouse_id) ??
                          movement.from_warehouse_id)
                        : '-'}
                    </td>
                    <td className="px-3 py-2 text-on-surface">
                      {movement.to_warehouse_id
                        ? (warehouseNames?.get(movement.to_warehouse_id) ??
                          movement.to_warehouse_id)
                        : '-'}
                    </td>
                    <td className="px-3 py-2 text-on-surface">
                      {new Date(movement.created_at).toLocaleDateString(locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  )
}
