# Phase 4: Cross-Link UI

**Goal:** Add `EntityNameLink` and apply it across the relevant modal tabs. Add the new `variants` tab to `ProductModal`. Add the parent product link in `VariantModal`. Extract `VariantsListForProduct` so the new tab and the existing sub-table share code.

**Why after Phase 3:** all modal data plumbing is store-driven; no further store changes needed. This phase is pure UI.

## Verification at end of phase

```bash
pnpm run typecheck && pnpm run test:run
```

Expected: passes; new component tests pass; updated modal tests pass.

---

## Task 4.1: Add `EntityNameLink` component

**Files:**
- Create: `src/components/entity/EntityNameLink.tsx`
- Create: `src/components/entity/__tests__/EntityNameLink.test.tsx`

- [ ] **Step 1: Write the component**

Create `src/components/entity/EntityNameLink.tsx`:

```tsx
import type { ReactNode } from 'react'
import { useOpenEntityModal } from '@/hooks/use-open-entity-modal'
import { cn } from '@/lib/utils'

type LinkKind = 'product' | 'variant' | 'warehouse'

interface EntityNameLinkProps {
  kind: LinkKind
  id: string
  productId?: string
  className?: string
  children: ReactNode
}

export function EntityNameLink({
  kind,
  id,
  productId,
  className,
  children,
}: EntityNameLinkProps) {
  const { openProduct, openVariant, openWarehouse } = useOpenEntityModal()

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (kind === 'product') openProduct(id)
    else if (kind === 'variant') openVariant(id, productId)
    else openWarehouse(id)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'text-secondary cursor-pointer hover:underline bg-transparent border-0 p-0 font-inherit',
        className
      )}
    >
      {children}
    </button>
  )
}
```

- [ ] **Step 2: Write the test file**

Create `src/components/entity/__tests__/EntityNameLink.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { QueryWrapper } from '@/lib/test-utils/query-wrapper'
import { EntityNameLink } from '../EntityNameLink'
import { useTabStore } from '@/store/workspace-store'

function resetStore() {
  useTabStore.setState({
    tabs: [
      { id: 'dashboard', title: 'D', type: 'dashboard', closable: false },
    ],
    activeTabId: 'dashboard',
    tabUIStates: {},
  })
}

describe('EntityNameLink', () => {
  beforeEach(() => {
    resetStore()
  })

  it('renders its children', () => {
    render(<EntityNameLink kind="product" id="P1">Widget</EntityNameLink>, {
      wrapper: QueryWrapper,
    })
    expect(screen.getByRole('button', { name: 'Widget' })).toBeInTheDocument()
  })

  it('click pushes a product frame', async () => {
    render(<EntityNameLink kind="product" id="P1">Widget</EntityNameLink>, {
      wrapper: QueryWrapper,
    })
    await userEvent.setup().click(screen.getByRole('button', { name: 'Widget' }))
    expect(
      useTabStore.getState().tabUIStates.dashboard?.modalStack
    ).toEqual([{ entity_modal: 'product', entity_id: 'P1' }])
  })

  it('click pushes a variant frame with product_id when provided', async () => {
    render(
      <EntityNameLink kind="variant" id="V1" productId="P1">
        Red
      </EntityNameLink>,
      { wrapper: QueryWrapper }
    )
    await userEvent.setup().click(screen.getByRole('button', { name: 'Red' }))
    expect(
      useTabStore.getState().tabUIStates.dashboard?.modalStack
    ).toEqual([
      { entity_modal: 'variant', entity_id: 'V1', product_id: 'P1' },
    ])
  })

  it('click pushes a warehouse frame', async () => {
    render(
      <EntityNameLink kind="warehouse" id="W1">Main</EntityNameLink>,
      { wrapper: QueryWrapper }
    )
    await userEvent.setup().click(
      screen.getByRole('button', { name: 'Main' })
    )
    expect(
      useTabStore.getState().tabUIStates.dashboard?.modalStack
    ).toEqual([{ entity_modal: 'warehouse', entity_id: 'W1' }])
  })

  it('stopPropagation is called on click', async () => {
    const parentClick = vi.fn()
    render(
      <div onClick={parentClick}>
        <EntityNameLink kind="product" id="P1">Widget</EntityNameLink>
      </div>,
      { wrapper: QueryWrapper }
    )
    await userEvent.setup().click(screen.getByRole('button', { name: 'Widget' }))
    expect(parentClick).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 3: Run the tests**

Run: `pnpm run test:run src/components/entity/__tests__/EntityNameLink.test.tsx`
Expected: 5 passing tests.

- [ ] **Step 4: Commit**

```bash
git add src/components/entity/EntityNameLink.tsx src/components/entity/__tests__/EntityNameLink.test.tsx
git commit -m "feat(entity): add EntityNameLink"
```

---

## Task 4.2: Extract `VariantsListForProduct`

**Files:**
- Create: `src/components/entity/VariantsListForProduct.tsx`
- Create: `src/components/entity/__tests__/VariantsListForProduct.test.tsx`
- Modify: `src/components/entity/VariantsSubTable.tsx`

- [ ] **Step 1: Write the component**

Create `src/components/entity/VariantsListForProduct.tsx`:

```tsx
import type { VariantRow } from '@/lib/types/entity'
import { useTranslation } from 'react-i18next'
import { getEntityLayout } from '@/lib/entity-layout'
import { formatCurrency, productEntity } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { commands } from '@/lib/tauri-bindings'
import { EntityNameLink } from './EntityNameLink'

export type VariantsListMode = 'whole-row' | 'name-only'

interface VariantsListForProductProps {
  productId: string
  mode: VariantsListMode
  onVariantClick?: (variantId: string, productId: string) => void
  onAddVariant?: (productId: string) => void
}

export function VariantsListForProduct({
  productId,
  mode,
  onVariantClick,
  onAddVariant,
}: VariantsListForProductProps) {
  const { data: variants = [], isLoading } = useQuery({
    queryKey: ['entity', productEntity, 'variants', productId],
    queryFn: async () => {
      const result = await commands.variantsGetByProductWithStock(productId)
      if (result.status === 'ok') {
        return result.data as VariantRow[]
      }
      console.error('Failed to load variants:', result.error)
      return []
    },
    staleTime: Infinity,
  })
  const { t } = useTranslation()

  const columns = useMemo(() => getEntityLayout('variant', t), [t])

  if (isLoading) {
    return (
      <div className="pl-8 py-3 bg-surface-container-low">
        <Skeleton className="h-16 w-full" />
      </div>
    )
  }

  if (variants.length === 0) {
    return (
      <div className="pl-8 py-3 bg-surface-container-low text-on-surface-variant text-body-sm flex justify-between items-center pr-4">
        <span>{t('entity.layout.variant.none')}</span>
        {onAddVariant && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onAddVariant(productId)}
            className="text-secondary"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            {t('entity.create.variant.button')}
          </Button>
        )}
      </div>
    )
  }

  const showNameLink = mode === 'name-only'
  const nameColumnIndex = columns.findIndex(c => c.id === 'variant_name')

  return (
    <div className="pl-8 py-2 bg-surface-container-low">
      <div className="flex justify-between items-center pr-4 mb-2">
        <table className="w-full text-body-sm">
          <thead>
            <tr className="border-b border-outline-variant">
              {columns.map(col => (
                <th
                  key={col.id}
                  className={`px-3 py-2 text-start text-on-surface-variant font-label-caps ${
                    col.type === 'currency' ? 'text-end' : ''
                  }`}
                >
                  {col.label}
                </th>
              ))}
              {onAddVariant && (
                <th className="size-0.5 py-2 text-start text-on-surface-variant font-label-caps">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onAddVariant(productId)}
                    className="text-secondary"
                  >
                    <span className="material-symbols-outlined text-sm">add</span>
                    {t('entity.create.variant.button')}
                  </Button>
                </th>
              )}
            </tr>
          </thead>

          <tbody>
            {variants.map(variant => (
              <tr
                key={variant.id}
                className={`border-t border-outline-variant/30 transition-colors ${
                  mode === 'whole-row'
                    ? 'hover:bg-surface-container-high cursor-pointer'
                    : ''
                }`}
                onClick={
                  mode === 'whole-row'
                    ? () => onVariantClick?.(variant.id, productId)
                    : undefined
                }
              >
                {columns.map((col, idx) => {
                  const isNameColumn =
                    showNameLink && idx === nameColumnIndex
                  const cellValue =
                    col.type === 'currency'
                      ? formatCurrency(
                          variant[col.id as keyof VariantRow] as number
                        )
                      : String(variant[col.id as keyof VariantRow] ?? '-')
                  return (
                    <td
                      key={col.id}
                      className={`px-3 py-2 text-on-surface ${
                        col.type === 'currency'
                          ? 'text-right text-on-surface font-data-tabular tabular-nums'
                          : ''
                      }`}
                    >
                      {isNameColumn ? (
                        <EntityNameLink
                          kind="variant"
                          id={variant.id}
                          productId={productId}
                        >
                          {cellValue}
                        </EntityNameLink>
                      ) : (
                        cellValue
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Write the test file**

Create `src/components/entity/__tests__/VariantsListForProduct.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { QueryWrapper } from '@/lib/test-utils/query-wrapper'
import { VariantsListForProduct } from '../VariantsListForProduct'
import { commands } from '@/lib/tauri-bindings'
import { useTabStore } from '@/store/workspace-store'

vi.mock('@/lib/tauri-bindings', () => ({
  commands: {
    variantsGetByProductWithStock: vi.fn(),
  },
}))

const mockOk = <T,>(data: T) => ({ status: 'ok' as const, data })

const fakeVariants = [
  {
    id: 'V1',
    sku: 'SKU-1',
    variant_name: 'Red',
    uom_id: 'pcs',
    quantity: 5,
    retail_price: 10,
    wholesale_price: 8,
    distribution_price: 6,
  },
  {
    id: 'V2',
    sku: 'SKU-2',
    variant_name: 'Blue',
    uom_id: 'pcs',
    quantity: 7,
    retail_price: 12,
    wholesale_price: 9,
    distribution_price: 7,
  },
]

function resetStore() {
  useTabStore.setState({
    tabs: [
      { id: 'dashboard', title: 'D', type: 'dashboard', closable: false },
    ],
    activeTabId: 'dashboard',
    tabUIStates: {},
  })
}

describe('VariantsListForProduct', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetStore()
    vi.mocked(commands.variantsGetByProductWithStock).mockResolvedValue(
      mockOk(fakeVariants)
    )
  })

  it('whole-row mode: row click invokes onVariantClick and name is plain text', async () => {
    const onVariantClick = vi.fn()
    render(
      <QueryWrapper>
        <VariantsListForProduct
          productId="P1"
          mode="whole-row"
          onVariantClick={onVariantClick}
        />
      </QueryWrapper>
    )
    await waitFor(() => screen.getByText('Red'))
    await userEvent.setup().click(screen.getByText('Red'))
    expect(onVariantClick).toHaveBeenCalledWith('V1', 'P1')
  })

  it('name-only mode: name cell is an EntityNameLink, row has no onClick', async () => {
    const onVariantClick = vi.fn()
    render(
      <QueryWrapper>
        <VariantsListForProduct
          productId="P1"
          mode="name-only"
          onVariantClick={onVariantClick}
        />
      </QueryWrapper>
    )
    await waitFor(() => screen.getByText('Red'))
    await userEvent.setup().click(screen.getByText('Red'))
    expect(onVariantClick).not.toHaveBeenCalled()
    expect(
      useTabStore.getState().tabUIStates.dashboard?.modalStack
    ).toEqual([
      { entity_modal: 'variant', entity_id: 'V1', product_id: 'P1' },
    ])
  })
})
```

- [ ] **Step 3: Run the tests**

Run: `pnpm run test:run src/components/entity/__tests__/VariantsListForProduct.test.tsx`
Expected: 2 passing tests.

- [ ] **Step 4: Refactor `VariantsSubTable.tsx`**

Replace the body of `src/components/entity/VariantsSubTable.tsx` with a thin wrapper:

```tsx
import { VariantsListForProduct } from './VariantsListForProduct'

interface VariantsSubTableProps {
  productId: string
  onVariantClick?: (variantId: string, productId: string) => void
  onAddVariant?: (productId: string) => void
}

export function VariantsSubTable({
  productId,
  onVariantClick,
  onAddVariant,
}: VariantsSubTableProps) {
  return (
    <VariantsListForProduct
      productId={productId}
      mode="whole-row"
      onVariantClick={onVariantClick}
      onAddVariant={onAddVariant}
    />
  )
}
```

- [ ] **Step 5: Run the typecheck and tests**

Run: `pnpm run typecheck && pnpm run test:run`
Expected: passes; `VariantsSubTable` is unchanged from the caller's perspective.

- [ ] **Step 6: Commit**

```bash
git add src/components/entity/VariantsListForProduct.tsx src/components/entity/__tests__/VariantsListForProduct.test.tsx src/components/entity/VariantsSubTable.tsx
git commit -m "refactor(entity): extract VariantsListForProduct with row/name modes"
```

---

## Task 4.3: Add the `variants` tab to `ProductModal`

**Files:**
- Modify: `src/components/entity/ProductModal.tsx`
- Modify: `src/components/modal/ModalManager.tsx`
- Modify: `locales/en.json`, `locales/ar.json`
- Modify: `src/components/entity/__tests__/ProductModal.test.tsx`

- [ ] **Step 1: Add the i18n string**

In `locales/en.json`, after `"entity.detail.tabs.audits"`, add:

```json
"entity.detail.tabs.variants": "Variants",
```

In `locales/ar.json`, add the Arabic translation in the matching location. Use whatever translation is consistent with the rest of the file (e.g. "الفئات" or "المتغيرات"). The translator can refine.

- [ ] **Step 2: Add a per-modal local tab list in `ProductModal`**

`EntityModalTabs` is shared with `VariantModal` and `WarehouseModal` where `variants` is not a sensible tab. Introduce a per-modal local list in `ProductModal` only.

In `src/components/entity/ProductModal.tsx`, near the top after the imports, add:

```ts
const PRODUCT_TABS = ['details', 'variants', 'stock', 'audits', 'insights'] as const
type ProductTab = (typeof PRODUCT_TABS)[number]
```

Change the `activeTab` state hook:

```ts
const [activeTab, setActiveTab] = useState<ProductTab>('details')
```

In the JSX, replace `EntityModalTabs.map(...)` with `PRODUCT_TABS.map(...)`.

Add the imports:

```ts
import { VariantsListForProduct } from './VariantsListForProduct'
import { useOpenEntityModal } from '@/hooks/use-open-entity-modal'
```

- [ ] **Step 3: Add the new tab content**

Inside the JSX, after the `{activeTab === 'details' && (...)}` block and before `{activeTab === 'stock' && (...)}`, add:

```tsx
{activeTab === 'variants' && (
  <VariantsListForProduct
    productId={entityId ?? ''}
    mode="name-only"
    onAddVariant={onAddVariant}
  />
)}
```

`onAddVariant` is a new optional prop on `ProductModal`. Add it to the `ProductModalProps` interface:

```ts
interface ProductModalProps {
  entityId?: string
  queryClient: QueryClient
  mode: 'view' | 'create'
  onDeleted?: () => void
  container?: HTMLElement
  entityType?: EntityType
  onAddVariant?: (productId: string) => void
}
```

- [ ] **Step 4: Wire `onAddVariant` from `ModalManager`**

In `src/components/modal/ModalManager.tsx`, hoist `useOpenEntityModal` to the top of the component (hooks can't be called inside `case` clauses):

```tsx
export function ModalManager() {
  const queryClient = useQueryClient()
  const top = useTabStore(...)
  const { openCreateVariant } = useOpenEntityModal()

  function handleClose() {
    useTabStore.getState().popModal()
  }

  switch (top.entity_modal) {
    case 'product':
      if (!top.entity_id) return null
      return (
        <ProductModal
          entityId={top.entity_id}
          queryClient={queryClient}
          mode="view"
          onDeleted={handleClose}
          onAddVariant={() => openCreateVariant(top.entity_id!)}
        />
      )
    // ... other cases unchanged
  }
}
```

Add the import:

```ts
import { useOpenEntityModal } from '@/hooks/use-open-entity-modal'
```

- [ ] **Step 5: Add a test**

In `src/components/entity/__tests__/ProductModal.test.tsx`, add a new test:

```tsx
  it('renders the variants tab with a name-only list', async () => {
    vi.mocked(commands.getById).mockResolvedValue(
      mockOk({
        id: 'P1',
        company: 'ACME',
        name: 'Widget',
        category: 'A',
        created_at: null,
        updated_at: null,
        deleted_at: null,
      } as never)
    )
    vi.mocked(commands.warehousesGetAll).mockResolvedValue(mockOk([]))
    vi.mocked(commands.stockLevelsGetByProduct).mockResolvedValue(mockOk([]))
    vi.mocked(commands.variantsGetByProductWithStock).mockResolvedValue(
      mockOk([
        {
          id: 'V1',
          sku: 'SKU-1',
          variant_name: 'Red',
          uom_id: 'pcs',
          quantity: 5,
          retail_price: 10,
          wholesale_price: 8,
          distribution_price: 6,
        },
      ])
    )
    vi.mocked(commands.stockMovementsGetByVariant).mockResolvedValue(mockOk([]))

    renderModal()
    await waitFor(() => screen.getByRole('heading', { name: 'Widget' }))
    await userEvent.setup().click(screen.getByRole('tab', { name: /variants/i }))
    await waitFor(() => screen.getByText('Red'))
    expect(screen.getByRole('button', { name: 'Red' })).toBeInTheDocument()
  })
```

- [ ] **Step 6: Run the tests**

Run: `pnpm run test:run src/components/entity/__tests__/ProductModal.test.tsx`
Expected: 4 passing tests (3 existing + 1 new).

- [ ] **Step 7: Commit**

```bash
git add src/components/entity/ProductModal.tsx src/components/modal/ModalManager.tsx locales/en.json locales/ar.json src/components/entity/__tests__/ProductModal.test.tsx
git commit -m "feat(product-modal): add variants tab with clickable variant names"
```

---

## Task 4.4: Add `EntityNameLink` cross-links in `StockLevelsTable`

**Files:**
- Modify: `src/components/entity/StockLevelsTable.tsx`
- Modify: `src/components/entity/ProductModal.tsx` (pass `productId`)

- [ ] **Step 1: Add an optional `productId` prop**

Add to `StockLevelsTableProps` (line 18-23):

```ts
interface StockLevelsTableProps {
  stockLevels: StockLevelWithVariant[]
  isLoading?: boolean
  entity: StockScope
  onTransferSuccess?: () => void
  productId?: string
}
```

Destructure it: `function StockLevelsTable({ stockLevels, isLoading, entity, onTransferSuccess, productId })`.

Pass it through to `ProductStockPivot`:

```tsx
if (entity === productEntity) {
  return (
    <ProductStockPivot
      stockLevels={stockLevels}
      warehouseNames={warehouseNames}
      transferState={transferState}
      setTransferState={setTransferState}
      onTransferSuccess={onTransferSuccess}
      productId={productId}
    />
  )
}
```

Add `productId` to the `ProductStockPivot` props type:

```ts
function ProductStockPivot({
  stockLevels,
  warehouseNames,
  transferState,
  setTransferState,
  onTransferSuccess,
  productId,
}: {
  stockLevels: StockLevelWithVariant[]
  warehouseNames?: Map<string, string>
  transferState: transferState | null
  setTransferState: React.Dispatch<React.SetStateAction<transferState | null>>
  onTransferSuccess?: () => void
  productId?: string
}) {
```

- [ ] **Step 2: Wrap warehouse `<th>` in the pivot**

In `ProductStockPivot`, replace the warehouse header columns block (lines 251-258):

```tsx
{columns.map(wId => (
  <th
    key={wId}
    className="px-3 py-2 text-end text-on-surface-variant font-label-caps"
  >
    {wId ? (warehouseNames?.get(wId) ?? wId) : '-'}
  </th>
))}
```

with:

```tsx
{columns.map(wId => (
  <th
    key={wId}
    className="px-3 py-2 text-end text-on-surface-variant font-label-caps"
  >
    {wId ? (
      <EntityNameLink kind="warehouse" id={wId}>
        {warehouseNames?.get(wId) ?? wId}
      </EntityNameLink>
    ) : (
      '-'
    )}
  </th>
))}
```

- [ ] **Step 3: Wrap the variant name `<td>` in the pivot**

Replace the variant name `<td>` (line 269):

```tsx
<td className="px-3 py-2 text-on-surface">{row.variantName}</td>
```

with:

```tsx
<td className="px-3 py-2 text-on-surface">
  <EntityNameLink
    kind="variant"
    id={row.variantId}
    productId={productId}
  >
    {row.variantName}
  </EntityNameLink>
</td>
```

- [ ] **Step 4: Wrap warehouse names in `VariantStockView`**

Replace the warehouse name `<td>` (line 124-127):

```tsx
<td className="px-3 py-2 text-on-surface">
  {level.warehouse_id
    ? (warehouseNames?.get(level.warehouse_id) ??
      level.warehouse_id)
    : '-'}
</td>
```

with:

```tsx
<td className="px-3 py-2 text-on-surface">
  {level.warehouse_id ? (
    <EntityNameLink kind="warehouse" id={level.warehouse_id}>
      {warehouseNames?.get(level.warehouse_id) ?? level.warehouse_id}
    </EntityNameLink>
  ) : (
    '-'
  )}
</td>
```

- [ ] **Step 5: Add the import**

In `src/components/entity/StockLevelsTable.tsx`, add:

```ts
import { EntityNameLink } from './EntityNameLink'
```

- [ ] **Step 6: Pass `productId` from `ProductModal`**

In `src/components/entity/ProductModal.tsx`, find the `<StockLevelsTable ... />` usage and add `productId={entityId}`.

- [ ] **Step 7: Run typecheck and tests**

Run: `pnpm run typecheck && pnpm run test:run`
Expected: passes.

- [ ] **Step 8: Commit**

```bash
git add src/components/entity/StockLevelsTable.tsx src/components/entity/ProductModal.tsx
git commit -m "feat(stock): make warehouse and variant names clickable"
```

---

## Task 4.5: Add parent product link in `VariantModal` details

**Files:**
- Modify: `src/components/entity/VariantModal.tsx`
- Modify: `locales/en.json`, `locales/ar.json`
- Modify: `src/components/entity/__tests__/VariantModal.test.tsx`

- [ ] **Step 1: Add the link above the details grid**

Inside the `details` tab render (around line 444, just before the `<div className="space-y-4">` block), add:

```tsx
{entity.product_id && (
  <div className="flex items-center gap-2 text-body-sm">
    <span className="text-on-surface-variant">
      {t('entity.variant.product')}:
    </span>
    <EntityNameLink kind="product" id={entity.product_id}>
      {entity.product_name ?? entity.product_id}
    </EntityNameLink>
  </div>
)}
```

`entity.product_id` comes from the variant query response. If `entity.product_name` is not in the binding, drop that field; the link still works because the click uses `entity.product_id`.

Verify in `src/lib/bindings.ts` (or wherever the `Variant` type lives) that `product_id` exists. If `product_name` is missing, replace the children with just `{entity.product_id}`.

- [ ] **Step 2: Add the i18n key**

In `locales/en.json`, add `entity.variant.product: "Product"` next to the other variant keys. Add the Arabic translation in `locales/ar.json`.

- [ ] **Step 3: Add the import**

In `src/components/entity/VariantModal.tsx`, add:

```ts
import { EntityNameLink } from './EntityNameLink'
```

- [ ] **Step 4: Add a test**

In `src/components/entity/__tests__/VariantModal.test.tsx`, add a test:

```tsx
  it('shows the parent product as a clickable link', async () => {
    vi.mocked(commands.variantsGetById).mockResolvedValue(
      mockOk({
        id: 'V1',
        product_id: 'P1',
        product_name: 'Widget',
        sku: 'SKU-1',
        variant_name: 'Red',
        uom_id: 'pcs',
        retail_price: 10,
        wholesale_price: 8,
        distribution_price: 6,
        created_at: null,
        updated_at: null,
        deleted_at: null,
      } as never)
    )
    vi.mocked(commands.warehousesGetAll).mockResolvedValue(mockOk([]))
    vi.mocked(commands.stockLevelsGetByVariant).mockResolvedValue(mockOk([]))
    vi.mocked(commands.stockMovementsGetByVariant).mockResolvedValue(mockOk([]))
    vi.mocked(commands.variantsGetByProductWithStock).mockResolvedValue(
      mockOk([])
    )

    renderModal()
    await waitFor(() => screen.getByRole('heading', { name: 'Red' }))
    const link = screen.getByRole('button', { name: 'Widget' })
    expect(link).toBeInTheDocument()
  })
```

- [ ] **Step 5: Run the tests**

Run: `pnpm run test:run src/components/entity/__tests__/VariantModal.test.tsx`
Expected: passes.

- [ ] **Step 6: Commit**

```bash
git add src/components/entity/VariantModal.tsx locales/en.json locales/ar.json src/components/entity/__tests__/VariantModal.test.tsx
git commit -m "feat(variant-modal): show clickable parent product in details"
```
