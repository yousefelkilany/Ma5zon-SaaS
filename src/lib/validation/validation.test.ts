import { describe, it, expect } from 'vitest';
import { createProductSchema, updateProductSchema, createVariantSchema, updateVariantSchema, createWarehouseSchema, updateWarehouseSchema } from './schemas';

describe('Product validation', () => {
  it('accepts valid product data', () => {
    const result = createProductSchema.safeParse({
      company: 'Acme Corp',
      name: 'Widget',
      category: 'Electronics',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty company', () => {
    const result = createProductSchema.safeParse({
      company: '',
      name: 'Widget',
      category: 'Electronics',
    });
    expect(result.success).toBe(false);
  });

  it('accepts partial update', () => {
    const result = updateProductSchema.safeParse({ name: 'Updated Widget' });
    expect(result.success).toBe(true);
  });
});

describe('Variant validation', () => {
  it('accepts valid variant data', () => {
    const result = createVariantSchema.safeParse({
      sku: 'SKU-12345',
      variant_name: 'Blue Widget',
      retail_price: 29.99,
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty sku', () => {
    const result = createVariantSchema.safeParse({
      sku: '',
      variant_name: 'Blue Widget',
    });
    expect(result.success).toBe(false);
  });

  it('rejects sku with special characters', () => {
    const result = createVariantSchema.safeParse({
      sku: 'SKU@#$%',
      variant_name: 'Blue Widget',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty variant_name', () => {
    const result = createVariantSchema.safeParse({
      sku: 'SKU-12345',
      variant_name: '',
    });
    expect(result.success).toBe(false);
  });

  it('accepts valid optional uom_id', () => {
    const result = createVariantSchema.safeParse({
      sku: 'SKU-12345',
      variant_name: 'Blue Widget',
      uom_id: 'unit',
    });
    expect(result.success).toBe(true);
  });

  it('rejects uom_id too long', () => {
    const result = createVariantSchema.safeParse({
      sku: 'SKU-12345',
      variant_name: 'Blue Widget',
      uom_id: 'a'.repeat(51),
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative retail_price', () => {
    const result = createVariantSchema.safeParse({
      sku: 'SKU-12345',
      variant_name: 'Blue Widget',
      retail_price: -10,
    });
    expect(result.success).toBe(false);
  });

  it('accepts zero price', () => {
    const result = createVariantSchema.safeParse({
      sku: 'SKU-12345',
      variant_name: 'Blue Widget',
      retail_price: 0,
    });
    expect(result.success).toBe(true);
  });

  it('accepts positive price', () => {
    const result = createVariantSchema.safeParse({
      sku: 'SKU-12345',
      variant_name: 'Blue Widget',
      retail_price: 99.99,
    });
    expect(result.success).toBe(true);
  });

  it('accepts partial update', () => {
    const result = updateVariantSchema.safeParse({ retail_price: 19.99 });
    expect(result.success).toBe(true);
  });
});

describe('Warehouse validation', () => {
  it('accepts valid warehouse data', () => {
    const result = createWarehouseSchema.safeParse({
      name: 'Main Warehouse',
      location: '123 Storage Lane',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    const result = createWarehouseSchema.safeParse({
      name: '',
      location: '123 Storage Lane',
    });
    expect(result.success).toBe(false);
  });

  it('rejects name too long', () => {
    const result = createWarehouseSchema.safeParse({
      name: 'a'.repeat(101),
      location: '123 Storage Lane',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty location', () => {
    const result = createWarehouseSchema.safeParse({
      name: 'Main Warehouse',
      location: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects location too long', () => {
    const result = createWarehouseSchema.safeParse({
      name: 'Main Warehouse',
      location: 'a'.repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it('accepts partial update', () => {
    const result = updateWarehouseSchema.safeParse({ location: 'New Location' });
    expect(result.success).toBe(true);
  });
});