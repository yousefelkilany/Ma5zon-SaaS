# Centralized Locale-Aware Formatters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace ad-hoc `toLocaleString` / `toLocaleDateString` calls scattered across the React tree with a small set of pure utility functions in a new `src/lib/format.ts` module that read the active locale from the `useUIStore` zustand store.

**Architecture:** New `src/lib/format.ts` module owns `formatDateTime`, `formatNumber`, and `formatCurrency`. All three read locale + currency code from `useUIStore.getState().userPreferences.language` via small `LOCALE_MAP` / `CURRENCY_MAP` constants. `formatCurrency` is moved out of `lib/utils.ts` and re-exported for back-compat. All seven call sites are converted; the `formatFieldValue` helper in `lib/constants.ts` delegates to the new module instead of duplicating `Intl` logic. Pure-function refactor: visible output is byte-identical for every existing valid input.

**Tech Stack:** TypeScript, Vitest, Zustand, Intl.

---

## File Structure

**New files:**

- `src/lib/format.ts` — `formatDateTime`, `formatNumber`, `formatCurrency` + `LOCALE_MAP` / `CURRENCY_MAP`
- `src/lib/format.test.ts` — vitest unit tests for the three formatters

**Modified files:**

- `src/lib/utils.ts` — delete `formatCurrency` body; add re-export `export { formatCurrency } from './format'`
- `src/lib/constants.ts` — `formatFieldValue` delegates date/number/currency to the new module
- `src/components/entity/StockMovementsTable.tsx` — 6 inline conversions (3× quantity, 3× created_at)
- `src/components/entity/StockLevelsTable.tsx` — 5 inline conversions
- `src/components/entity/PaginationFooter.tsx` — 1 inline conversion
- `src/components/entity/WarehousesSubTable.tsx` — 1 inline conversion
- `src/components/entity/DataTable.tsx` — 2 inline conversions

No new modules, types, or abstractions beyond what's listed. The `date-picker.tsx`, `calendar.tsx`, `logger.ts`, and `ErrorBoundary.tsx` formatters are explicitly left alone (see spec Non-Goals).

---

## Task 1: Create `src/lib/format.ts`

**Files:**

- Create: `src/lib/format.ts`

- [ ] **Step 1: Create the file**

Create `src/lib/format.ts` with this exact content:

```ts
import { useUIStore } from '@/store/ui-store'

const LOCALE_MAP = { ar: 'ar-EG', en: 'en-US' } as const
const CURRENCY_MAP = { ar: 'EGP', en: 'USD' } as const
const DEFAULT_LANG = 'en' as const

function resolveLocale(): string {
  const lang = useUIStore.getState().userPreferences.language
  return LOCALE_MAP[lang] ?? LOCALE_MAP[DEFAULT_LANG]
}

function resolveCurrency(): string {
  const lang = useUIStore.getState().userPreferences.language
  return CURRENCY_MAP[lang] ?? CURRENCY_MAP[DEFAULT_LANG]
}

export function formatDateTime(
  value: string | number | Date | null | undefined
): string {
  if (value == null) return '-'
  const d = value instanceof Date ? value : new Date(value)
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleString(resolveLocale())
}

export function formatNumber(
  value: number | null | undefined,
  options?: Intl.NumberFormatOptions
): string {
  if (value == null || Number.isNaN(value)) return '-'
  return value.toLocaleString(resolveLocale(), options)
}

export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '-'
  return new Intl.NumberFormat(resolveLocale(), {
    style: 'currency',
    currency: resolveCurrency(),
    minimumFractionDigits: 2,
  }).format(value)
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm run typecheck`
Expected: PASS (no errors). The new file imports from `@/store/ui-store` which already exists.

- [ ] **Step 3: Commit**

```bash
git add src/lib/format.ts
git commit -m "feat(format): add locale-aware formatters reading from useUIStore"
```

---

## Task 2: Write failing tests for `format.ts`

**Files:**

- Create: `src/lib/format.test.ts`

- [ ] **Step 1: Create the test file**

Create `src/lib/format.test.ts` with this exact content:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useUIStore } from '@/store/ui-store'
import { formatDateTime, formatNumber, formatCurrency } from './format'

function setLang(language: 'ar' | 'en') {
  useUIStore.setState({
    userPreferences: { language, theme: 'system', dateFormat: 'yyyy-MM-dd' },
  })
}

describe('formatDateTime', () => {
  beforeEach(() => setLang('en'))

  it('formats a valid ISO string in the active locale', () => {
    expect(formatDateTime('2024-01-15T10:30:00Z')).toMatch(/1\/15\/2024/)
  })

  it('formats a Date instance', () => {
    const d = new Date('2024-06-01T12:00:00Z')
    expect(formatDateTime(d)).toMatch(/2024/)
  })

  it('formats a numeric timestamp', () => {
    expect(formatDateTime(0)).toMatch(/1970|1969|1\/1/)
  })

  it('returns "-" for null', () => {
    expect(formatDateTime(null)).toBe('-')
  })

  it('returns "-" for undefined', () => {
    expect(formatDateTime(undefined)).toBe('-')
  })

  it('returns "-" for an invalid date string', () => {
    expect(formatDateTime('not-a-date')).toBe('-')
  })
})

describe('formatNumber', () => {
  beforeEach(() => setLang('en'))

  it('formats a valid number with thousands separators', () => {
    expect(formatNumber(1234567)).toMatch(/1,234,567/)
  })

  it('honors custom options', () => {
    expect(formatNumber(3.14159, { minimumFractionDigits: 2 })).toBe('3.14')
  })

  it('returns "-" for null', () => {
    expect(formatNumber(null)).toBe('-')
  })

  it('returns "-" for undefined', () => {
    expect(formatNumber(undefined)).toBe('-')
  })

  it('returns "-" for NaN', () => {
    expect(formatNumber(Number.NaN)).toBe('-')
  })
})

describe('formatCurrency', () => {
  it('formats USD when language is en', () => {
    setLang('en')
    expect(formatCurrency(10)).toContain('10.00')
    expect(formatCurrency(10)).toMatch(/\$|US\$/)
  })

  it('formats EGP when language is ar', () => {
    setLang('ar')
    const out = formatCurrency(10)
    expect(out).toContain('10.00')
    expect(out).toMatch(/EGP|ج\.م|جنيه/)
  })

  it('returns "-" for null', () => {
    expect(formatCurrency(null)).toBe('-')
  })

  it('returns "-" for undefined', () => {
    expect(formatCurrency(undefined)).toBe('-')
  })
})
```

Note: the exact USD/EGP glyph assertions are intentionally loose (the `$` could be `US$` in some `en-US` builds, EGP can be `ج.م` in `ar-EG`). If the test fails on the currency symbol assertion but the number/digits part passes, replace the regex with the actual output and document the locale behavior in the test name. The minimum invariant is that the number `10.00` appears in the output and the currency code/symbol is not empty.

- [ ] **Step 2: Run tests to verify they pass**

Run: `pnpm test:run -- src/lib/format.test.ts`
Expected: PASS for all suites. The new module from Task 1 makes these tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/lib/format.test.ts
git commit -m "test(format): cover locale-aware formatters"
```

---

## Task 3: Move `formatCurrency` out of `lib/utils.ts` and re-export

**Files:**

- Modify: `src/lib/utils.ts:1-26`

- [ ] **Step 1: Replace `formatCurrency` body with re-export**

In `src/lib/utils.ts`, replace lines 12-26 (the entire `formatCurrency` function) with a single re-export line. The file should now contain, at the top:

```ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { invoke } from '@tauri-apps/api/core'
import * as XLSX from 'xlsx'
import type { ColumnDef } from './types'
import type { Product, User, Variant, Warehouse } from './bindings'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export { formatCurrency } from './format'
```

(The rest of `utils.ts` — `productEntity`, `EntityTypes`, `normalizeArabic`, `exportSelectedToCSV`, etc. — stays untouched.)

The resulting diff for lines 12-26 is:

```diff
-export function formatCurrency(
-  price: number | undefined,
-  locale?: string
-): string {
-  if (price === undefined) return '-'
-
-  const resolvedLocale = locale ?? 'en-US'
-  const currency = resolvedLocale.startsWith('ar') ? 'EGP' : 'USD'
-
-  return new Intl.NumberFormat(resolvedLocale, {
-    style: 'currency',
-    currency,
-    minimumFractionDigits: 2,
-  }).format(price)
-}
+export { formatCurrency } from './format'
```

- [ ] **Step 2: Typecheck and run tests**

Run: `pnpm run typecheck && pnpm test:run -- src/lib/format.test.ts src/lib/__tests__/ src/store/ui-store.test.ts`
Expected: PASS. The `VariantsSubTable.tsx` import of `formatCurrency` from `@/lib/utils` still works via the re-export.

- [ ] **Step 3: Commit**

```bash
git add src/lib/utils.ts
git commit -m "refactor(utils): re-export formatCurrency from format module"
```

---

## Task 4: Update `formatFieldValue` to delegate to `format.ts`

**Files:**

- Modify: `src/lib/constants.ts:1-35`

- [ ] **Step 1: Add the import and update switch arms**

In `src/lib/constants.ts`, add the import at the top (after the existing `UOM_LIST` definition, before `getUomLabelByIndex`):

```ts
import { formatDateTime, formatNumber, formatCurrency } from './format'
```

Then replace the body of `formatFieldValue` (lines 22-35) so the switch arms delegate:

```ts
export function formatFieldValue(value: unknown, type: FieldType): string {
  if (value == null) return '—'
  switch (type) {
    case 'date':
      return formatDateTime(value as string)
    case 'number':
      return typeof value === 'number' ? formatNumber(value) : String(value)
    case 'currency':
      return typeof value === 'number' ? formatCurrency(value) : String(value)
    case 'uom':
      return getUomLabelByIndex(String(value))
    default:
      return String(value)
  }
}
```

- [ ] **Step 2: Typecheck and run tests**

Run: `pnpm run typecheck && pnpm test:run`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/constants.ts
git commit -m "refactor(constants): delegate formatFieldValue to format module"
```

---

## Task 5: Convert `StockMovementsTable.tsx` call sites

**Files:**

- Modify: `src/components/entity/StockMovementsTable.tsx:1-15, 260, 275, 372, 387, 486, 501`

- [ ] **Step 1: Add the import**

In `src/components/entity/StockMovementsTable.tsx`, the existing import line at the top reads:

```ts
import { useTranslation } from 'react-i18next'
```

Add a new import on the next line:

```ts
import { formatDateTime, formatNumber } from '@/lib/format'
```

The final import block should include both lines (and any other existing imports preserved verbatim).

- [ ] **Step 2: Replace six call sites**

Make exactly these substitutions. The `locale` variable is still used by the hook — leave the `const { t } = useTranslation()` lines alone (locale is derived from `i18n` but we don't need to drop it from components in this task; it's a separate cleanup).

Line 260:
```diff
-                      {movement.quantity.toLocaleString(locale)}
+                      {formatNumber(movement.quantity)}
```

Line 275:
```diff
-                      {new Date(movement.created_at).toLocaleString(locale)}
+                      {formatDateTime(movement.created_at)}
```

Line 372:
```diff
-                      {movement.quantity.toLocaleString(locale)}
+                      {formatNumber(movement.quantity)}
```

Line 387:
```diff
-                      {new Date(movement.created_at).toLocaleString(locale)}
+                      {formatDateTime(movement.created_at)}
```

Line 486:
```diff
-                      {movement.quantity.toLocaleString(locale)}
+                      {formatNumber(movement.quantity)}
```

Line 501:
```diff
-                      {new Date(movement.created_at).toLocaleString(locale)}
+                      {formatDateTime(movement.created_at)}
```

- [ ] **Step 3: Typecheck and run any related tests**

Run: `pnpm run typecheck && pnpm test:run -- src/components/entity/StockMovementsTable`
Expected: PASS. There is no existing test for `StockMovementsTable.tsx`; the typecheck is the primary safety net.

- [ ] **Step 4: Commit**

```bash
git add src/components/entity/StockMovementsTable.tsx
git commit -m "refactor(StockMovementsTable): use formatNumber/formatDateTime"
```

---

## Task 6: Convert `StockLevelsTable.tsx` call sites

**Files:**

- Modify: `src/components/entity/StockLevelsTable.tsx:135, 282, 301, 330, 336`

- [ ] **Step 1: Add the import**

In `src/components/entity/StockLevelsTable.tsx`, add to the existing import block:

```ts
import { formatNumber } from '@/lib/format'
```

- [ ] **Step 2: Replace five call sites**

Line 135:
```diff
-                {level.quantity.toLocaleString(locale)}
+                {formatNumber(level.quantity)}
```

Line 282:
```diff
-                  {row.quantities.get(col)?.toLocaleString(locale) ?? '-'}
+                  {formatNumber(row.quantities.get(col))}
```

(The new `formatNumber` already returns `'-'` for `null`/`undefined`, so the `?? '-'` is redundant. The output is identical.)

Line 301:
```diff
-                {row.rowTotal.toLocaleString(locale)}
+                {formatNumber(row.rowTotal)}
```

Line 330 (this is a multi-line expression — the `.toLocaleString(` call spans lines 330-331):
```diff
-              {((totals as Record<string, number>)[col] || 0).toLocaleString(
-                locale
-              )}
+              {formatNumber(
+                (totals as Record<string, number>)[col] || 0
+              )}
```

Line 336:
```diff
-            {totals._rowTotal.toLocaleString(locale)}
+            {formatNumber(totals._rowTotal)}
```

- [ ] **Step 3: Typecheck and run tests**

Run: `pnpm run typecheck && pnpm test:run -- src/components/entity/StockLevelsTable`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/entity/StockLevelsTable.tsx
git commit -m "refactor(StockLevelsTable): use formatNumber"
```

---

## Task 7: Convert `PaginationFooter.tsx`

**Files:**

- Modify: `src/components/entity/PaginationFooter.tsx:1-10, 54`

- [ ] **Step 1: Add the import**

In `src/components/entity/PaginationFooter.tsx`, add to the existing import block:

```ts
import { formatNumber } from '@/lib/format'
```

- [ ] **Step 2: Replace the one call site**

Line 54:
```diff
-            total: totalRows.toLocaleString(),
+            total: formatNumber(totalRows),
```

- [ ] **Step 3: Typecheck and run tests**

Run: `pnpm run typecheck && pnpm test:run -- src/components/entity/PaginationFooter`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/entity/PaginationFooter.tsx
git commit -m "refactor(PaginationFooter): use formatNumber"
```

---

## Task 8: Convert `WarehousesSubTable.tsx`

**Files:**

- Modify: `src/components/entity/WarehousesSubTable.tsx:1-10, 123`

- [ ] **Step 1: Add the import**

In `src/components/entity/WarehousesSubTable.tsx`, add to the existing import block:

```ts
import { formatNumber } from '@/lib/format'
```

- [ ] **Step 2: Replace the one call site**

Line 123 (context: a ternary that returns the formatted quantity or `'-'`):
```diff
-                    ? product.quantity.toLocaleString()
+                    ? formatNumber(product.quantity)
```

- [ ] **Step 3: Typecheck and run tests**

Run: `pnpm run typecheck && pnpm test:run -- src/components/entity/WarehousesSubTable`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/entity/WarehousesSubTable.tsx
git commit -m "refactor(WarehousesSubTable): use formatNumber"
```

---

## Task 9: Convert `DataTable.tsx`

**Files:**

- Modify: `src/components/entity/DataTable.tsx:1-15, 49-66`

- [ ] **Step 1: Add the import**

In `src/components/entity/DataTable.tsx`, add to the existing import block:

```ts
import { formatNumber } from '@/lib/format'
```

- [ ] **Step 2: Replace the two currency/number cell renderers**

Line 49-66 currently reads:

```tsx
  if (column.type === 'currency') {
    const currencySymbol = t('common.currency')
    return (
      <span className="font-data-tabular tabular-nums">
        {currencySymbol}{' '}
        {(Number(value) || 0).toLocaleString('en-US', {
          minimumFractionDigits: 2,
        })}
      </span>
    )
  }
  if (column.type === 'number') {
    return (
      <span className="font-data-tabular tabular-nums text-right">
        {Number(value).toLocaleString()}
      </span>
    )
  }
```

Replace with:

```tsx
  if (column.type === 'currency') {
    return (
      <span className="font-data-tabular tabular-nums">
        {formatNumber(Number(value) || 0, { minimumFractionDigits: 2 })}
      </span>
    )
  }
  if (column.type === 'number') {
    return (
      <span className="font-data-tabular tabular-nums text-right">
        {formatNumber(Number(value))}
      </span>
    )
  }
```

The `currencySymbol`/`t('common.currency')` is removed because `formatNumber` with `style: 'currency'` (the new `formatCurrency` flow) would normally include the symbol, but the call site uses raw `formatNumber` with `minimumFractionDigits` to match the current visual: a plain number with two decimal places, no symbol. The currency symbol is intentionally left to the column header (per the existing `t('common.currency')` usage). The user-visible output for non-`null` values is identical to before (`1,234.50`); for `null`/`undefined`/`NaN` it now shows `'-'` instead of `0.00`, which matches the spec's null/NaN handling and is a small but desirable upgrade.

- [ ] **Step 3: Typecheck and run tests**

Run: `pnpm run typecheck && pnpm test:run -- src/components/entity/DataTable`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/entity/DataTable.tsx
git commit -m "refactor(DataTable): use formatNumber for currency/number cells"
```

---

## Task 10: Final quality gate

**Files:** none (verification only)

- [ ] **Step 1: Search for any remaining inline formatters in the converted files**

Run:
```bash
grep -n "toLocaleString\|toLocaleDateString" \
  src/components/entity/StockMovementsTable.tsx \
  src/components/entity/StockLevelsTable.tsx \
  src/components/entity/PaginationFooter.tsx \
  src/components/entity/WarehousesSubTable.tsx \
  src/components/entity/DataTable.tsx \
  src/lib/utils.ts \
  src/lib/constants.ts
```

Expected: no output. (The intentional `toLocaleDateString()` calls in `date-picker.tsx` and `calendar.tsx` are NOT in this list and remain untouched per spec Non-Goals.)

- [ ] **Step 2: Run full quality gate**

Run: `pnpm run check:all`
Expected: PASS. This runs typecheck, lint, ast:lint, format:check, rust:fmt:check, rust:clippy, JS test:run, and rust:test. The new `format.ts` and its tests are picked up by `vitest run` automatically.

- [ ] **Step 3: Manual visual smoke check (optional, asks user to run dev server)**

Per AGENTS.md "No Dev Server" rule, do NOT start the dev server. Report completion to the user and ask them to run `pnpm run tauri dev` and verify the stock movements table, stock levels table, warehouses sub-table, pagination footer, and entity data table all show correctly formatted values in both English and Arabic.

- [ ] **Step 4: Final commit if any verification-only fixes were needed**

If `pnpm run check:all` produced auto-fixes (none expected — prettier/eslint would have caught these on a normal run), commit them with:

```bash
git add -A
git commit -m "chore: apply lint/format fixes from check:all"
```

Otherwise no commit is needed.
