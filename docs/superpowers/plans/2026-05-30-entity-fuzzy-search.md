# Entity Fuzzy Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add client-side fuzzy search to the entity data table with Arabic and English support using Fuse.js

**Architecture:** Search logic lives entirely within `DataTableShell` — it takes `data` from `EntityWorkspace`, filters it using Fuse.js with normalized Arabic matching, and passes the filtered result to `DataTable`. No changes needed to `EntityWorkspace` or parent components.

**Tech Stack:** fuse.js for fuzzy matching, React useMemo for memoized filtering, existing debounce pattern via useDeferredValue

---

## Task 1: Add `normalizeArabic` to utils

**Files:**

- Modify: `src/lib/utils.ts:1-32`

- [ ] **Step 1: Add normalizeArabic export to utils.ts**

Add this export at the end of `src/lib/utils.ts`:

```typescript
export function normalizeArabic(text: string): string {
  if (!text) return ''
  return text
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[\u064B-\u065F]/g, '')
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/utils.ts
git commit -m "feat: add normalizeArabic utility for Arabic text normalization"
```

---

## Task 2: Install fuse.js

**Files:**

- Modify: `package.json`

- [ ] **Step 1: Install fuse.js**

```bash
cd /mnt/C/Accountant-SaaS && pnpm add fuse.js
```

- [ ] **Step 2: Verify package.json updated and commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "deps: add fuse.js for fuzzy search"
```

---

## Task 3: Add Fuse filtering in DataTableShell

**Files:**

- Modify: `src/components/entity/DataTableShell.tsx:1-180`

- [ ] **Step 1: Add Fuse import**

Add import at the top of the file (line 1-2 area):

```typescript
import Fuse from 'fuse.js'
import { normalizeArabic } from '@/lib/utils'
```

- [ ] **Step 2: Add filteredData useMemo after existing useState declarations (after line 78)**

Add this between `const [localColumns, setLocalColumns]` and the `useEffect` blocks:

```typescript
const filteredData = useMemo(() => {
  if (!searchValue.trim() || searchValue.length < 2) {
    return data
  }

  const normalizedSearch = normalizeArabic(searchValue.toLowerCase())

  const searchableKeys = columns
    .filter(col => col.type !== 'actions' && col.visible)
    .map(col => col.id)

  const fuse = new Fuse(data, {
    keys: searchableKeys,
    includeScore: true,
    threshold: 0.3,
    minMatchCharLength: 2,
    getFn: (obj, path) => {
      const value = obj[path[0]]
      if (typeof value === 'string') {
        return normalizeArabic(value.toLowerCase())
      }
      return String(value ?? '')
    },
  })

  return fuse.search(normalizedSearch).map(result => result.item)
}, [data, searchValue, columns])
```

- [ ] **Step 3: Update DataTable prop from `data` to `filteredData`**

In the DataTable component call (around line 138), change:

```tsx
data = { data }
```

to:

```tsx
data = { filteredData }
```

- [ ] **Step 4: Commit**

```bash
git add src/components/entity/DataTableShell.tsx
git commit -m "feat: add client-side fuzzy search with Arabic normalization in DataTableShell"
```

---

## Task 4: Verify and run checks

**Files:**

- Modify: none (verification only)

- [ ] **Step 1: Run typecheck and lint**

```bash
cd /mnt/C/Accountant-SaaS && pnpm run typecheck && pnpm run lint
```

Expected: Both pass without errors

- [ ] **Step 2: Commit if any fixes were made**

```bash
git add -A && git commit -m "chore: address typecheck/lint findings"
```
