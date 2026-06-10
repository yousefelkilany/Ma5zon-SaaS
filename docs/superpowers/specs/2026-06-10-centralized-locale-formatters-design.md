# Centralized Locale-Aware Formatters

## Status

- Draft
- Date: 2026-06-10

## Overview

Replace the ad-hoc in-place `toLocaleString` / `toLocaleDateString` calls scattered across the React tree with a small set of pure utility functions in a new `src/lib/format.ts` module. The functions read the active locale from the `useUIStore` zustand store (the same source of truth that `i18n.changeLanguage` is driven from) and centralize the EGP/USD currency mapping that currently lives in `formatCurrency`. This eliminates duplicated `Intl` plumbing, ensures the same locale is used everywhere, and gives us a single place to fix formatting bugs.

## Motivation

A scan of the React tree turned up at least six different in-place formatting idioms, all of which hand-roll locale handling or hard-code `'en-US'`:

1. `new Date(x).toLocaleString(locale)` in `StockMovementsTable.tsx` (3×)
2. `n.toLocaleString(locale)` for quantities/totals in `StockMovementsTable.tsx` (3×), `StockLevelsTable.tsx` (5×), `PaginationFooter.tsx` (1×)
3. `n.toLocaleString()` with no locale in `WarehousesSubTable.tsx` (1×) and `lib/constants.ts:formatFieldValue` (1×)
4. `(Number(value) || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })` in `DataTable.tsx:54`
5. `n.toLocaleString()` in `lib/constants.ts:formatFieldValue` for `number`/`currency` cases
6. `formatCurrency` in `lib/utils.ts:12` that takes an optional `locale?` param, defaults to `'en-US'`, and maps locale → currency

Problems:

- **Locale inconsistency.** `DataTable.tsx:54` always uses `'en-US'` regardless of the active language. `WarehousesSubTable.tsx:123` uses the browser default. Everywhere else uses the i18n locale. Three different behaviors in one app.
- **Duplicated EGP/USD mapping.** The `locale.startsWith('ar')` → `'EGP'` rule exists in exactly one place (`formatCurrency`); if we ever localize the currency picker or add a new currency, we have to remember to update it. The current `DataTable.tsx:54` cell renderer separately pulls a currency symbol from `t('common.currency')` and ignores the symbol that `Intl.NumberFormat` would produce — this is exactly the kind of duplication the new module eliminates.
- **Locale plumbing is noisy.** Every component that formats a value has to grab `locale` from `useTranslation()` and pass it through. Components that don't currently need `useTranslation` (e.g. `PaginationFooter`, `WarehousesSubTable`) either skip it or have to add the hook just for this.
- **No null/NaN handling.** `toLocaleString()` on `undefined` produces `"undefined"` rather than `'-'`. `new Date('garbage').toLocaleString()` produces `"Invalid Date"`. Centralized utilities can fix this once.

## Goals

- A single `src/lib/format.ts` module owns all user-facing value formatting.
- All three formatters (`formatDateTime`, `formatNumber`, `formatCurrency`) read the active locale from `useUIStore.getState().userPreferences.language` and the EGP/USD currency mapping from the same module.
- `formatCurrency` is moved out of `lib/utils.ts` (and re-exported from there for back-compat if needed by external imports) so all three formatters live together.
- All seven identified call sites are converted to use the new functions; the `locale` plumbing and hard-coded `'en-US'` strings are gone.
- Null, undefined, and `NaN` inputs return `'-'` consistently.
- `formatFieldValue` in `lib/constants.ts` delegates to the new functions instead of duplicating `Intl` logic.
- Pure-function refactor: visible output is unchanged for every existing input value.

## Non-Goals

- No new formatting features (no relative time, no number abbreviations, no per-cell currency overrides). Out of scope.
- No changes to `date-picker.tsx` and `calendar.tsx`. They render a `Date` object the user just selected — locale choice is irrelevant and `toLocaleDateString()` without args is correct there.
- No changes to the `toISOString()` calls in `logger.ts` and `ErrorBoundary.tsx`. Those are machine timestamps, not user-facing.
- No change to the i18n sync flow (`AppInitializer`, `AppearancePane`, `SettingsPopover` keep calling `i18n.changeLanguage` from the store). The store is the source of truth; i18n is kept in sync with it.
- No date-fns / dayjs / luxon dependency. Stick with `Intl`.

## Design

### New module: `src/lib/format.ts`

```ts
import { useUIStore } from '@/store/ui-store'

const LOCALE_MAP = { ar: 'ar-EG', en: 'en-US' } as const
const CURRENCY_MAP = { ar: 'EGP', en: 'USD' } as const

function resolveLocale(): string {
  const lang = useUIStore.getState().userPreferences.language
  return LOCALE_MAP[lang] ?? LOCALE_MAP.en
}

function resolveCurrency(): string {
  const lang = useUIStore.getState().userPreferences.language
  return CURRENCY_MAP[lang] ?? CURRENCY_MAP.en
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

Notes:

- `useUIStore.getState()` is used (not the hook) so the formatters are usable outside React (CSV/Excel export already uses `invoke` from this same `utils.ts` context). Components re-render normally because the call site re-runs the formatter on each render and Zustand updates trigger re-render of subscribed components.
- `formatCurrency` signature changes: drops the `locale?: string` parameter. The single existing call site (`VariantsSubTable.tsx:112`) does not pass a locale, so this is a no-op for it. Verified via `grep -rn "formatCurrency(" src --include="*.tsx" --include="*.ts"`.
- The `LOCALE_MAP` is small enough that inlining `'ar-EG'` / `'en-US'` in `Intl.NumberFormat` calls is feasible, but centralizing the mapping keeps the "where do we change locale strings" answer in one file.
- Default `language` in the store is `'ar'` (`ui-store.ts:73`), so even on first paint before the store is hydrated, the resolved locale is well-defined.

### Re-exports for back-compat

`lib/utils.ts` re-exports `formatCurrency` from `format.ts` so any future import of `formatCurrency` from `@/lib/utils` continues to work. The original `formatCurrency` body is deleted from `utils.ts` to avoid a second copy.

### `formatFieldValue` simplification

`lib/constants.ts:formatFieldValue` currently contains its own copy of the `Intl` plumbing for `date`, `number`, and `currency` cases. After this change, the switch arms delegate to the new functions:

```ts
case 'date':     return formatDateTime(value as string)
case 'number':   return typeof value === 'number' ? formatNumber(value) : String(value)
case 'currency': return typeof value === 'number' ? formatCurrency(value) : String(value)
```

The `uom` and `text` arms are unchanged.

### Call-site conversions

| File | Lines | Before | After |
|---|---|---|---|
| `StockMovementsTable.tsx` | 260, 372, 486 | `movement.quantity.toLocaleString(locale)` | `formatNumber(movement.quantity)` |
| `StockMovementsTable.tsx` | 275, 387, 501 | `new Date(movement.created_at).toLocaleString(locale)` | `formatDateTime(movement.created_at)` |
| `StockLevelsTable.tsx` | 135, 282, 301, 330, 336 | `n.toLocaleString(locale)` / `((totals as Record<string, number>)[col] \|\| 0).toLocaleString(locale)` / `row.quantities.get(col)?.toLocaleString(locale) ?? '-'` | `formatNumber(...)` (line 282 keeps the existing `?? '-'` since `formatNumber` returns `'-'` for `null`/`undefined`, but the call site can simplify to `formatNumber(row.quantities.get(col) ?? NaN)` if desired — both produce the same output) |
| `PaginationFooter.tsx` | 54 | `totalRows.toLocaleString()` | `formatNumber(totalRows)` |
| `WarehousesSubTable.tsx` | 123 | `product.quantity.toLocaleString()` | `formatNumber(product.quantity)` |
| `DataTable.tsx` | 54 | `(Number(value) || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })` | `formatNumber(Number(value) \|\| 0, { minimumFractionDigits: 2 })` |
| `DataTable.tsx` | 63 | `Number(value).toLocaleString()` | `formatNumber(Number(value))` |
| `lib/utils.ts` | 12-26 | `formatCurrency` body | moved to `format.ts`; `utils.ts` re-exports |
| `lib/constants.ts` | 22-35 | inline `Intl` calls in `formatFieldValue` | delegate to `formatDateTime` / `formatNumber` / `formatCurrency` |

All call sites that previously passed `locale` from `useTranslation()` drop the parameter from the call. Components that used `useTranslation` solely for `locale` and have no other use of `t` can keep the hook (and the unused `locale` variable) for now — removing it is a separate, out-of-scope cleanup. (Verified during scan: every component using `locale` also uses `t`.)

### Error handling

- `null` / `undefined` input → `'-'`
- Invalid date string (`new Date('foo')`) → `'-'`
- `NaN` or non-finite number → `'-'`
- Store not yet hydrated → safe default `'ar'` (already the default in `ui-store.ts:73`)
- Unknown `language` value (defensive) → falls back to `'en-US'` / `'USD'`

No thrown errors, no `console.warn`. The functions never throw.

### Testing

Add `src/lib/format.test.ts` with vitest:

- `formatDateTime`
  - valid ISO string returns localized date+time
  - `Date` instance returns localized date+time
  - `null` / `undefined` return `'-'`
  - invalid string returns `'-'`
  - numeric timestamp returns localized date+time
- `formatNumber`
  - valid number returns localized string with thousands separators
  - `null` / `undefined` / `NaN` return `'-'`
  - custom `options` (e.g. `minimumFractionDigits: 2`) honored
- `formatCurrency`
  - valid number returns currency string
  - EGP for `language: 'ar'`, USD for `language: 'en'`
  - `null` / `undefined` return `'-'`
  - `NaN` returns `'-'`
- All tests seed `useUIStore.setState({ userPreferences: { language: 'en' } })` (and `'ar'`) explicitly to avoid relying on the default

No component test changes — visible output is byte-identical for valid inputs (same `Intl` calls, same locale), and the new null/`NaN` cases don't currently occur in the component paths (they're a defensive upgrade).

## Risks

- **Re-render churn**: switching from a `locale` variable captured per-render to `useUIStore.getState()` at call-time is equivalent — both recompute on every render. No risk.
- **Test isolation**: vitest tests for `format.ts` will mutate the zustand store. Other tests that read the store must reset state in `beforeEach`. The existing `ui-store.test.ts` and `preferences-sync.test.ts` already follow this pattern, so the convention is established.
- **Back-compat**: the `formatCurrency` re-export from `utils.ts` means any future import from `@/lib/utils` keeps working. The single in-tree call site (`VariantsSubTable.tsx:112`) does not pass `locale`, so the signature change is safe.

## Open Questions

None. Ready to plan.
