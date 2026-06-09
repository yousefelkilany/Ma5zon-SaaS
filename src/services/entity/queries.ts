import { useQuery } from '@tanstack/react-query'
import { commands } from '@/lib/tauri-bindings'
import type { StockMovement } from '@/lib/bindings'
import {
  entityQueryKeys,
  type MovementScope,
  type StockScope,
} from './queryKeys'

async function unwrap<T>(
  result: { status: 'ok'; data: T } | { status: 'error'; error: string }
): Promise<T> {
  if (result.status === 'error') throw new Error(result.error)
  return result.data
}

export function useGetProduct(id: string | undefined) {
  return useQuery({
    queryKey: id
      ? entityQueryKeys.detail('products', id)
      : ['entity', 'products', 'detail', '__none__'],
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
      ? entityQueryKeys.detail('variants', id)
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
      ? entityQueryKeys.detail('warehouses', id)
      : ['entity', 'warehouses', 'detail', '__none__'],
    queryFn: async () => {
      const idOrThrow = id
      if (!idOrThrow) throw new Error('id required')
      return unwrap(await commands.warehousesGetById(idOrThrow))
    },
    enabled: !!id,
  })
}

export function useStockLevelsForProduct(
  id: string | undefined,
  scope: StockScope = 'product'
) {
  return useQuery({
    queryKey: id
      ? entityQueryKeys.stockLevels(scope, id)
      : ['stock-levels-' + scope, '__none__'],
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
      ? entityQueryKeys.stockLevels('variant', id)
      : ['stock-levels-variant', '__none__'],
    queryFn: async () => {
      const idOrThrow = id
      if (!idOrThrow) throw new Error('id required')
      return unwrap(await commands.stockLevelsGetByVariant(idOrThrow))
    },
    enabled: !!id,
  })
}

export function useStockMovements(scope: MovementScope, id: string | undefined) {
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
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime()
        )
      }
      if (scope === 'variant') {
        return await unwrap(await commands.stockMovementsGetByVariant(idOrThrow))
      }
      return await unwrap(await commands.stockMovementsGetByWarehouse(idOrThrow))
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
