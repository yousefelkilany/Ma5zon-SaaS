# VariantDetailModal Cache Invalidation Fix

## Problem

When editing a variant from the expanded row (product view), `VariantDetailModal` invalidates `['entity', 'variants']` but:

1. The expanded row data is cached in local `variantsCache` state in EntityWorkspace
2. The query key `['entity', 'product_variants']` is not invalidated
3. The `variantsCache` is not updated with the edited data

Result: The expanded row shows stale data after editing.

## Solution

Add an `onSaved` callback to `VariantDetailModal` that EntityWorkspace uses to:

1. Refetch variants for the product via `commands.variantsGetByProduct(productId)`
2. Update the `variantsCache`

## Changes

### 1. VariantDetailModal Props (VariantDetailModal.tsx)

Add `onSaved?: (variant: Variant) => void` to props interface.

After successful save, call `onSaved?.(result.data)`.

### 2. EntityWorkspace (EntityWorkspace.tsx)

Update `handleVariantClick` to pass `productId` and create `handleVariantSaved` callback:

```typescript
const handleVariantSaved = useCallback(async (productId: string) => {
  const result = await commands.variantsGetByProduct(productId)
  if (result.status === 'ok') {
    const variantRows: VariantRow[] = result.data.map(v => ({
      ...v,
      uom_id: Number(v.uom_id),
    }))
    setVariantsCache(prev => new Map(prev).set(productId, variantRows))
  }
}, [])
```

Pass `onSaved={(variant) => handleVariantSaved(variant.product_id)}` to VariantDetailModal.

## File Manifest

| File                                           | Change                                               |
| ---------------------------------------------- | ---------------------------------------------------- |
| `src/components/entity/VariantDetailModal.tsx` | Add `onSaved` prop, call on save success             |
| `src/components/entity/EntityWorkspace.tsx`    | Add `handleVariantSaved`, pass to VariantDetailModal |
