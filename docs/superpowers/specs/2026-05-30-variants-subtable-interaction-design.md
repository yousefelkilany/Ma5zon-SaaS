# VariantsSubTable Interaction Design Specification

## 1. Overview

Enable user interaction with variants displayed in the expanded row of products: clicking a variant row opens `VariantDetailModal`, and an "Add Variant" button creates new variants linked to the parent product.

## 2. Gaps Identified

1. **VariantsSubTable rows have no click interaction** - clicking a variant row does nothing
2. **No Add Variant action** - when viewing products with expanded variants, there's no way to add a new variant for that product
3. **VariantCreateModal receives empty productId** - `productId=""` is hardcoded in EntityWorkspace, preventing proper variant creation

## 3. Architecture

### 3.1 Component Hierarchy

```
EntityWorkspace
  └── DataTableShell
        └── DataTable
              └── VariantsSubTable (rendered in expanded row)
                    ├── "Add Variant" button (header)
                    ├── Variant rows (clickable)
                    └── VariantDetailModal (opened on row click)
```

### 3.2 State Management

- **EntityWorkspace**: Manages `createModalOpen`, `createModalType`, `selectedVariantId`, `selectedVariantProductId`
- **DataTable**: Passes `productId` and callbacks down to VariantsSubTable
- **VariantsSubTable**: Receives callbacks via props, does not manage modal state

### 3.3 Data Flow

```
User clicks variant row → VariantsSubTable → onVariantClick(variantId, productId)
                                              ↓
                                         EntityWorkspace state
                                              ↓
                                         VariantDetailModal opens

User clicks "Add Variant" → VariantsSubTable → onAddVariant(productId)
                                              ↓
                                         EntityWorkspace state
                                              ↓
                                         VariantCreateModal opens with productId
```

## 4. Changes

### 4.1 VariantsSubTable Props

```typescript
interface VariantsSubTableProps {
  variants: VariantRow[]
  isLoading?: boolean
  productId: string // NEW: parent product ID
  onVariantClick?: (variantId: string, productId: string) => void // NEW
  onAddVariant?: (productId: string) => void // NEW
}
```

### 4.2 DataTable Changes

In the expanded row render (around line 386-394):

```tsx
{
  expandedRowIds?.has(row.original.id) && (
    <tr>
      <td colSpan={columns.length + 2} className="p-0">
        <VariantsSubTable
          variants={variantsCache?.get(row.original.id) ?? []}
          isLoading={isLoadingVariants?.(row.original.id)}
          productId={row.original.id}
          onVariantClick={onVariantClick}
          onAddVariant={onAddVariant}
        />
      </td>
    </tr>
  )
}
```

### 4.3 DataTable Props

```typescript
interface ExpandedRowProps {
  // ... existing
  productId?: string // NEW (passed when rendering VariantsSubTable)
  onVariantClick?: (variantId: string, productId: string) => void // NEW
  onAddVariant?: (productId: string) => void // NEW
}
```

### 4.4 EntityWorkspace Changes

Add state and handlers:

```typescript
const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null)
const [selectedVariantProductId, setSelectedVariantProductId] = useState<string | null>(null)
const [variantDetailOpen, setVariantDetailOpen] = useState(false)

const handleVariantClick = useCallback((variantId: string, productId: string) => {
  setSelectedVariantId(variantId)
  setSelectedVariantProductId(productId)
  setVariantDetailOpen(true)
}, [])

const handleAddVariant = useCallback((productId: string) => {
  setCreateModalType('product_variants')
  setCreateModalProductId(productId)  // NEW state
  setCreateModalOpen(true)
}, [])

// In render:
<DataTableShell
  // ... existing props
  onVariantClick={handleVariantClick}
  onAddVariant={handleAddVariant}
/>

// VariantDetailModal for product-linked variants
<VariantDetailModal
  open={variantDetailOpen && entityType === 'products'}
  onOpenChange={setVariantDetailOpen}
  entityId={selectedVariantId ?? ''}
  queryClient={queryClient}
  onDeleted={() => {
    setVariantDetailOpen(false)
    setSelectedVariantId(null)
  }}
/>

// VariantCreateModal needs productId prop
<VariantCreateModal
  open={createModalOpen && createModalType === 'product_variants'}
  onOpenChange={handleModalOpenChange}
  queryClient={queryClient}
  productId={createModalProductId}  // Use the tracked productId
/>
```

### 4.5 VariantsSubTable UI Changes

#### Add "Add Variant" button in header:

```tsx
<div className="pl-8 py-2 bg-surface-container-low">
  <div className="flex justify-between items-center pr-4">
    <table className="w-full text-body-sm">{/* ... existing thead */}</table>
    <Button
      size="sm"
      variant="ghost"
      onClick={() => onAddVariant?.(productId)}
      className="text-secondary"
    >
      <span className="material-symbols-outlined text-sm">add</span>
      {t('entity.create.variant.button')}
    </Button>
  </div>
  {/* ... tbody with clickable rows */}
</div>
```

#### Make rows clickable:

```tsx
<tbody>
  {variants.map(variant => (
    <tr
      key={variant.id}
      className="border-t border-outline-variant/30 hover:bg-surface-container-high transition-colors cursor-pointer"
      onClick={() => onVariantClick?.(variant.id, productId)}
    >
      {/* ... existing cells */}
    </tr>
  ))}
</tbody>
```

## 5. File Manifest

| File                                         | Change                                                                                                                            |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/entity/VariantsSubTable.tsx` | Add productId prop, onVariantClick, onAddVariant; add "Add Variant" button; make rows clickable                                   |
| `src/components/entity/DataTable.tsx`        | Add productId, onVariantClick, onAddVariant to ExpandedRowProps; pass to VariantsSubTable                                         |
| `src/components/entity/DataTableShell.tsx`   | Pass through new props                                                                                                            |
| `src/components/entity/EntityWorkspace.tsx`  | Add selectedVariantId, selectedVariantProductId, variantDetailOpen state; add handlers; wire VariantDetailModal for products view |
| `src/lib/types/entity.ts`                    | Update VariantsSubTableProps interface                                                                                            |

## 6. Implementation Notes

- `VariantDetailModal` is already implemented and handles `variants` entity type - it works for product-linked variants too since they share the same `variantsGetById` command
- When `VariantDetailModal` is opened from product view, invalidation uses `['entity', 'product_variants']` query key (already configured)
- Variant creation success should invalidate both `['entity', 'product_variants']` and refresh the expanded row cache
