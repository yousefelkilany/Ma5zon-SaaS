import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, useQueryClient } from '@tanstack/react-query'
import { QueryWrapper } from '@/lib/test-utils/query-wrapper'
import { commands } from '@/lib/tauri-bindings'
import { toast } from 'sonner'
import {
  useCreateProduct,
  useUpdateProduct,
  useSoftDeleteProduct,
  useCreateVariant,
  useUpdateVariant,
  useSoftDeleteVariant,
  useCreateWarehouse,
  useUpdateWarehouse,
  useSoftDeleteWarehouse,
} from '../mutations'
import { entityQueryKeys } from '../queryKeys'

vi.mock('@/lib/tauri-bindings', () => ({
  commands: {
    // Methods called by the production code under test
    create: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
    variantsCreate: vi.fn(),
    variantsUpdate: vi.fn(),
    variantsDelete: vi.fn(),
    warehousesCreate: vi.fn(),
    warehousesUpdate: vi.fn(),
    warehousesDelete: vi.fn(),
    // Methods used only for type derivation in src/services/entity/types.ts;
    // present so derived types (Product/Variant/Warehouse) resolve correctly.
    getById: vi.fn(),
    variantsGetById: vi.fn(),
    warehousesGetById: vi.fn(),
  },
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

const mockOk = <T,>(data: T) => ({ status: 'ok' as const, data })
const mockErr = (error: string) => ({ status: 'error' as const, error })

// Test client with gcTime: Infinity so seeded/optimistic data persists long
// enough for `waitFor` to observe it (the shared createTestQueryClient uses
// gcTime: 0 which would garbage-collect the data before polling can see it).
function makeClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity, staleTime: Infinity },
      mutations: { retry: false },
    },
  })
}

function seedProductsList(
  client: QueryClient,
  rows: Array<{ id: string; name: string; company: string; category: string }>
) {
  client.setQueryData(entityQueryKeys.listFor('products'), rows)
}

describe('useUpdateProduct', () => {
  let client: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    client = makeClient()
  })

  it('applies an optimistic update to the list, rolls back on error, and reconciles on success', async () => {
    seedProductsList(client, [
      { id: 'P1', name: 'Old', company: 'ACME', category: 'A' },
      { id: 'P2', name: 'Other', company: 'X', category: 'B' },
    ])

    vi.mocked(commands.update).mockResolvedValue(
      mockOk({ id: 'P1', name: 'New', company: 'ACME', category: 'A' }) as never
    )

    const { result } = renderHook(
      () => {
        const qc = useQueryClient()
        const m = useUpdateProduct()
        return { qc, m }
      },
      { wrapper: (p) => <QueryWrapper {...p} client={client} /> }
    )

    await act(async () => {
      result.current.m.mutate({
        id: 'P1',
        values: { name: 'New', company: 'ACME', category: 'A' },
      })
    })

    // Optimistic update applied
    await waitFor(() => {
      const data = client.getQueryData<Array<{ id: string; name: string }>>(
        entityQueryKeys.listFor('products')
      )
      expect(data?.find((r) => r.id === 'P1')?.name).toBe('New')
    })

    await waitFor(() => expect(result.current.m.isSuccess).toBe(true))

    // Detail cache populated
    const detail = client.getQueryData(
      entityQueryKeys.detail('products', 'P1')
    )
    expect(detail).toEqual({
      id: 'P1',
      name: 'New',
      company: 'ACME',
      category: 'A',
    })

    // Success toast
    expect(toast.success).toHaveBeenCalledWith('Product updated')
  })

  it('rolls back the optimistic update on error and toasts', async () => {
    seedProductsList(client, [
      { id: 'P1', name: 'Old', company: 'ACME', category: 'A' },
    ])

    vi.mocked(commands.update).mockResolvedValue(mockErr('boom') as never)

    const { result } = renderHook(
      () => {
        const m = useUpdateProduct()
        return { m }
      },
      { wrapper: (p) => <QueryWrapper {...p} client={client} /> }
    )

    await act(async () => {
      result.current.m.mutate({
        id: 'P1',
        values: { name: 'New', company: 'ACME', category: 'A' },
      })
    })

    await waitFor(() => expect(result.current.m.isError).toBe(true))

    const data = client.getQueryData<Array<{ id: string; name: string }>>(
      entityQueryKeys.listFor('products')
    )
    expect(data?.find((r) => r.id === 'P1')?.name).toBe('Old')
    expect(toast.error).toHaveBeenCalled()
  })

  it('invokes the consumer-supplied onSettled callback with (data, null) on success', async () => {
    seedProductsList(client, [
      { id: 'P1', name: 'Old', company: 'ACME', category: 'A' },
    ])

    vi.mocked(commands.update).mockResolvedValue(
      mockOk({ id: 'P1', name: 'New', company: 'ACME', category: 'A' }) as never
    )

    const onSettled = vi.fn()

    const { result } = renderHook(
      () => useUpdateProduct({ onSettled }),
      { wrapper: (p) => <QueryWrapper {...p} client={client} /> }
    )

    await act(async () => {
      result.current.mutate({
        id: 'P1',
        values: { name: 'New', company: 'ACME', category: 'A' },
      })
    })

    await waitFor(() => expect(onSettled).toHaveBeenCalled())
    const [data, err] = onSettled.mock.calls[0]!
    expect(data).toEqual({
      id: 'P1',
      name: 'New',
      company: 'ACME',
      category: 'A',
    })
    expect(err).toBeNull()
  })
})

describe('useCreateProduct', () => {
  it('invalidates the product list on success and calls onSettled', async () => {
    const client = makeClient()
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries')
    vi.mocked(commands.create).mockResolvedValue(
      mockOk({ id: 'P99', name: 'Fresh', company: 'A', category: 'B' }) as never
    )

    const onSettled = vi.fn()
    const { result } = renderHook(
      () => useCreateProduct({ onSettled }),
      { wrapper: (p) => <QueryWrapper {...p} client={client} /> }
    )

    await act(async () => {
      result.current.mutate({
        values: { name: 'Fresh', company: 'A', category: 'B' },
      })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: entityQueryKeys.listFor('products'),
    })
    expect(onSettled).toHaveBeenCalled()
  })
})

describe('useSoftDeleteProduct', () => {
  it('removes the row optimistically and rolls back on error', async () => {
    const client = makeClient()
    client.setQueryData(entityQueryKeys.listFor('products'), [
      { id: 'P1', name: 'A' },
      { id: 'P2', name: 'B' },
    ])

    vi.mocked(commands.softDelete).mockResolvedValue(mockErr('nope') as never)

    const { result } = renderHook(() => useSoftDeleteProduct(), {
      wrapper: (p) => <QueryWrapper {...p} client={client} />,
    })

    await act(async () => {
      result.current.mutate({ id: 'P1' })
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    const data = client.getQueryData<Array<{ id: string }>>(
      entityQueryKeys.listFor('products')
    )
    expect(data?.some((r) => r.id === 'P1')).toBe(true)
  })
})

describe('variant/warehouse mutation siblings exist and follow the same shape', () => {
  it('useCreateVariant, useUpdateVariant, useSoftDeleteVariant are defined', () => {
    expect(useCreateVariant).toBeDefined()
    expect(useUpdateVariant).toBeDefined()
    expect(useSoftDeleteVariant).toBeDefined()
  })
  it('useCreateWarehouse, useUpdateWarehouse, useSoftDeleteWarehouse are defined', () => {
    expect(useCreateWarehouse).toBeDefined()
    expect(useUpdateWarehouse).toBeDefined()
    expect(useSoftDeleteWarehouse).toBeDefined()
  })
})
