import { useQuery } from '@tanstack/react-query'
import { commands } from '@/lib/tauri-bindings'

export function useProductsByWarehouse(
  warehouseId: number,
  page: number,
  pageSize: number,
  enabled = true
) {
  return useQuery({
    queryKey: ['products', 'warehouse', warehouseId, { page, pageSize }],
    queryFn: async () => {
      const result = await commands.productsGetByWarehousePaginated(
        warehouseId,
        page,
        pageSize
      )
      if (result.status === 'ok') {
        return result.data
      }
      throw new Error(result.error)
    },
    enabled,
    placeholderData: prev => prev,
  })
}
