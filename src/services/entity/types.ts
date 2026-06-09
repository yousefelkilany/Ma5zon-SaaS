import type { Product, Variant, Warehouse } from '@/lib/bindings'

interface ProductUpdateValues {
  company: string
  name: string
  category: string
}

type VariantUpdateValues = Record<string, string | number | boolean | null>;

type WarehouseUpdateValues = Record<string, string | number | boolean | null>;

export type {
  Product,
  Variant,
  Warehouse,
  ProductUpdateValues,
  VariantUpdateValues,
  WarehouseUpdateValues,
}
