// Cache updates use simple spread/filter for top-level entity fields. We
// iterate over `getQueriesData` results and call `setQueryData` per key to
// avoid `setQueriesData`'s prefix-match behavior clobbering non-list caches
// (e.g., the detail cache under the same `['entity', 'products']` prefix).

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { commands } from '@/lib/tauri-bindings'
import { entityQueryKeys, type EntityType } from './queryKeys'
import type {
  Product,
  ProductUpdateValues,
  Variant,
  VariantUpdateValues,
  Warehouse,
  WarehouseUpdateValues,
} from './types'

interface SettledOptions<T> {
  onSettled?: (data: T | null, error: Error | null) => void
}

async function unwrapOk<T>(
  result: Promise<
    | { status: 'ok'; data: T }
    | { status: 'error'; error: string }
  >
): Promise<T> {
  const r = await result
  if (r.status === 'error') throw new Error(r.error)
  return r.data
}

function listFor(entityType: EntityType) {
  return entityQueryKeys.listFor(entityType)
}

function detailFor(entityType: EntityType, id: string) {
  return entityQueryKeys.detail(entityType, id)
}

// ---------- Products ----------

export function useUpdateProduct(options?: SettledOptions<Product>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: string; values: ProductUpdateValues }) =>
      unwrapOk(
        commands.update(input.id, input.values.company, input.values.name, input.values.category)
      ),
    onMutate: async ({ id, values }) => {
      await queryClient.cancelQueries({ queryKey: listFor('products') })
      const previousLists = queryClient.getQueriesData({
        queryKey: listFor('products'),
      })
      for (const [key, data] of previousLists) {
        if (Array.isArray(data)) {
          const arr = data as (Product & Record<string, unknown>)[]
          queryClient.setQueryData(
            key,
            arr.map((r) => (r.id === id ? { ...r, ...values } : r))
          )
        }
      }
      return { previousLists }
    },
    onError: (err, _vars, context) => {
      if (context?.previousLists) {
        for (const [key, data] of context.previousLists) {
          queryClient.setQueryData(key, data)
        }
      }
      toast.error(err instanceof Error ? err.message : 'Update failed')
    },
    onSuccess: (data) => {
      queryClient.setQueryData(detailFor('products', data.id), data)
      queryClient.invalidateQueries({ queryKey: listFor('products') })
      queryClient.invalidateQueries({
        queryKey: entityQueryKeys.stockLevels('product', data.id),
      })
      toast.success('Product updated')
    },
    onSettled: (data, error) => {
      options?.onSettled?.((data as Product) ?? null, error as Error | null)
    },
  })
}

export function useCreateProduct(options?: SettledOptions<Product>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { values: ProductUpdateValues }) =>
      unwrapOk(commands.create(input.values.company, input.values.name, input.values.category)),
    onSuccess: (data) => {
      queryClient.setQueryData(detailFor('products', data.id), data)
      queryClient.invalidateQueries({ queryKey: listFor('products') })
      toast.success('Product created')
    },
    onSettled: (data, error) => {
      options?.onSettled?.((data as Product) ?? null, error as Error | null)
    },
  })
}

export function useSoftDeleteProduct(options?: SettledOptions<{ id: string }>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: string }) => unwrapOk(commands.softDelete(input.id)),
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: listFor('products') })
      const previousLists = queryClient.getQueriesData<Product[]>({
        queryKey: listFor('products'),
      })
      for (const [key, data] of previousLists) {
        if (Array.isArray(data)) {
          queryClient.setQueryData<Product[]>(
            key,
            data.filter((r) => r.id !== id)
          )
        }
      }
      return { previousLists }
    },
    onError: (err, _vars, context) => {
      if (context?.previousLists) {
        for (const [key, data] of context.previousLists) {
          queryClient.setQueryData(key, data)
        }
      }
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: listFor('products') })
      queryClient.removeQueries({ queryKey: detailFor('products', id) })
      toast.success('Product deleted')
    },
    onSettled: (data, error) => {
      options?.onSettled?.((data as { id: string } | null) ?? null, error as Error | null)
    },
  })
}

// ---------- Variants ----------

export function useUpdateVariant(options?: SettledOptions<Variant>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: string; values: VariantUpdateValues }) =>
      unwrapOk(commands.variantsUpdate(input.id, input.values as never)),
    onMutate: async ({ id, values }) => {
      await queryClient.cancelQueries({ queryKey: listFor('variants') })
      const previousLists = queryClient.getQueriesData({
        queryKey: listFor('variants'),
      })
      for (const [key, data] of previousLists) {
        if (Array.isArray(data)) {
          const arr = data as Variant[]
          queryClient.setQueryData<Variant[]>(
            key,
            arr.map((r) => (r.id === id ? { ...r, ...values } : r))
          )
        }
      }
      return { previousLists }
    },
    onError: (err, _vars, context) => {
      if (context?.previousLists) {
        for (const [key, data] of context.previousLists) {
          queryClient.setQueryData(key, data)
        }
      }
      toast.error(err instanceof Error ? err.message : 'Update failed')
    },
    onSuccess: (data) => {
      queryClient.setQueryData(detailFor('variants', data.id), data)
      queryClient.invalidateQueries({ queryKey: listFor('variants') })
      toast.success('Variant updated')
    },
    onSettled: (data, error) => {
      options?.onSettled?.((data as Variant) ?? null, error as Error | null)
    },
  })
}

export function useCreateVariant(options?: SettledOptions<Variant>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { values: VariantUpdateValues; productId: string }) =>
      unwrapOk(commands.variantsCreate({ ...input.values, product_id: input.productId } as never)),
    onSuccess: (data) => {
      queryClient.setQueryData(detailFor('variants', data.id), data)
      queryClient.invalidateQueries({ queryKey: listFor('variants') })
      toast.success('Variant created')
    },
    onSettled: (data, error) => {
      options?.onSettled?.((data as Variant) ?? null, error as Error | null)
    },
  })
}

export function useSoftDeleteVariant(options?: SettledOptions<{ id: string }>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: string }) => unwrapOk(commands.variantsDelete(input.id)),
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: listFor('variants') })
      const previousLists = queryClient.getQueriesData<Variant[]>({
        queryKey: listFor('variants'),
      })
      for (const [key, data] of previousLists) {
        if (Array.isArray(data)) {
          const arr = data as Variant[]
          queryClient.setQueryData<Variant[]>(
            key,
            arr.filter((r) => r.id !== id)
          )
        }
      }
      return { previousLists }
    },
    onError: (err, _vars, context) => {
      if (context?.previousLists) {
        for (const [key, data] of context.previousLists) {
          queryClient.setQueryData(key, data)
        }
      }
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: listFor('variants') })
      queryClient.removeQueries({ queryKey: detailFor('variants', id) })
      toast.success('Variant deleted')
    },
    onSettled: (data, error) => {
      options?.onSettled?.((data as { id: string } | null) ?? null, error as Error | null)
    },
  })
}

// ---------- Warehouses ----------

export function useUpdateWarehouse(options?: SettledOptions<Warehouse>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: string; values: WarehouseUpdateValues }) =>
      unwrapOk(
        commands.warehousesUpdate(
          input.id,
          String(input.values.name ?? ''),
          String(input.values.location ?? '')
        )
      ),
    onMutate: async ({ id, values }) => {
      await queryClient.cancelQueries({ queryKey: listFor('warehouses') })
      const previousLists = queryClient.getQueriesData<Warehouse[]>({
        queryKey: listFor('warehouses'),
      })
      for (const [key, data] of previousLists) {
        if (Array.isArray(data)) {
          queryClient.setQueryData<Warehouse[]>(
            key,
            data.map((r) => (r.id === id ? { ...r, ...values } : r))
          )
        }
      }
      return { previousLists }
    },
    onError: (err, _vars, context) => {
      if (context?.previousLists) {
        for (const [key, data] of context.previousLists) {
          queryClient.setQueryData(key, data)
        }
      }
      toast.error(err instanceof Error ? err.message : 'Update failed')
    },
    onSuccess: (data) => {
      queryClient.setQueryData(detailFor('warehouses', data.id), data)
      queryClient.invalidateQueries({ queryKey: listFor('warehouses') })
      toast.success('Warehouse updated')
    },
    onSettled: (data, error) => {
      options?.onSettled?.((data as Warehouse) ?? null, error as Error | null)
    },
  })
}

export function useCreateWarehouse(options?: SettledOptions<Warehouse>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { values: WarehouseUpdateValues }) =>
      unwrapOk(
        commands.warehousesCreate(
          String(input.values.name ?? ''),
          String(input.values.location ?? '')
        )
      ),
    onSuccess: (data) => {
      queryClient.setQueryData(detailFor('warehouses', data.id), data)
      queryClient.invalidateQueries({ queryKey: listFor('warehouses') })
      toast.success('Warehouse created')
    },
    onSettled: (data, error) => {
      options?.onSettled?.((data as Warehouse) ?? null, error as Error | null)
    },
  })
}

export function useSoftDeleteWarehouse(options?: SettledOptions<{ id: string }>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: string }) => unwrapOk(commands.warehousesDelete(input.id)),
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: listFor('warehouses') })
      const previousLists = queryClient.getQueriesData<Warehouse[]>({
        queryKey: listFor('warehouses'),
      })
      for (const [key, data] of previousLists) {
        if (Array.isArray(data)) {
          queryClient.setQueryData<Warehouse[]>(
            key,
            data.filter((r) => r.id !== id)
          )
        }
      }
      return { previousLists }
    },
    onError: (err, _vars, context) => {
      if (context?.previousLists) {
        for (const [key, data] of context.previousLists) {
          queryClient.setQueryData(key, data)
        }
      }
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: listFor('warehouses') })
      queryClient.removeQueries({ queryKey: detailFor('warehouses', id) })
      toast.success('Warehouse deleted')
    },
    onSettled: (data, error) => {
      options?.onSettled?.((data as { id: string } | null) ?? null, error as Error | null)
    },
  })
}
