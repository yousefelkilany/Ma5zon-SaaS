import { useQuery, useQueryClient } from '@tanstack/react-query'
import { commands } from '@/lib/tauri-bindings'
import type { StockMovement } from '@/lib/bindings'
import { entityQueryKeys, type MovementScope } from './queryKeys'
import { productEntity, variantEntity } from '@/lib/utils'

async function unwrap<T>(
  result: { status: 'ok'; data: T } | { status: 'error'; error: string }
): Promise<T> {
  if (result.status === 'error') throw new Error(result.error)
  return result.data
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

export function useBulkProducts(ids: string[]) {
  const queryClient = useQueryClient()
  return useQuery({
    queryKey: ['entity', 'products', 'bulk', [...ids].sort()],
    queryFn: async () => {
      const result = await commands.productsGetByIds(ids)
      const data = await unwrap(result)
      data.forEach((p) => {
        queryClient.setQueryData(entityQueryKeys.detail('product', p.id), p)
      })
      return data
    },
    enabled: ids.length > 0,
  })
}

export function useBulkVariants(ids: string[]) {
  const queryClient = useQueryClient()
  return useQuery({
    queryKey: ['entity', 'variants', 'bulk', [...ids].sort()],
    queryFn: async () => {
      const result = await commands.variantsGetByIds(ids)
      const data = await unwrap(result)
      data.forEach((v) => {
        queryClient.setQueryData(entityQueryKeys.detail('variant', v.id), v)
      })
      return data
    },
    enabled: ids.length > 0,
  })
}

export function useBulkWarehouses(ids: string[]) {
  const queryClient = useQueryClient()
  return useQuery({
    queryKey: ['entity', 'warehouses', 'bulk', [...ids].sort()],
    queryFn: async () => {
      const result = await commands.warehousesGetByIds(ids)
      const data = await unwrap(result)
      data.forEach((w) => {
        queryClient.setQueryData(entityQueryKeys.detail('warehouse', w.id), w)
      })
      return data
    },
    enabled: ids.length > 0,
  })
}

export function useBulkUsers(ids: string[]) {
  const queryClient = useQueryClient()
  return useQuery({
    queryKey: ['entity', 'users', 'bulk', [...ids].sort()],
    queryFn: async () => {
      const result = await commands.usersGetByIds(
        ids.filter((id) => id.length > 0)
      )
      const data = await unwrap(result)
      data.forEach((u) => {
        queryClient.setQueryData(entityQueryKeys.detail('user', u.id), u)
      })
      return data
    },
    enabled: ids.length > 0,
  })
}
