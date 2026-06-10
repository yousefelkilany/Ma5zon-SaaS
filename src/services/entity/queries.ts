import { useQuery, useQueryClient } from '@tanstack/react-query'
import { commands } from '@/lib/tauri-bindings'
import type { StockMovement } from '@/lib/bindings'
import { entityQueryKeys, type MovementScope } from './queryKeys'
import {
  type BulkResult,
  type EntityType,
  productEntity,
  type RustCommandResponse,
  userEntity,
  variantEntity,
  warehouseEntity,
} from '@/lib/utils'

async function unwrap<T>(result: RustCommandResponse<T>): Promise<T> {
  if (result.status === 'error') throw new Error(result.error)
  return result.data
}

async function bulkFetch(
  entity: EntityType,
  ids: string[]
): Promise<BulkResult> {
  switch (entity) {
    case productEntity:
      return (await commands.productsGetByIds(ids)) as BulkResult
    case variantEntity:
      return (await commands.variantsGetByIds(ids)) as BulkResult
    case warehouseEntity:
      return (await commands.warehousesGetByIds(ids)) as BulkResult
    case userEntity:
      return (await commands.usersGetByIds(ids.filter(Boolean))) as BulkResult
  }
}

export function useGetProduct(id: string | undefined) {
  return useQuery({
    queryKey: id
      ? entityQueryKeys.detail('product', id)
      : ['entity', productEntity, 'detail', '__none__'],
    queryFn: async () => {
      const idOrThrow = id
      if (!idOrThrow) throw new Error('id required')
      return unwrap(await commands.getById(idOrThrow))
    },
    enabled: !!id,
  })
}

export function useGetVariant(id: string | undefined) {
  return useQuery({
    queryKey: id
      ? entityQueryKeys.detail('variant', id)
      : ['entity', 'variants', 'detail', '__none__'],
    queryFn: async () => {
      const idOrThrow = id
      if (!idOrThrow) throw new Error('id required')
      return unwrap(await commands.variantsGetById(idOrThrow))
    },
    enabled: !!id,
  })
}

export function useGetWarehouse(id: string | undefined) {
  return useQuery({
    queryKey: id
      ? entityQueryKeys.detail('warehouse', id)
      : ['entity', 'warehouses', 'detail', '__none__'],
    queryFn: async () => {
      const idOrThrow = id
      if (!idOrThrow) throw new Error('id required')
      return unwrap(await commands.warehousesGetById(idOrThrow))
    },
    enabled: !!id,
  })
}

export function useStockLevelsForProduct(id: string | undefined) {
  return useQuery({
    queryKey: id
      ? entityQueryKeys.stockLevels(productEntity, id)
      : ['stock-levels', productEntity, '__none__'],
    queryFn: async () => {
      const idOrThrow = id
      if (!idOrThrow) throw new Error('id required')
      return unwrap(await commands.stockLevelsGetByProduct(idOrThrow))
    },
    enabled: !!id,
  })
}

export function useStockLevelsForVariant(id: string | undefined) {
  return useQuery({
    queryKey: id
      ? entityQueryKeys.stockLevels(variantEntity, id)
      : ['stock-levels', variantEntity, '__none__'],
    queryFn: async () => {
      const idOrThrow = id
      if (!idOrThrow) throw new Error('id required')
      return unwrap(await commands.stockLevelsGetByVariant(idOrThrow))
    },
    enabled: !!id,
  })
}

export function useStockMovements(
  scope: MovementScope,
  id: string | undefined
) {
  return useQuery({
    queryKey: id
      ? entityQueryKeys.stockMovements(scope, id)
      : ['stock-movements-' + scope, '__none__'],
    queryFn: async (): Promise<StockMovement[]> => {
      const idOrThrow = id
      if (!idOrThrow) throw new Error('id required')
      if (scope === 'product') {
        const variants = await unwrap(
          await commands.variantsGetByProductWithStock(idOrThrow)
        )
        const all: StockMovement[] = []
        for (const v of variants) {
          const movs = await unwrap(
            await commands.stockMovementsGetByVariant(v.id)
          )
          const sorted = [...movs].sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
          )
          all.push(...sorted.slice(0, 5))
        }
        return all.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
      }
      if (scope === 'variant') {
        return await unwrap(
          await commands.stockMovementsGetByVariant(idOrThrow)
        )
      }
      return await unwrap(
        await commands.stockMovementsGetByWarehouse(idOrThrow)
      )
    },
    enabled: !!id,
  })
}

export function useWarehouses() {
  return useQuery({
    queryKey: entityQueryKeys.warehouses(),
    queryFn: async () => {
      const result = await commands.warehousesGetAll([], [], null)
      if (result.status === 'ok') return result.data
      return []
    },
  })
}

export function useBulkEntity(entity: EntityType, ids: string[]) {
  const queryClient = useQueryClient()
  return useQuery({
    queryKey: ['entity', entity, 'bulk', [...ids].sort()],
    queryFn: async () => {
      const result = await bulkFetch(entity, ids)
      const data = await unwrap(result)
      data.forEach(e =>
        queryClient.setQueryData(entityQueryKeys.detail(entity, e.id), e)
      )
      return data
    },
    enabled: ids.length > 0,
  })
}
