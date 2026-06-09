import { useQuery } from '@tanstack/react-query'
import { commands } from '@/lib/tauri-bindings'
import type { FilterState, SortState } from '@/lib/types/entity'
import type {
  FilterState as BindingFilterState,
  SortState as BindingSortState,
} from '@/lib/bindings'
import { productEntity } from '@/lib/utils'

export function useProductsPagination(
  filters: FilterState[],
  _columns: string[],
  sort: SortState | null,
  page: number,
  pageSize: number
) {
  return useQuery({
    queryKey: [productEntity, 'paginated', { filters, sort, page, pageSize }],
    queryFn: async () => {
      const bindingFilters: BindingFilterState[] = filters.map(f => ({
        column_id: f.columnId,
        operator: f.operator,
        value: f.value,
      }))
      const bindingSort: BindingSortState | null = sort
        ? { column_id: sort.columnId, direction: sort.direction }
        : null
      const result = await commands.getProductsWithStockPaginated(
        bindingFilters,
        _columns,
        bindingSort,
        page,
        pageSize
      )
      if (result.status === 'ok') {
        return result.data
      }
      throw new Error(result.error)
    },
    placeholderData: prev => prev,
  })
}
