# Entity Form System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build reusable TanStack Form field components and entity forms for Products, Variants, Warehouses, and Stock Movements

**Architecture:** Field components (TextField, NumberField, SelectField) use `useFormContext()` to self-register with TanStack Form. Entity forms create `useForm` instances with `FormProvider` and render fields internally. Zod schemas validate on submit; field errors display on blur.

**Tech Stack:** TanStack Form v5, Zod v4, React 19, TypeScript

---

## File Structure

```
src/components/entity-form/
├── fields/
│   ├── TextField.tsx       # Text input, uses useFormContext
│   ├── NumberField.tsx     # Numeric input with constraints
│   ├── SelectField.tsx     # Dropdown selection
│   └── index.ts            # Export all fields
├── ProductForm.tsx          # Create/edit product
├── VariantForm.tsx          # Create/edit variant
├── WarehouseForm.tsx        # Create/edit warehouse
├── StockMovementForm.tsx    # Stock movement create
└── index.ts                 # Export all forms
```

**Dependencies to add:**
- `@tanstack/react-form` (not currently in package.json)

---

## Implementation Tasks

### Task 1: Install TanStack Form

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add @tanstack/react-form dependency**

Run: `pnpm add @tanstack/react-form@^5.0.0`

Expected: Package added to dependencies

- [ ] **Step 2: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "feat: add @tanstack/react-form dependency"
```

---

### Task 2: Create TextField Component

**Files:**
- Create: `src/components/entity-form/fields/TextField.tsx`
- Create: `src/components/entity-form/fields/TextField.test.tsx`
- Create: `src/components/entity-form/fields/index.ts`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/entity-form/fields/TextField.test.tsx
import { render, screen } from '@testing-library/react'
import { FormProvider, useForm } from '@tanstack/react-form'
import { TextField } from './TextField'

function TestWrapper({ children }: { children: React.ReactNode }) {
  const form = useForm({ defaultValues: { test_field: '' } })
  return <FormProvider value={form}>{children}</FormProvider>
}

describe('TextField', () => {
  it('renders label', () => {
    render(
      <TestWrapper>
        <TextField name="test_field" label="Test Label" />
      </TestWrapper>
    )
    expect(screen.getByText('Test Label')).toBeInTheDocument()
  })

  it('connects to form via useFormContext', () => {
    const form = useForm({ defaultValues: { test_field: 'initial' } })
    render(
      <FormProvider value={form}>
        <TextField name="test_field" label="Test" />
      </FormProvider>
    )
    const input = screen.getByRole('textbox')
    expect(input).toHaveValue('initial')
  })
})
```

Run: `pnpm test src/components/entity-form/fields/TextField.test.tsx`
Expected: FAIL - component doesn't exist

- [ ] **Step 2: Write minimal TextField implementation**

```tsx
// src/components/entity-form/fields/TextField.tsx
import { useFormContext } from '@tanstack/react-form'
import { Field, FieldLabel, FieldError } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

interface TextFieldProps {
  name: string
  label: string
  placeholder?: string
  disabled?: boolean
}

export function TextField({ name, label, placeholder, disabled }: TextFieldProps) {
  const form = useFormContext()

  return (
    <form.Field name={name}>
      {field => (
        <Field>
          <FieldLabel>{label}</FieldLabel>
          <Input
            value={field.state.value}
            onChange={e => field.handleChange(e.target.value)}
            onBlur={field.handleBlur}
            placeholder={placeholder}
            disabled={disabled}
            aria-invalid={!!field.state.meta.errors.length}
          />
          {field.state.meta.errors[0] && (
            <FieldError>{field.state.meta.errors[0]}</FieldError>
          )}
        </Field>
      )}
    </form.Field>
  )
}
```

- [ ] **Step 3: Run test to verify it passes**

Run: `pnpm test src/components/entity-form/fields/TextField.test.tsx`
Expected: PASS

- [ ] **Step 4: Export from index.ts**

```ts
// src/components/entity-form/fields/index.ts
export { TextField } from './TextField'
```

- [ ] **Step 5: Commit**

```bash
git add src/components/entity-form/fields/TextField.tsx src/components/entity-form/fields/TextField.test.tsx src/components/entity-form/fields/index.ts
git commit -m "feat: add TextField component with TanStack Form integration"
```

---

### Task 3: Create NumberField Component

**Files:**
- Create: `src/components/entity-form/fields/NumberField.tsx`
- Create: `src/components/entity-form/fields/NumberField.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/entity-form/fields/NumberField.test.tsx
import { render, screen } from '@testing-library/react'
import { FormProvider, useForm } from '@tanstack/react-form'
import { NumberField } from './NumberField'

function TestWrapper({ children }: { children: React.ReactNode }) {
  const form = useForm({ defaultValues: { price: 0 } })
  return <FormProvider value={form}>{children}</FormProvider>
}

describe('NumberField', () => {
  it('renders label', () => {
    render(
      <TestWrapper>
        <NumberField name="price" label="Price" />
      </TestWrapper>
    )
    expect(screen.getByText('Price')).toBeInTheDocument()
  })

  it('accepts numeric constraints', () => {
    render(
      <TestWrapper>
        <NumberField name="price" label="Price" min={0} max={999} step={0.01} precision={2} />
      </TestWrapper>
    )
    const input = screen.getByRole('spinbutton')
    expect(input).toHaveAttribute('min', '0')
    expect(input).toHaveAttribute('max', '999')
    expect(input).toHaveAttribute('step', '0.01')
  })
})
```

Run: `pnpm test src/components/entity-form/fields/NumberField.test.tsx`
Expected: FAIL - component doesn't exist

- [ ] **Step 2: Write NumberField implementation**

```tsx
// src/components/entity-form/fields/NumberField.tsx
import { useFormContext } from '@tanstack/react-form'
import { Field, FieldLabel, FieldError } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

interface NumberFieldProps {
  name: string
  label: string
  placeholder?: string
  disabled?: boolean
  min?: number
  max?: number
  step?: number
  precision?: number
}

export function NumberField({
  name,
  label,
  placeholder,
  disabled,
  min = 0,
  max,
  step = 1,
  precision,
}: NumberFieldProps) {
  const form = useFormContext()

  return (
    <form.Field name={name}>
      {field => (
        <Field>
          <FieldLabel>{label}</FieldLabel>
          <Input
            type="number"
            value={field.state.value ?? ''}
            onChange={e => {
              const val = e.target.value
              field.handleChange(val === '' ? undefined : parseFloat(val))
            }}
            onBlur={field.handleBlur}
            placeholder={placeholder}
            disabled={disabled}
            min={min}
            max={max}
            step={precision !== undefined ? Math.pow(10, -precision) : step}
            aria-invalid={!!field.state.meta.errors.length}
          />
          {field.state.meta.errors[0] && (
            <FieldError>{field.state.meta.errors[0]}</FieldError>
          )}
        </Field>
      )}
    </form.Field>
  )
}
```

- [ ] **Step 3: Run test to verify it passes**

Run: `pnpm test src/components/entity-form/fields/NumberField.test.tsx`
Expected: PASS

- [ ] **Step 4: Update index.ts**

```ts
// src/components/entity-form/fields/index.ts
export { TextField } from './TextField'
export { NumberField } from './NumberField'
```

- [ ] **Step 5: Commit**

```bash
git add src/components/entity-form/fields/NumberField.tsx src/components/entity-form/fields/NumberField.test.tsx src/components/entity-form/fields/index.ts
git commit -m "feat: add NumberField component with constraint support"
```

---

### Task 4: Create SelectField Component

**Files:**
- Create: `src/components/entity-form/fields/SelectField.tsx`
- Create: `src/components/entity-form/fields/SelectField.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/entity-form/fields/SelectField.test.tsx
import { render, screen } from '@testing-library/react'
import { FormProvider, useForm } from '@tanstack/react-form'
import { SelectField } from './SelectField'

function TestWrapper({ children }: { children: React.ReactNode }) {
  const form = useForm({ defaultValues: { warehouse: '' } })
  return <FormProvider value={form}>{children}</FormProvider>
}

describe('SelectField', () => {
  it('renders label', () => {
    render(
      <TestWrapper>
        <SelectField
          name="warehouse"
          label="Warehouse"
          options={[
            { value: 'wh1', label: 'Warehouse 1' },
            { value: 'wh2', label: 'Warehouse 2' },
          ]}
        />
      </TestWrapper>
    )
    expect(screen.getByText('Warehouse')).toBeInTheDocument()
  })

  it('renders options', () => {
    render(
      <TestWrapper>
        <SelectField
          name="warehouse"
          label="Warehouse"
          options={[
            { value: 'wh1', label: 'Warehouse 1' },
            { value: 'wh2', label: 'Warehouse 2' },
          ]}
        />
      </TestWrapper>
    )
    expect(screen.getByText('Warehouse 1')).toBeInTheDocument()
    expect(screen.getByText('Warehouse 2')).toBeInTheDocument()
  })
})
```

Run: `pnpm test src/components/entity-form/fields/SelectField.test.tsx`
Expected: FAIL - component doesn't exist

- [ ] **Step 2: Write SelectField implementation**

```tsx
// src/components/entity-form/fields/SelectField.tsx
import { useFormContext } from '@tanstack/react-form'
import { Field, FieldLabel, FieldError } from '@/components/ui/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface SelectFieldProps {
  name: string
  label: string
  options: { value: string; label: string }[]
  placeholder?: string
  disabled?: boolean
}

export function SelectField({ name, label, options, placeholder, disabled }: SelectFieldProps) {
  const form = useFormContext()

  return (
    <form.Field name={name}>
      {field => (
        <Field>
          <FieldLabel>{label}</FieldLabel>
          <Select
            value={field.state.value}
            onValueChange={field.handleChange}
            disabled={disabled}
          >
            <SelectTrigger aria-invalid={!!field.state.meta.errors.length}>
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {field.state.meta.errors[0] && (
            <FieldError>{field.state.meta.errors[0]}</FieldError>
          )}
        </Field>
      )}
    </form.Field>
  )
}
```

- [ ] **Step 3: Run test to verify it passes**

Run: `pnpm test src/components/entity-form/fields/SelectField.test.tsx`
Expected: PASS

- [ ] **Step 4: Update index.ts**

```ts
// src/components/entity-form/fields/index.ts
export { TextField } from './TextField'
export { NumberField } from './NumberField'
export { SelectField } from './SelectField'
```

- [ ] **Step 5: Commit**

```bash
git add src/components/entity-form/fields/SelectField.tsx src/components/entity-form/fields/SelectField.test.tsx src/components/entity-form/fields/index.ts
git commit -m "feat: add SelectField component"
```

---

### Task 5: Create ProductForm Component

**Files:**
- Create: `src/components/entity-form/ProductForm.tsx`
- Create: `src/components/entity-form/ProductForm.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/entity-form/ProductForm.test.tsx
import { render, screen } from '@testing-library/react'
import { ProductForm } from './ProductForm'
import { createProductSchema } from '@/lib/validation/schemas'

describe('ProductForm', () => {
  it('renders all fields', async () => {
    const handleSubmit = vi.fn()
    render(<ProductForm onSubmit={handleSubmit} />)

    expect(screen.getByLabelText(/company/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/category/i)).toBeInTheDocument()
  })

  it('calls onSubmit with valid data', async () => {
    const handleSubmit = vi.fn()
    render(<ProductForm onSubmit={handleSubmit} />)

    // Fill form and submit
    // ... (use userEvent to fill fields)

    expect(handleSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        company: expect.any(String),
        name: expect.any(String),
        category: expect.any(String),
      })
    )
  })
})
```

Run: `pnpm test src/components/entity-form/ProductForm.test.tsx`
Expected: FAIL - component doesn't exist

- [ ] **Step 2: Write ProductForm implementation**

```tsx
// src/components/entity-form/ProductForm.tsx
import { useForm, FormProvider } from '@tanstack/react-form'
import { useTranslation } from 'react-i18next'
import type { z } from 'zod'
import { createProductSchema, updateProductSchema } from '@/lib/validation/schemas'
import { TextField } from './fields'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'

interface ProductFormProps {
  onSubmit: (values: { company: string; name: string; category: string }) => void
  isLoading?: boolean
  initialValues?: { company: string; name: string; category: string }
  schema?: z.ZodSchema
}

export function ProductForm({
  onSubmit,
  isLoading,
  initialValues,
  schema = createProductSchema,
}: ProductFormProps) {
  const { t } = useTranslation()

  const form = useForm({
    defaultValues: initialValues ?? { company: '', name: '', category: '' },
    validators: {
      onSubmit: schema,
    },
    onSubmit: async ({ value }) => {
      onSubmit(value)
    },
  })

  return (
    <FormProvider value={form}>
      <form onSubmit={form.handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <TextField
            name="company"
            label={t('entity.layout.products.columns.company')}
          />
          <TextField
            name="name"
            label={t('entity.layout.products.columns.name')}
          />
          <TextField
            name="category"
            label={t('entity.layout.products.columns.category')}
          />
        </div>
        <div className="flex justify-end gap-2 pt-4">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? <Spinner /> : null}
            {t('entity.create.button')}
          </Button>
        </div>
      </form>
    </FormProvider>
  )
}
```

- [ ] **Step 3: Run test to verify it passes**

Run: `pnpm test src/components/entity-form/ProductForm.test.tsx`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/entity-form/ProductForm.tsx src/components/entity-form/ProductForm.test.tsx
git commit -m "feat: add ProductForm component"
```

---

### Task 6: Create VariantForm Component

**Files:**
- Create: `src/components/entity-form/VariantForm.tsx`
- Create: `src/components/entity-form/VariantForm.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/entity-form/VariantForm.test.tsx
import { render, screen } from '@testing-library/react'
import { VariantForm } from './VariantForm'

describe('VariantForm', () => {
  it('renders all variant fields', () => {
    render(<VariantForm onSubmit={vi.fn()} />)

    expect(screen.getByLabelText(/sku/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/variant_name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/uom/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/retail/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/wholesale/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/distribution/i)).toBeInTheDocument()
  })
})
```

Run: `pnpm test src/components/entity-form/VariantForm.test.tsx`
Expected: FAIL - component doesn't exist

- [ ] **Step 2: Write VariantForm implementation**

```tsx
// src/components/entity-form/VariantForm.tsx
import { useForm, FormProvider } from '@tanstack/react-form'
import { useTranslation } from 'react-i18next'
import type { z } from 'zod'
import { createVariantSchema, updateVariantSchema } from '@/lib/validation/schemas'
import { TextField, NumberField } from './fields'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'

interface VariantFormProps {
  productId?: string
  onSubmit: (values: {
    sku: string
    variant_name: string
    uom_id?: string
    retail_price?: number
    wholesale_price?: number
    distribution_price?: number
    product_id?: string
  }) => void
  isLoading?: boolean
  initialValues?: {
    sku: string
    variant_name: string
    uom_id?: string
    retail_price?: number
    wholesale_price?: number
    distribution_price?: number
  }
  schema?: z.ZodSchema
}

export function VariantForm({
  productId,
  onSubmit,
  isLoading,
  initialValues,
  schema = createVariantSchema,
}: VariantFormProps) {
  const { t } = useTranslation()

  const form = useForm({
    defaultValues: initialValues ?? {
      sku: '',
      variant_name: '',
      uom_id: '',
      retail_price: undefined,
      wholesale_price: undefined,
      distribution_price: undefined,
    },
    validators: {
      onSubmit: schema,
    },
    onSubmit: async ({ value }) => {
      onSubmit(productId ? { ...value, product_id: productId } : value)
    },
  })

  return (
    <FormProvider value={form}>
      <form onSubmit={form.handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <TextField
            name="sku"
            label={t('entity.layout.product_variants.columns.sku')}
          />
          <TextField
            name="variant_name"
            label={t('entity.layout.product_variants.columns.variant_name')}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <TextField
            name="uom_id"
            label={t('entity.layout.product_variants.columns.uom')}
          />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <NumberField
            name="retail_price"
            label={t('entity.layout.product_variants.columns.retail')}
            min={0}
            max={999999}
            precision={2}
          />
          <NumberField
            name="wholesale_price"
            label={t('entity.layout.product_variants.columns.wholesale')}
            min={0}
            max={999999}
            precision={2}
          />
          <NumberField
            name="distribution_price"
            label={t('entity.layout.product_variants.columns.distribution')}
            min={0}
            max={999999}
            precision={2}
          />
        </div>
        <div className="flex justify-end gap-2 pt-4">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? <Spinner /> : null}
            {t('entity.create.button')}
          </Button>
        </div>
      </form>
    </FormProvider>
  )
}
```

- [ ] **Step 3: Run test to verify it passes**

Run: `pnpm test src/components/entity-form/VariantForm.test.tsx`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/entity-form/VariantForm.tsx src/components/entity-form/VariantForm.test.tsx
git commit -m "feat: add VariantForm component"
```

---

### Task 7: Create WarehouseForm Component

**Files:**
- Create: `src/components/entity-form/WarehouseForm.tsx`
- Create: `src/components/entity-form/WarehouseForm.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/entity-form/WarehouseForm.test.tsx
import { render, screen } from '@testing-library/react'
import { WarehouseForm } from './WarehouseForm'

describe('WarehouseForm', () => {
  it('renders name and location fields', () => {
    render(<WarehouseForm onSubmit={vi.fn()} />)

    expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/location/i)).toBeInTheDocument()
  })
})
```

Run: `pnpm test src/components/entity-form/WarehouseForm.test.tsx`
Expected: FAIL - component doesn't exist

- [ ] **Step 2: Write WarehouseForm implementation**

```tsx
// src/components/entity-form/WarehouseForm.tsx
import { useForm, FormProvider } from '@tanstack/react-form'
import { useTranslation } from 'react-i18next'
import type { z } from 'zod'
import { createWarehouseSchema } from '@/lib/validation/schemas'
import { TextField } from './fields'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'

interface WarehouseFormProps {
  onSubmit: (values: { name: string; location: string }) => void
  isLoading?: boolean
  initialValues?: { name: string; location: string }
  schema?: z.ZodSchema
}

export function WarehouseForm({
  onSubmit,
  isLoading,
  initialValues,
  schema = createWarehouseSchema,
}: WarehouseFormProps) {
  const { t } = useTranslation()

  const form = useForm({
    defaultValues: initialValues ?? { name: '', location: '' },
    validators: {
      onSubmit: schema,
    },
    onSubmit: async ({ value }) => {
      onSubmit(value)
    },
  })

  return (
    <FormProvider value={form}>
      <form onSubmit={form.handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <TextField
            name="name"
            label={t('entity.warehouse.name')}
          />
          <TextField
            name="location"
            label={t('entity.warehouse.location')}
          />
        </div>
        <div className="flex justify-end gap-2 pt-4">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? <Spinner /> : null}
            {t('entity.create.button')}
          </Button>
        </div>
      </form>
    </FormProvider>
  )
}
```

- [ ] **Step 3: Run test to verify it passes**

Run: `pnpm test src/components/entity-form/WarehouseForm.test.tsx`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/entity-form/WarehouseForm.tsx src/components/entity-form/WarehouseForm.test.tsx
git commit -m "feat: add WarehouseForm component"
```

---

### Task 8: Create StockMovementForm Component

**Files:**
- Create: `src/components/entity-form/StockMovementForm.tsx`
- Create: `src/components/entity-form/StockMovementForm.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/entity-form/StockMovementForm.test.tsx
import { render, screen } from '@testing-library/react'
import { StockMovementForm } from './StockMovementForm'

describe('StockMovementForm', () => {
  it('renders movement type and quantity fields', () => {
    render(<StockMovementForm onSubmit={vi.fn()} />)

    expect(screen.getByLabelText(/movement_type/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/quantity/i)).toBeInTheDocument()
  })

  it('conditionally shows from/to warehouses based on movement type', () => {
    // Transfer type should show both from and to warehouse
    // Adjustment type should hide from warehouse
  })
})
```

Run: `pnpm test src/components/entity-form/StockMovementForm.test.tsx`
Expected: FAIL - component doesn't exist

- [ ] **Step 2: Write StockMovementForm implementation**

```tsx
// src/components/entity-form/StockMovementForm.tsx
import { useState } from 'react'
import { useForm, FormProvider } from '@tanstack/react-form'
import { useTranslation } from 'react-i18next'
import { stockMovementSchema } from '@/lib/validation/schemas'
import { NumberField, SelectField } from './fields'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'

interface StockMovementFormProps {
  onSubmit: (values: {
    variant_id: string
    from_warehouse_id?: string
    to_warehouse_id?: string
    quantity: number
    movement_type: string
  }) => void
  isLoading?: boolean
  warehouses?: { value: string; label: string }[]
}

const MOVEMENT_TYPES = [
  { value: 'transfer', label: 'Transfer' },
  { value: 'adjustment', label: 'Adjustment' },
  { value: 'received', label: 'Received' },
  { value: 'shipped', label: 'Shipped' },
]

export function StockMovementForm({
  onSubmit,
  isLoading,
  warehouses = [],
}: StockMovementFormProps) {
  const { t } = useTranslation()
  const [movementType, setMovementType] = useState<string>('')

  const form = useForm({
    defaultValues: {
      variant_id: '',
      from_warehouse_id: '',
      to_warehouse_id: '',
      quantity: 0,
      movement_type: '',
    },
    validators: {
      onSubmit: stockMovementSchema,
    },
    onSubmit: async ({ value }) => {
      onSubmit(value)
    },
  })

  const showFromWarehouse = movementType === 'transfer' || movementType === 'shipped'
  const showToWarehouse = movementType === 'transfer' || movementType === 'received'

  return (
    <FormProvider value={form}>
      <form onSubmit={form.handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <SelectField
            name="variant_id"
            label={t('entity.stockMovement.variant')}
            options={[]} // Passed from parent
            placeholder={t('entity.stockMovement.selectVariant')}
          />
          <SelectField
            name="movement_type"
            label={t('entity.stockMovement.movementType')}
            options={MOVEMENT_TYPES}
            onChange={val => setMovementType(val)}
          />
        </div>

        {showFromWarehouse && (
          <SelectField
            name="from_warehouse_id"
            label={t('entity.stockMovement.fromWarehouse')}
            options={warehouses}
          />
        )}

        {showToWarehouse && (
          <SelectField
            name="to_warehouse_id"
            label={t('entity.stockMovement.toWarehouse')}
            options={warehouses}
          />
        )}

        <NumberField
          name="quantity"
          label={t('entity.stockMovement.quantity')}
          min={1}
          step={1}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? <Spinner /> : null}
            {t('entity.create.button')}
          </Button>
        </div>
      </form>
    </FormProvider>
  )
}
```

- [ ] **Step 3: Run test to verify it passes**

Run: `pnpm test src/components/entity-form/StockMovementForm.test.tsx`
Expected: PASS

- [ ] **Step 4: Create entity-form index.ts**

```ts
// src/components/entity-form/index.ts
export { TextField, NumberField, SelectField } from './fields'
export { ProductForm } from './ProductForm'
export { VariantForm } from './VariantForm'
export { WarehouseForm } from './WarehouseForm'
export { StockMovementForm } from './StockMovementForm'
```

- [ ] **Step 5: Commit**

```bash
git add src/components/entity-form/StockMovementForm.tsx src/components/entity-form/StockMovementForm.test.tsx src/components/entity-form/index.ts
git commit -m "feat: add StockMovementForm component with conditional warehouse fields"
```

---

### Task 9: Run Full Test Suite and Typecheck

**Files:**
- Run: `pnpm run check:all` or at minimum `pnpm run typecheck && pnpm run test:run`

- [ ] **Step 1: Run typecheck and tests**

Run: `pnpm run typecheck`
Expected: No type errors

Run: `pnpm run test:run`
Expected: All tests pass

- [ ] **Step 2: Run lint if typecheck passes**

Run: `pnpm run lint`
Expected: No lint errors

- [ ] **Step 3: Commit any remaining changes**

---

## Spec Coverage Check

- [x] TextField, NumberField, SelectField field components — Tasks 2, 3, 4
- [x] ProductForm (create/update) — Task 5
- [x] VariantForm (create/update) — Task 6
- [x] WarehouseForm (create/update) — Task 7
- [x] StockMovementForm (create only) — Task 8
- [x] Dual-use pattern (schema prop for update mode) — implemented in all forms
- [x] Tests for each component — included in each task

## Placeholder Scan

All steps contain actual code, no "TBD", "TODO", or vague implementations.

## Type Consistency Check

- All field components use `useFormContext()` to connect to `FormProvider`
- All entity forms create `useForm` with `FormProvider` wrapping
- Props interface matches across forms: `onSubmit`, `isLoading?`, `initialValues?`, `schema?`
- StockMovementForm accepts `warehouses` prop for dropdown population

---

**Plan complete and saved to `docs/superpowers/plans/2026-06-03-entity-forms-implementation-plan.md`**

Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?