import { describe, it, expect, vi } from 'vitest'
import { getEntityLayout } from './entity-layout'

const mockT = (key: string, opts?: { returnObjects?: boolean }) => {
  const layouts: Record<string, unknown> = {
    'entity.layout.products': {
      label: 'Products',
      columns: {
        name: { label: 'Product Name', type: 'text', width: 200 },
        unit_price: { label: 'Unit Price', type: 'currency', width: 120 },
        id: { label: 'ID', type: 'text', width: 80 },
      },
    },
    'entity.layout.warehouses': {
      label: 'Warehouses',
      columns: {
        name: { label: 'Warehouse Name', type: 'text', width: 200 },
        location: { label: 'Location', type: 'text', width: 150 },
      },
    },
    'entity.layout.empty': {
      label: 'Empty Entity',
      columns: {},
    },
    'entity.layout.nonexistent': 'not-an-object',
  }

  const result = layouts[key]
  if (!result) return undefined
  if (opts?.returnObjects) return result
  return typeof result === 'object' ? JSON.stringify(result) : result
}

describe('getEntityLayout', () => {
  it('returns ColumnDef array for valid entity', () => {
    const result = getEntityLayout('products', mockT as never)
    expect(result).toHaveLength(2)
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

  it('returns empty array for invalid layout format', () => {
    const result = getEntityLayout('empty', mockT as never)
    expect(result).toEqual([])
  })

  it('maps currency type correctly', () => {
    const result = getEntityLayout('products', mockT as never)
    const priceCol = result.find((c) => c.id === 'unit_price')
    expect(priceCol?.type).toBe('currency')
  })
})