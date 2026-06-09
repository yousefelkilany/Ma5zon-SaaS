import type { Product, Variant, Warehouse } from '@/lib/bindings'

type ProductUpdateValues = {
  company: string
  name: string
  category: string
}

type VariantUpdateValues = {
  // populated during Task 14 against the real `commands.variantsUpdate` signature
  [key: string]: string | number | boolean | null
}

type WarehouseUpdateValues = {
  // populated during Task 14 against the real `commands.warehousesUpdate` signature
  [key: string]: string | number | boolean | null
}

export type {
  Product,
  Variant,
  Warehouse,
  ProductUpdateValues,
  VariantUpdateValues,
  WarehouseUpdateValues,
}
