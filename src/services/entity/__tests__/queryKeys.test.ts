import { describe, it, expect } from 'vitest'
import { entityQueryKeys } from '../queryKeys'

describe('entityQueryKeys', () => {
  it('all starts with entity', () => {
    expect(entityQueryKeys.all).toEqual(['entity'])
  })

  it('list produces a stable shape', () => {
    expect(entityQueryKeys.list('products', 'name-asc', 1, 25)).toEqual([
      'entity',
      'products',
      'name-asc',
      1,
      25,
    ])
  })

  it('listFor returns all entries for an entity type (matches existing invalidation pattern)', () => {
    expect(entityQueryKeys.listFor('products')).toEqual(['entity', 'products'])
    expect(entityQueryKeys.listFor('variants')).toEqual(['entity', 'variants'])
  })

  it('detail includes entity type, "detail", and id', () => {
    expect(entityQueryKeys.detail('products', 'P1')).toEqual([
      'entity',
      'products',
      'detail',
      'P1',
    ])
  })

  it('stockLevels and stockMovements follow the existing prefixed-scope convention', () => {
    expect(entityQueryKeys.stockLevels('product', 'P1')).toEqual([
      'stock-levels-product',
      'P1',
    ])
    expect(entityQueryKeys.stockMovements('warehouse', 'W1')).toEqual([
      'stock-movements-warehouse',
      'W1',
    ])
  })

  it('warehouses, variantsByProduct, productsByWarehouse match the existing ad-hoc keys', () => {
    expect(entityQueryKeys.warehouses()).toEqual(['warehouses', 'all'])
    expect(entityQueryKeys.variantsByProduct('P1')).toEqual(['variants', 'P1'])
    expect(entityQueryKeys.productsByWarehouse('W1')).toEqual([
      'products',
      'W1',
    ])
  })
})
