import type { commands } from '@/lib/tauri-bindings'

type Product = NonNullable<
  Awaited<ReturnType<typeof commands.getById>> extends {
    status: 'ok'
    data: infer D
  }
    ? D
    : never
>

type Variant = NonNullable<
  Awaited<ReturnType<typeof commands.variantsGetById>> extends {
    status: 'ok'
    data: infer D
  }
    ? D
    : never
>

type Warehouse = NonNullable<
  Awaited<ReturnType<typeof commands.warehousesGetById>> extends {
    status: 'ok'
    data: infer D
  }
    ? D
    : never
>

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
