import { useQuery } from '@tanstack/react-query'
import { commands } from '@/lib/tauri-bindings'

export function useProductsPagination(page: number, pageSize: number) {
  return useQuery({
    queryKey: ['products', 'paginated', { page, pageSize }],
    queryFn: async () => {
      const result = await commands.productsGetPaginated(page, pageSize)
      if (result.status === 'ok') {
        return result.data
      }
      throw new Error(result.error)
    },
    placeholderData: prev => prev,
  })
}
