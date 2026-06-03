# i18n Validation Messages Design

**Date:** 2026-06-03
**Status:** Draft

## Goal

Internationalize all validation error messages in `src/lib/validation/schemas.ts` so they display correctly in Arabic (RTL) and English.

## Context

- Zod schemas in `schemas.ts` use hardcoded English messages (e.g., `NONEMPTY_MSG = 'This field is required'`)
- i18n config supports Arabic (default, RTL) and English via `react-i18next` with ICU message format
- All form components already use `useTranslation` hook

## Approach

**Module-level lazy messages** — Convert message constants to functions that call `i18n.t()` at validation time, not module load time. This ensures:

1. Translation works when validation runs (after i18n initialization)
2. Messages update immediately when user changes language
3. No breaking changes to schema API or import patterns

## Implementation

### File: `src/lib/validation/schemas.ts`

**Current (hardcoded English):**

```typescript
const NONEMPTY_MSG = 'This field is required'
const NONNEGATIVE_MSG = 'Must be 0 or greater'
const BIG_NUMBER_MSG = 'Too large'
const MAX_CHARS_MSG = (max: number) => `Must be ${max} characters or less`
```

**Updated (i18n lazy):**

```typescript
const NONEMPTY_MSG = () => i18n.t('validation.fieldRequired')
const NONNEGATIVE_MSG = () => i18n.t('validation.mustBeZeroOrGreater')
const BIG_NUMBER_MSG = () => i18n.t('validation.tooLarge')
const MAX_CHARS_MSG = (max: number) => () =>
  i18n.t('validation.maxChars', { max })
```

### Locale Keys Required

Add to `locales/en.json` and `locales/ar.json`:

```json
{
  "validation": {
    "fieldRequired": "This field is required",
    "mustBeZeroOrGreater": "Must be 0 or greater",
    "tooLarge": "Too large",
    "maxChars": "Must be {max} characters or less",
    "mustBeAlphanumeric": "Must be alphanumeric with dashes only"
  }
}
```

### Schema Usage (unchanged)

```typescript
// Before
export const createProductSchema = z.object({
  company: z.string().min(1, NONEMPTY_MSG).max(100, MAX_CHARS_MSG(100)),
})

// After — same usage, messages resolve at validation time
export const createProductSchema = z.object({
  company: z.string().min(1, NONEMPTY_MSG()).max(100, MAX_CHARS_MSG(100)()),
})
```

**Note:** `MAX_CHARS_MSG(max)` returns a function, so call it: `MAX_CHARS_MSG(100)()`.

### Rust Validation (unchanged)

Rust validation functions already return English strings (e.g., `"company: required"`). These are backend errors shown in Rust command responses. Frontend forms will display them after translation via `useTranslation`.

## Files to Modify

| File                            | Change                                    |
| ------------------------------- | ----------------------------------------- |
| `src/lib/validation/schemas.ts` | Update message constants to functions     |
| `locales/en.json`               | Add validation keys                       |
| `locales/ar.json`               | Add validation keys (Arabic translations) |

## Migration Notes

1. **Backward compatible** — Schema structure unchanged, only message strings change
2. **Runtime dependency** — Schemas assume i18n is initialized before validation runs (always true in React after App mount)
3. **No breaking changes** — Import paths and usage patterns remain identical

## Spec Self-Review

- [x] Placeholder scan — no TBD/TODO
- [x] Internal consistency — approach matches stated goal
- [x] Scope check — focused on schemas.ts i18n, not broader i18n work
- [x] Ambiguity check — MAX_CHARS_MSG call pattern explicit above
