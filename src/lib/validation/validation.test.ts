import { describe, it, expect } from 'vitest'
import {
  createProductSchema,
  updateProductSchema,
  createVariantSchema,
  updateVariantSchema,
  createWarehouseSchema,
  updateWarehouseSchema,
  filterStateSchema,
  sortStateSchema,
  tabSchema,
  userPreferencesSchema,
  stockLevelSchema,
  recoveryErrorSchema,
} from './schemas'

describe('FilterState validation', () => {
  it('accepts valid filter state with string value', () => {
    const result = filterStateSchema.safeParse({
      column_id: 'name',
      operator: 'contains',
      value: 'test',
    })
    expect(result.success).toBe(true)
  })

  it('accepts valid filter state with number value', () => {
    const result = filterStateSchema.safeParse({
      column_id: 'price',
      operator: 'gt',
      value: 100,
    })
    expect(result.success).toBe(true)
  })

  it('accepts valid filter state with between operator', () => {
    const result = filterStateSchema.safeParse({
      column_id: 'price',
      operator: 'between',
      value: [10, 100],
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid operator', () => {
    const result = filterStateSchema.safeParse({
      column_id: 'name',
      operator: 'invalid',
      value: 'test',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty column_id', () => {
    const result = filterStateSchema.safeParse({
      column_id: '',
      operator: 'eq',
      value: 'test',
    })
    expect(result.success).toBe(false)
  })
})

describe('SortState validation', () => {
  it('accepts valid sort state ascending', () => {
    const result = sortStateSchema.safeParse({
      column_id: 'name',
      direction: 'asc',
    })
    expect(result.success).toBe(true)
  })

  it('accepts valid sort state descending', () => {
    const result = sortStateSchema.safeParse({
      column_id: 'created_at',
      direction: 'desc',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid direction', () => {
    const result = sortStateSchema.safeParse({
      column_id: 'name',
      direction: 'invalid',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty column_id', () => {
    const result = sortStateSchema.safeParse({
      column_id: '',
      direction: 'asc',
    })
    expect(result.success).toBe(false)
  })
})

describe('Tab validation', () => {
  it('accepts valid dashboard tab', () => {
    const result = tabSchema.safeParse({
      id: 'dashboard',
      title: 'Dashboard',
      type: 'dashboard',
      closable: false,
    })
    expect(result.success).toBe(true)
  })

  it('accepts valid entity tab with entityType', () => {
    const result = tabSchema.safeParse({
      id: 'tab-1',
      title: 'Products',
      type: 'entity',
      closable: true,
      entityType: 'products',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid tab type', () => {
    const result = tabSchema.safeParse({
      id: 'tab-1',
      title: 'Test',
      type: 'invalid-type',
      closable: true,
    })
    expect(result.success).toBe(false)
  })
})

describe('UserPreferences validation', () => {
  it('accepts valid preferences with ar language', () => {
    const result = userPreferencesSchema.safeParse({
      language: 'ar',
      theme: 'dark',
      dateFormat: 'yyyy-MM-dd',
    })
    expect(result.success).toBe(true)
  })

  it('accepts valid preferences with en language', () => {
    const result = userPreferencesSchema.safeParse({
      language: 'en',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid language', () => {
    const result = userPreferencesSchema.safeParse({
      language: 'de',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid theme', () => {
    const result = userPreferencesSchema.safeParse({
      language: 'en',
      theme: 'blue',
    })
    expect(result.success).toBe(false)
  })
})

describe('StockLevel validation', () => {
  it('accepts valid stock level', () => {
    const result = stockLevelSchema.safeParse({
      variant_id: 'var-123',
      warehouse_id: 'wh-456',
      quantity: 100,
    })
    expect(result.success).toBe(true)
  })

  it('rejects negative quantity', () => {
    const result = stockLevelSchema.safeParse({
      variant_id: 'var-123',
      warehouse_id: 'wh-456',
      quantity: -5,
    })
    expect(result.success).toBe(false)
  })

  it('rejects non-integer quantity', () => {
    const result = stockLevelSchema.safeParse({
      variant_id: 'var-123',
      warehouse_id: 'wh-456',
      quantity: 10.5,
    })
    expect(result.success).toBe(false)
  })
})

describe('RecoveryError validation', () => {
  it('accepts FileNotFound error', () => {
    const result = recoveryErrorSchema.safeParse({ type: 'FileNotFound' })
    expect(result.success).toBe(true)
  })

  it('accepts ValidationError with message', () => {
    const result = recoveryErrorSchema.safeParse({
      type: 'ValidationError',
      message: 'Invalid filename',
    })
    expect(result.success).toBe(true)
  })

  it('accepts DataTooLarge error', () => {
    const result = recoveryErrorSchema.safeParse({
      type: 'DataTooLarge',
      max_bytes: 10485760,
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid error type', () => {
    const result = recoveryErrorSchema.safeParse({
      type: 'InvalidError',
    })
    expect(result.success).toBe(false)
  })
})

describe('Product validation', () => {
  it('accepts valid product data', () => {
    const result = createProductSchema.safeParse({
      company: 'Acme Corp',
      name: 'Widget',
      category: 'Electronics',
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty company', () => {
    const result = createProductSchema.safeParse({
      company: '',
      name: 'Widget',
      category: 'Electronics',
    })
    expect(result.success).toBe(false)
  })

  it('accepts partial update', () => {
    const result = updateProductSchema.safeParse({ name: 'Updated Widget' })
    expect(result.success).toBe(true)
  })
})

describe('Variant validation', () => {
  it('accepts valid variant data', () => {
    const result = createVariantSchema.safeParse({
      sku: 'SKU-12345',
      variant_name: 'Blue Widget',
      retail_price: 29.99,
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty sku', () => {
    const result = createVariantSchema.safeParse({
      sku: '',
      variant_name: 'Blue Widget',
    })
    expect(result.success).toBe(false)
  })

  it('rejects sku with special characters', () => {
    const result = createVariantSchema.safeParse({
      sku: 'SKU@#$%',
      variant_name: 'Blue Widget',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty variant_name', () => {
    const result = createVariantSchema.safeParse({
      sku: 'SKU-12345',
      variant_name: '',
    })
    expect(result.success).toBe(false)
  })

  it('accepts valid optional uom_id', () => {
    const result = createVariantSchema.safeParse({
      sku: 'SKU-12345',
      variant_name: 'Blue Widget',
      uom_id: 'unit',
    })
    expect(result.success).toBe(true)
  })

  it('rejects uom_id too long', () => {
    const result = createVariantSchema.safeParse({
      sku: 'SKU-12345',
      variant_name: 'Blue Widget',
      uom_id: 'a'.repeat(51),
    })
    expect(result.success).toBe(false)
  })

  it('rejects negative retail_price', () => {
    const result = createVariantSchema.safeParse({
      sku: 'SKU-12345',
      variant_name: 'Blue Widget',
      retail_price: -10,
    })
    expect(result.success).toBe(false)
  })

  it('accepts zero price', () => {
    const result = createVariantSchema.safeParse({
      sku: 'SKU-12345',
      variant_name: 'Blue Widget',
      retail_price: 0,
    })
    expect(result.success).toBe(true)
  })

  it('accepts positive price', () => {
    const result = createVariantSchema.safeParse({
      sku: 'SKU-12345',
      variant_name: 'Blue Widget',
      retail_price: 99.99,
    })
    expect(result.success).toBe(true)
  })

  it('accepts partial update', () => {
    const result = updateVariantSchema.safeParse({ retail_price: 19.99 })
    expect(result.success).toBe(true)
  })
})

describe('Warehouse validation', () => {
  it('accepts valid warehouse data', () => {
    const result = createWarehouseSchema.safeParse({
      name: 'Main Warehouse',
      location: '123 Storage Lane',
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty name', () => {
    const result = createWarehouseSchema.safeParse({
      name: '',
      location: '123 Storage Lane',
    })
    expect(result.success).toBe(false)
  })

  it('rejects name too long', () => {
    const result = createWarehouseSchema.safeParse({
      name: 'a'.repeat(101),
      location: '123 Storage Lane',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty location', () => {
    const result = createWarehouseSchema.safeParse({
      name: 'Main Warehouse',
      location: '',
    })
    expect(result.success).toBe(false)
  })

  it('rejects location too long', () => {
    const result = createWarehouseSchema.safeParse({
      name: 'Main Warehouse',
      location: 'a'.repeat(201),
    })
    expect(result.success).toBe(false)
  })

  it('accepts partial update', () => {
    const result = updateWarehouseSchema.safeParse({ location: 'New Location' })
    expect(result.success).toBe(true)
  })
})
