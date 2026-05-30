# Add Entity Creation - Design Spec

## Context

The "Add New" button in `EntityWorkspace.tsx` (line 59-62) is currently a dead UI element. This spec covers wiring it up to create new entities for products, warehouses, and product variants.

## Goals

1. Connect the "Add New" button to open a create modal
2. Create three new modals: `ProductCreateModal`, `WarehouseCreateModal`, `VariantCreateModal`
3. Modals use fields defined in `entity-layout-config.ts`
4. Call existing Rust create commands on submission
5. Invalidate query cache to refresh the table after creation

## Entity Fields

| Entity | Fields |
|--------|--------|
| products | name, company, category |
| warehouses | name, location |
| product_variants | sku, variant_name, uom_id, retail_price, wholesale_price, distribution_price |

## Modal Contract

```typescript
interface ProductCreateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  queryClient: QueryClient
}

interface WarehouseCreateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  queryClient: QueryClient
}

interface VariantCreateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  queryClient: QueryClient
  productId: string  // variants are always linked to a product
}
```

## UI/UX

### Modal Structure
- Max width: `max-w-md` (matches ColumnVisibilityDialog, smaller than detail modals)
- Header with title: "Add New {entityLabel}" (e.g., "Add New Product")
- Form fields laid out in 2-column grid for products/warehouses
- Form fields in 2-column grid for variants (with price fields)
- Footer with Cancel and Create buttons
- Loading state on Create button during submission

### Form Behavior
- All text fields required unless noted
- Price fields accept decimal numbers, default to 0 if empty
- Validation: show inline error if required field is empty on submit
- On successful create: close modal, invalidate `['entity', entityType]` query

### Button Wiring
`EntityHeader` receives `entityType` prop. Based on `entityType`:
- `products` → opens `ProductCreateModal`
- `warehouses` → opens `WarehouseCreateModal`
- `product_variants` → opens `VariantCreateModal` (requires selecting a product first - see Variant Creation Flow)

### Variant Creation Flow
Variants must be linked to a product. When user clicks "Add New" for variants:
1. If triggered from product_variants view with an active product context, use that `productId`
2. Future: could show a product picker dialog

For now, variants are created via the expand row in products table (existing behavior via `VariantDetailModal` with `variantsCreate`). The "Add New" button in the product_variants context would need a productId - this is a follow-up enhancement.

**Decision**: Implement "Add New" for products and warehouses now. For product_variants, the button is disabled until product context is determined. Track as follow-up.

## Component Inventory

### ProductCreateModal
- Props: `open`, `onOpenChange`, `queryClient`
- Fields: company (text), name (text), category (text)
- Submit: `commands.create(company, name, category)`
- On success: invalidate `['entity', 'products']`

### WarehouseCreateModal
- Props: `open`, `onOpenChange`, `queryClient`
- Fields: name (text), location (text)
- Submit: `commands.warehousesCreate(name, location)`
- On success: invalidate `['entity', 'warehouses']`

### VariantCreateModal
- Props: `open`, `onOpenChange`, `queryClient`, `productId`
- Fields: sku (text), variant_name (text), uom_id (text), retail_price (number), wholesale_price (number), distribution_price (number)
- Submit: `commands.variantsCreate({ product_id, sku, variant_name, uom_id, retail_price, wholesale_price, distribution_price })`
- On success: invalidate `['entity', 'product_variants']`

## File Structure

```
src/components/entity/
  ProductCreateModal.tsx    # new
  WarehouseCreateModal.tsx # new
  VariantCreateModal.tsx   # new
```

## Data Flow

```
User clicks "Add New" button
  → EntityHeader opens appropriate CreateModal (based on entityType)
  → User fills form
  → User clicks "Create"
    → Call Rust create command
    → On success: queryClient.invalidateQueries({ queryKey: ['entity', entityType] })
    → Close modal
```

## Testing Considerations

1. Modal opens with empty form
2. Validation prevents empty required fields
3. Successful create closes modal and refreshes table
4. Failed create shows error message
5. Cancel closes modal without saving

## Out of Scope

- Product picker for variant creation (future enhancement)
- Edit/Create mode toggle on existing detail modals (separate spec)