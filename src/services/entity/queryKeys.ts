import {
  productEntity,
  variantEntity,
  warehouseEntity,
  type EntityType,
} from '@/lib/utils'

const _StockScopeEntities = [productEntity, variantEntity]
export type StockScope = (typeof _StockScopeEntities)[number]
const _MovementScopeEntities = [productEntity, variantEntity, warehouseEntity]
export type MovementScope = (typeof _MovementScopeEntities)[number]

export const entityQueryKeys = {
  all: ['entity'] as const,

  // list-level (the workspace's data table)
  list: (
    entityType: EntityType,
    sort: string,
    page: number,
    pageSize: number
  ) => [...entityQueryKeys.all, entityType, sort, page, pageSize] as const,

  // invalidation helpers (match the existing 'entity' + plural convention)
  lists: () => [...entityQueryKeys.all] as const,
  listFor: (entityType: EntityType) =>
    [...entityQueryKeys.all, entityType] as const,

  // item-level (a single entity's detail, used by the modal)
  detail: (entityType: EntityType, id: string) =>
    [...entityQueryKeys.all, entityType, 'detail', id] as const,

  // secondary reads
  stockLevels: (scope: StockScope, id: string) =>
    ['stock-levels', scope, id] as const,
  stockMovements: (scope: MovementScope, id: string) =>
    ['stock-movements', scope, id] as const,
  warehouses: () => ['warehouses', 'all'] as const,
  variantsByProduct: (productId: string) => [variantEntity, productId] as const,
  productsByWarehouse: (warehouseId: string) =>
    [productEntity, warehouseId] as const,
}
