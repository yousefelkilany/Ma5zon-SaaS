# i18n Validation Messages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Internationalize all validation error messages in `src/lib/validation/schemas.ts` so they display correctly in Arabic (RTL) and English using lazy i18next function calls.

**Architecture:** Convert hardcoded English message constants to function calls that resolve translations at validation time (not module load time), ensuring i18n works when validation runs and updates on language change.

**Tech Stack:** i18next (already configured), existing `useTranslation` hook pattern.

---

## File Structure

```
locales/
├── en.json    # Add: validation.* keys
├── ar.json    # Add: validation.* keys (Arabic translations)
src/lib/validation/
└── schemas.ts # Modify: message constants to lazy functions
```

---

## Task 1: Add Validation Translation Keys

**Files:**

- Modify: `locales/en.json`
- Modify: `locales/ar.json`

- [ ] **Step 1: Add validation keys to en.json**

Add before the closing `}` at end of file:

```json
,
"validation": {
  "fieldRequired": "This field is required",
  "mustBeZeroOrGreater": "Must be 0 or greater",
  "tooLarge": "Too large",
  "maxChars": "Must be {max} characters or less",
  "mustBeAlphanumeric": "Must be alphanumeric with dashes only"
}
```

Run: `cat locales/en.json | python3 -c "import json,sys; json.load(sys.stdin)"` to verify JSON is valid
Expected: No output (valid JSON)

- [ ] **Step 2: Add validation keys to ar.json**

Add before the closing `}` at end of file (ensure no trailing comma if last key has none):

```json
,
"validation": {
  "fieldRequired": "هذا الحقل مطلوب",
  "mustBeZeroOrGreater": "يجب أن يكون 0 أو أكبر",
  "tooLarge": "أكبر من المسموح",
  "maxChars": "يجب أن يكون {max} أحرف أو أقل",
  "mustBeAlphanumeric": "يجب أن يكون alphanumeric مع شرطات فقط"
}
```

Run: `cat locales/ar.json | python3 -c "import json,sys; json.load(sys.stdin)"` to verify JSON is valid
Expected: No output (valid JSON)

- [ ] **Step 3: Commit**

```bash
git add locales/en.json locales/ar.json
git commit -m "feat: add validation translation keys for i18n"
```

---

## Task 2: Update Schemas with Lazy i18n Messages

**Files:**

- Modify: `src/lib/validation/schemas.ts:1-7` (message constants)
- Modify: `src/lib/validation/schemas.ts:134-174` (entity schemas usage)

**Before (lines 3-6):**

```typescript
const NONEMPTY_MSG = 'This field is required'
const NONNEGATIVE_MSG = 'Must be 0 or greater'
const BIG_NUMBER_MSG = 'Too large'
const MAX_CHARS_MSG = (max: number) => `Must be ${max} characters or less`
```

**After (lines 3-6):**

```typescript
import { i18n } from '@/i18n/config'

const NONEMPTY_MSG = () => i18n.t('validation.fieldRequired')
const NONNEGATIVE_MSG = () => i18n.t('validation.mustBeZeroOrGreater')
const BIG_NUMBER_MSG = () => i18n.t('validation.tooLarge')
const MAX_CHARS_MSG = (max: number) => () =>
  i18n.t('validation.maxChars', { max })
```

- [ ] **Step 1: Add i18n import at top of schemas.ts**

Add after existing imports (line 1):

```typescript
import { i18n } from '@/i18n/config'
```

- [ ] **Step 2: Update message constants to lazy functions**

Replace lines 3-6 with the new lazy function versions shown above.

- [ ] **Step 3: Update schema usage in createProductSchema (line 135)**

**Before:**

```typescript
export const createProductSchema = z.object({
  company: z.string().min(1, NONEMPTY_MSG).max(100, MAX_CHARS_MSG(100)),
  name: z.string().min(1, NONEMPTY_MSG).max(200, MAX_CHARS_MSG(200)),
  category: z.string().min(1, NONEMPTY_MSG).max(100, MAX_CHARS_MSG(100)),
})
```

**After:**

```typescript
export const createProductSchema = z.object({
  company: z.string().min(1, NONEMPTY_MSG()).max(100, MAX_CHARS_MSG(100)()),
  name: z.string().min(1, NONEMPTY_MSG()).max(200, MAX_CHARS_MSG(200)()),
  category: z.string().min(1, NONEMPTY_MSG()).max(100, MAX_CHARS_MSG(100)()),
})
```

- [ ] **Step 4: Update createVariantSchema (lines 142-165)**

**Before:**

```typescript
export const createVariantSchema = z.object({
  sku: z
    .string()
    .min(1, NONEMPTY_MSG)
    .max(50, MAX_CHARS_MSG(50))
    .regex(/^[a-zA-Z0-9-]+$/, 'Must be alphanumeric with dashes only'),
  variant_name: z.string().min(1, NONEMPTY_MSG).max(200, MAX_CHARS_MSG(200)),
  uom_id: z.string().max(50, MAX_CHARS_MSG(50)).optional(),
  retail_price: z
    .number()
    .min(0, NONNEGATIVE_MSG)
    .max(999999, BIG_NUMBER_MSG)
    .optional(),
  wholesale_price: z
    .number()
    .min(0, NONNEGATIVE_MSG)
    .max(999999, BIG_NUMBER_MSG)
    .optional(),
  distribution_price: z
    .number()
    .min(0, NONNEGATIVE_MSG)
    .max(999999, BIG_NUMBER_MSG)
    .optional(),
})
```

**After:**

```typescript
export const createVariantSchema = z.object({
  sku: z
    .string()
    .min(1, NONEMPTY_MSG())
    .max(50, MAX_CHARS_MSG(50)())
    .regex(/^[a-zA-Z0-9-]+$/, () => i18n.t('validation.mustBeAlphanumeric')),
  variant_name: z
    .string()
    .min(1, NONEMPTY_MSG())
    .max(200, MAX_CHARS_MSG(200)()),
  uom_id: z.string().max(50, MAX_CHARS_MSG(50)()).optional(),
  retail_price: z
    .number()
    .min(0, NONNEGATIVE_MSG())
    .max(999999, BIG_NUMBER_MSG())
    .optional(),
  wholesale_price: z
    .number()
    .min(0, NONNEGATIVE_MSG())
    .max(999999, BIG_NUMBER_MSG())
    .optional(),
  distribution_price: z
    .number()
    .min(0, NONNEGATIVE_MSG())
    .max(999999, BIG_NUMBER_MSG())
    .optional(),
})
```

- [ ] **Step 5: Update createWarehouseSchema (lines 169-172)**

**Before:**

```typescript
export const createWarehouseSchema = z.object({
  name: z.string().min(1, NONEMPTY_MSG).max(100, MAX_CHARS_MSG(100)),
  location: z.string().min(1, NONEMPTY_MSG).max(200, MAX_CHARS_MSG(200)),
})
```

**After:**

```typescript
export const createWarehouseSchema = z.object({
  name: z.string().min(1, NONEMPTY_MSG()).max(100, MAX_CHARS_MSG(100)()),
  location: z.string().min(1, NONEMPTY_MSG()).max(200, MAX_CHARS_MSG(200)()),
})
```

- [ ] **Step 6: Verify no other schemas need updating**

Run: `rg "NONEMPTY_MSG|NONNEGATIVE_MSG|BIG_NUMBER_MSG|MAX_CHARS_MSG" src/lib/validation/schemas.ts`
Expected: Only lines in the constants (3-6) and usage in schemas above

- [ ] **Step 7: Run typecheck**

Run: `pnpm run typecheck`
Expected: PASS

- [ ] **Step 8: Run tests**

Run: `pnpm test --run`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add src/lib/validation/schemas.ts
git commit -m "feat: use lazy i18n messages in validation schemas"
```

---

## Task 3: Verify Runtime Behavior

- [ ] **Step 1: Start dev server**

Run: `pnpm run dev`
Expected: Dev server starts without errors

- [ ] **Step 2: Test Arabic (default) validation messages**

Open app, navigate to entity create form, submit empty form
Expected: Validation errors appear in Arabic (e.g., "هذا الحقل مطلوب")

- [ ] **Step 3: Test English validation messages**

Switch language to English, submit empty form
Expected: Validation errors appear in English (e.g., "This field is required")

- [ ] **Step 4: Stop dev server**

---

## Task 4: Run Full Quality Gates

- [ ] **Step 1: Run check:all**

Run: `pnpm run check:all`
Expected: All checks pass

- [ ] **Step 2: Fix any issues**

Fix as needed and repeat step 1

- [ ] **Step 3: Final commit if needed**

---

## Summary of Changes

| File                            | Change                                                                   |
| ------------------------------- | ------------------------------------------------------------------------ |
| `locales/en.json`               | Added `validation.*` keys with English messages                          |
| `locales/ar.json`               | Added `validation.*` keys with Arabic translations                       |
| `src/lib/validation/schemas.ts` | Converted message constants to lazy functions, updated all schema usages |

## Validation Message Keys

| Key                              | English                               | Arabic                                |
| -------------------------------- | ------------------------------------- | ------------------------------------- |
| `validation.fieldRequired`       | This field is required                | هذا الحقل مطلوب                       |
| `validation.mustBeZeroOrGreater` | Must be 0 or greater                  | يجب أن يكون 0 أو أكبر                 |
| `validation.tooLarge`            | Too large                             | أكبر من المسموح                       |
| `validation.maxChars`            | Must be {max} characters or less      | يجب أن يكون {max} أحرف أو أقل         |
| `validation.mustBeAlphanumeric`  | Must be alphanumeric with dashes only | يجب أن يكون alphanumeric مع شرطات فقط |

---

## Spec Coverage Check

- [x] All schemas in schemas.ts updated
- [x] Both locales (en, ar) updated with translation keys
- [x] RTL considerations handled (Arabic translations present)
- [x] Runtime i18n behavior verified (language switch updates messages)
