import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryWrapper } from '@/lib/test-utils/query-wrapper'
import { commands } from '@/lib/tauri-bindings'
import {
  useGetProduct,
  useGetVariant,
  useGetWarehouse,
  useBulkProducts,
  useBulkVariants,
  useBulkWarehouses,
  useBulkUsers,
  useStockLevelsForProduct,
  useStockLevelsForVariant,
  useStockMovements,
  useWarehouses,
} from '../queries'

vi.mock('@/lib/tauri-bindings', () => ({
  commands: {
    getById: vi.fn(),
    variantsGetById: vi.fn(),
    warehousesGetById: vi.fn(),
    stockLevelsGetByProduct: vi.fn(),
    stockLevelsGetByVariant: vi.fn(),
    stockMovementsGetByVariant: vi.fn(),
    stockMovementsGetByProduct: vi.fn(),
    stockMovementsGetByWarehouse: vi.fn(),
    variantsGetByProductWithStock: vi.fn(),
    warehousesGetAll: vi.fn(),
    productsGetByIds: vi.fn(),
    variantsGetByIds: vi.fn(),
    warehousesGetByIds: vi.fn(),
    usersGetByIds: vi.fn(),
  },
}))

const mockOk = <T>(data: T) => ({ status: 'ok' as const, data })
const mockErr = (error: string) => ({ status: 'error' as const, error })

describe('entity read hooks', () => {
  it('useGetProduct is disabled when id is undefined', () => {
    const { result } = renderHook(() => useGetProduct(undefined), {
      wrapper: QueryWrapper,
    })
    expect(result.current.fetchStatus).toBe('idle')
  })

  it('useGetProduct returns data on success', async () => {
    vi.mocked(commands.getById).mockResolvedValue(
      mockOk({
        id: 'P1',
        company: 'ACME',
        name: 'Widget',
        category: 'A',
      }) as never
    )
    const { result } = renderHook(() => useGetProduct('P1'), {
      wrapper: QueryWrapper,
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({
      id: 'P1',
      company: 'ACME',
      name: 'Widget',
      category: 'A',
    })
  })

  it('useGetProduct throws on error result', async () => {
    vi.mocked(commands.getById).mockResolvedValue(mockErr('not found') as never)
    const { result } = renderHook(() => useGetProduct('P1'), {
      wrapper: QueryWrapper,
    })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect((result.current.error as Error).message).toBe('not found')
  })

  it('useGetVariant calls variantsGetById and returns data', async () => {
    vi.mocked(commands.variantsGetById).mockResolvedValue(
      mockOk({ id: 'V1', name: 'Red Widget' }) as never
    )
    const { result } = renderHook(() => useGetVariant('V1'), {
      wrapper: QueryWrapper,
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(commands.variantsGetById).toHaveBeenCalledWith('V1')
    expect(result.current.data).toEqual({ id: 'V1', name: 'Red Widget' })
  })

  it('useGetWarehouse calls warehousesGetById', async () => {
    vi.mocked(commands.warehousesGetById).mockResolvedValue(
      mockOk({ id: 'W1', name: 'Main' }) as never
    )
    const { result } = renderHook(() => useGetWarehouse('W1'), {
      wrapper: QueryWrapper,
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(commands.warehousesGetById).toHaveBeenCalledWith('W1')
  })

  it('useStockLevelsForProduct is disabled when id is undefined', () => {
    const { result } = renderHook(() => useStockLevelsForProduct(undefined), {
      wrapper: QueryWrapper,
    })
    expect(result.current.fetchStatus).toBe('idle')
  })

  it('useStockLevelsForProduct returns data on success', async () => {
    vi.mocked(commands.stockLevelsGetByProduct).mockResolvedValue(
      mockOk([{ id: 'SL1' }]) as never
    )
    const { result } = renderHook(() => useStockLevelsForProduct('P1'), {
      wrapper: QueryWrapper,
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([{ id: 'SL1' }])
  })

  it('useStockLevelsForVariant calls stockLevelsGetByVariant', async () => {
    vi.mocked(commands.stockLevelsGetByVariant).mockResolvedValue(
      mockOk([]) as never
    )
    const { result } = renderHook(() => useStockLevelsForVariant('V1'), {
      wrapper: QueryWrapper,
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(commands.stockLevelsGetByVariant).toHaveBeenCalledWith('V1')
  })

  it('useStockMovements for product fetches variants and aggregates their movements', async () => {
    const movementsByVariant: Record<
      string,
      { id: string; variant_id: string; created_at: string }[]
    > = {
      V1: [{ id: 'M1', variant_id: 'V1', created_at: '2025-01-01' }],
      V2: [{ id: 'M2', variant_id: 'V2', created_at: '2025-01-02' }],
    }
    vi.mocked(commands.variantsGetByProductWithStock).mockResolvedValue(
      mockOk([{ id: 'V1' }, { id: 'V2' }]) as never
    )
    vi.mocked(commands.stockMovementsGetByVariant).mockImplementation(
      async (variantId: string) =>
        mockOk(movementsByVariant[variantId] ?? []) as never
    )
    const { result } = renderHook(() => useStockMovements('product', 'P1'), {
      wrapper: QueryWrapper,
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(2)
  })

  it('useStockMovements for warehouse calls stockMovementsGetByWarehouse', async () => {
    vi.mocked(commands.stockMovementsGetByWarehouse).mockResolvedValue(
      mockOk([{ id: 'M1' }]) as never
    )
    const { result } = renderHook(() => useStockMovements('warehouse', 'W1'), {
      wrapper: QueryWrapper,
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(commands.stockMovementsGetByWarehouse).toHaveBeenCalledWith('W1')
    expect(result.current.data).toEqual([{ id: 'M1' }])
  })

  it('useWarehouses returns data on success', async () => {
    vi.mocked(commands.warehousesGetAll).mockResolvedValue(
      mockOk([{ id: 'W1', name: 'Main' }]) as never
    )
    const { result } = renderHook(() => useWarehouses(), {
      wrapper: QueryWrapper,
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([{ id: 'W1', name: 'Main' }])
  })

  it('useWarehouses swallows errors and returns []', async () => {
    vi.mocked(commands.warehousesGetAll).mockResolvedValue(
      mockErr('fail') as never
    )
    const { result } = renderHook(() => useWarehouses(), {
      wrapper: QueryWrapper,
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([])
  })
})

describe('bulk fetch hooks', () => {
  it('useBulkProducts is disabled on empty ids and prefills on success', async () => {
    const { result: empty } = renderHook(() => useBulkProducts([]), {
      wrapper: QueryWrapper,
    })
    expect(empty.current.fetchStatus).toBe('idle')

    vi.mocked(commands.productsGetByIds).mockResolvedValue(
      mockOk([
        { id: '1', company: 'ACME', name: 'Widget', category: 'A' },
        { id: '2', company: 'ACME', name: 'Gizmo', category: 'B' },
      ]) as never
    )

    const { result } = renderHook(() => useBulkProducts(['1', '2']), {
      wrapper: QueryWrapper,
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(commands.productsGetByIds).toHaveBeenCalledWith(['1', '2'])
    expect(result.current.data).toHaveLength(2)
  })

  it('useBulkVariants passes ids through as strings', async () => {
    vi.mocked(commands.variantsGetByIds).mockResolvedValue(
      mockOk([{ id: '10', product_id: '1', sku: 'SKU-10', variant_name: 'Red' }]) as never
    )

    const { result } = renderHook(() => useBulkVariants(['10']), {
      wrapper: QueryWrapper,
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(commands.variantsGetByIds).toHaveBeenCalledWith(['10'])
    expect(result.current.data?.[0].variant_name).toBe('Red')
  })

  it('useBulkWarehouses passes ids through as strings', async () => {
    vi.mocked(commands.warehousesGetByIds).mockResolvedValue(
      mockOk([{ id: '20', name: 'Main', location: 'HQ' }]) as never
    )

    const { result } = renderHook(() => useBulkWarehouses(['20']), {
      wrapper: QueryWrapper,
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(commands.warehousesGetByIds).toHaveBeenCalledWith(['20'])
    expect(result.current.data?.[0].name).toBe('Main')
  })

  it('useBulkUsers passes ids as strings and filters empties', async () => {
    vi.mocked(commands.usersGetByIds).mockResolvedValue(
      mockOk([{ id: 'u-1', name: 'admin', email: 'a@b', role: 'admin' }]) as never
    )

    const { result } = renderHook(() => useBulkUsers(['u-1', '']), {
      wrapper: QueryWrapper,
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(commands.usersGetByIds).toHaveBeenCalledWith(['u-1'])
  })
})
