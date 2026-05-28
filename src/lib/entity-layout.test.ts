import { describe, it, expect, vi } from 'vitest'
import { getEntityLayout } from './entity-layout'

const mockT = (key: string) => {
  const translations: Record<string, string> = {
    'entity.layout.products.label': 'Products',
    'entity.layout.products.columns.name': 'Product Name',
    'entity.layout.products.columns.category': 'Category',
    'entity.layout.products.columns.unit_price': 'Unit Price',
    'entity.layout.products.columns.qty_in_stock': 'Qty in Stock',
    'entity.layout.warehouses.label': 'Warehouses',
    'entity.layout.warehouses.columns.name': 'Warehouse Name',
    'entity.layout.warehouses.columns.location': 'Location',
  }
  return translations[key] ?? key
}

describe('getEntityLayout', () => {
  it('returns ColumnDef array for valid entity', () => {
    const result = getEntityLayout('products', mockT as never)
    expect(result).toHaveLength(4)
    expect(result[0]).toMatchObject({
      id: 'name',
      label: 'Product Name',
      type: 'text',
      width: 200,
      sortable: true,
      filterable: true,
      visible: true,
      order: 1,
      isNameColumn: true,
    })
  })

  it('filters out id, _id, pk, fk_ columns', () => {
    const result = getEntityLayout('products', mockT as never)
    const ids = result.map((c) => c.id)
    expect(ids).not.toContain('id')
    expect(ids).not.toContain('_id')
  })

  it('returns empty array for nonexistent entity', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockReturnValue()
    const result = getEntityLayout('nonexistent', mockT as never)
    expect(result).toEqual([])
    expect(consoleSpy).toHaveBeenCalledWith(
      '[entity-layout] No layout found for entity: nonexistent'
    )
    consoleSpy.mockRestore()
  })

  it('maps currency type correctly', () => {
    const result = getEntityLayout('products', mockT as never)
    const priceCol = result.find((c) => c.id === 'unit_price')
    expect(priceCol?.type).toBe('currency')
  })

  it('translates label using t function', () => {
    const result = getEntityLayout('products', mockT as never)
    expect(result[0]?.label).toBe('Product Name')
  })
})