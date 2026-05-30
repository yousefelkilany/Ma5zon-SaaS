import { QueryClient } from '@tanstack/react-query'

export interface EntityWorkspaceProps {
  entityType: string
}

export interface ColumnDef {
  id: string
  label: string
  type: 'text' | 'currency' | 'number' | 'date' | 'status' | 'actions'
  typeLabel: string,
  width: number
  sortable: boolean
  filterable: boolean
  visible: boolean
  order: number
  isNameColumn?: boolean
}

export interface EntityRow {
  id: string
  [key: string]: unknown
}

export interface PaginationState {
  page: number
  pageSize: number
  totalRows: number
  totalPages: number
}

export interface SortState {
  columnId: string
  direction: 'asc' | 'desc'
}

export interface FilterState {
  columnId: string
  operator: 'eq' | 'neq' | 'contains' | 'gt' | 'lt' | 'gte' | 'lte' | 'between'
  value: string | number | [number, number]
}

export interface DataTableProps {
  entityType: string
  queryClient: QueryClient
  columns: ColumnDef[]
  data: EntityRow[]
  sort: SortState | null
  isLoading: boolean
  selectedIds: Set<string>
  onSort: (sort: SortState | null) => void
  onRowSelect: (ids: Set<string>) => void
  onRowClick: (id: string, row: EntityRow) => void
}

export interface PaginationFooterProps {
  pagination: PaginationState
  onPageChange: (page: number, pageSize: number) => void
  isLoading: boolean
}

export interface ToolbarProps {
  searchValue: string
  onSearchChange: (value: string) => void
  onFiltersClick: () => void
  onColumnsClick: () => void
  hasSelection: boolean
  selectedCount: number
  onBulkAction: (action: string) => void
  onExport: () => void
  activeFilterCount?: number
}

export interface ProductRow {
  id: string
  name: string
  [key: string]: unknown
}

export interface VariantRow {
  id: string
  product_id: string
  sku: string
  variant_name: string
  uom_id: number
  [key: string]: unknown
}

export interface VariantPriceRow {
  variant_id: string
  price_list_id: number
  price: number
}

export interface TableLayout {
  table_name: string
  columns: ColumnDef[]
}

export interface ExpandedRowState {
  expandedIds: Set<string>
  variantsCache: Map<string, VariantRow[]>
}