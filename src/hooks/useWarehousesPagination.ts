import { useQuery } from '@tanstack/react-query'
import { commands } from '@/lib/tauri-bindings'

export function useWarehousesPagination(page: number, pageSize: number) {
  return useQuery({
    queryKey: ['warehouses', 'paginated', { page, pageSize }],
    queryFn: async () => {
      const result = await commands.warehousesGetPaginated(page, pageSize)
      if (result.status === 'ok') {
        return result.data
      }
      throw new Error(result.error)
    },
    placeholderData: prev => prev,
  })
}
