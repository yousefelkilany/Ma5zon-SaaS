import type { QueryClient } from '@tanstack/react-query'

export interface EntityWorkspaceProps {
  entityType: string
}

export interface ColumnDef {
  id: string
  label: string
  type: 'text' | 'currency' | 'number' | 'date' | 'status' | 'actions'
  typeLabel: string
  width: number
  sortable: boolean
  filterable: boolean
  visible: boolean
  order: number
  isDataCol: boolean
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

export interface PaginatedResponse<T> {
  data: T[]
  totalCount: number
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

export interface BindingSortState {
  column_id: string
  direction: 'asc' | 'desc'
}

export interface DataTableProps {
  entityType: string
  queryClient: QueryClient
  columns: ColumnDef[]
  data: EntityRow[]
  sort: SortState | null
  isLoading: boolean
  selectedIds: Record<string, boolean>
  onSort: (sort: SortState | null) => void
  onRowSelect: (ids: Set<string>) => void
  onRowClick: (id: string, row: EntityRow) => void
  stockLevelsCache?: Map<string, StockLevelWithVariant[]>
  isLoadingStockLevels?: (id: string) => boolean
}

export interface PaginationFooterProps {
  pagination: PaginationState
  onPageChange: (page: number, pageSize: number) => void
  isLoading: boolean
  pageSizes?: number[]
}

export interface ToolbarProps {
  searchValue: string
  onSearchChange: (value: string) => void
  onFiltersClick: () => void
  onColumnsClick: () => void
  selectedCount: number
  onPrintSelected: () => void
  onExportFormatSelect: (format: 'csv' | 'xlsx') => void
  onDelete: () => void
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
  uom_id: string
  [key: string]: unknown
}

export interface StockLevelWithVariant {
  variant_id: string
  variant_name: string
  sku: string
  warehouse_id: string
  quantity: number
}

export interface ProductWithStock {
  id: string
  company: string
  name: string
  quantity: number
}

export interface VariantWithStock {
  variant_id: string
  variant_name: string
  sku: string
  quantity: number
}

export interface WarehousesSubTableProps {
  stockLevels: StockLevelWithVariant[]
  isLoading?: boolean
  warehouseId: string
  expandedProductIds?: Set<string>
  productsCache?: Map<string, ProductWithStock[]>
  variantsCache?: Map<string, VariantWithStock[]>
  onWarehouseExpand?: (warehouseId: string) => void
  onProductExpand?: (productId: string) => void
  isLoadingProducts?: (warehouseId: string) => boolean
  isLoadingVariants?: (productId: string) => boolean
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

export interface VariantsSubTableProps {
  variants: VariantRow[]
  isLoading?: boolean
  productId: string
  onVariantClick?: (variantId: string, productId: string) => void
  onAddVariant?: (productId: string) => void
}
