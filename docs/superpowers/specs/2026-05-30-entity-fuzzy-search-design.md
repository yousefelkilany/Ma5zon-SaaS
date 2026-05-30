# Entity Table Fuzzy Search Design

## Overview

Add client-side fuzzy search to the entity data table (`DataTableShell`) with Arabic and English support. The search filters locally-loaded data using Fuse.js with normalized Arabic text matching.

---

## Functionality

### 1. `normalizeArabic` Utility (`src/lib/utils.ts`)

Add a new export:

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

This function normalizes Arabic text by:

- Collapsing all Alif variants (أ, إ, آ) to ا
- Converting Ta Marbuta (ة) to Ha (ه)
- Converting Alif Maksura (ى) to Ya (ي)
- Stripping diacritical marks (Tashkeel)

### 2. Search Logic in `DataTableShell`

**State:**

- `searchValue` is already declared as local state (line 72)
- `searchValue` is already passed to `Toolbar` and updated via `onSearchChange`

**Filtering:**

Add a `filteredData` derived from `useMemo`:

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

**Debouncing:**

- Wrap the `setSearchValue` call in a debounce (200ms) before passing to `Toolbar`
- Or use `useDeferredValue` from React if debounce adds complexity

**Render:**

- Replace `data` prop on `DataTable` with `filteredData`

### 3. Dependencies

Install `fuse.js`:

```bash
pnpm add fuse.js
```

---

## Data Flow

```
EntityWorkspace
  │
  ▼ data (EntityRow[])
DataTableShell
  │
  ▼ useMemo: filteredData (Fuse search)
  │
  ▼ filteredData
DataTable
```

No changes to `EntityWorkspace` required — all logic stays within `DataTableShell`.

---

## Behavior

- **Min characters:** 2 (search only triggers when 2+ chars entered)
- **Empty/whitespace:** Returns full data unchanged
- **Score cutoff:** Fuse threshold 0.3 balances fuzziness with accuracy
- **Columns searched:** All visible non-action columns
- **Normalization:** Both search term and data values are normalized before matching

---

## File Changes

| File                                       | Change                                                                                       |
| ------------------------------------------ | -------------------------------------------------------------------------------------------- |
| `src/lib/utils.ts`                         | Add `normalizeArabic` export                                                                 |
| `src/components/entity/DataTableShell.tsx` | Add Fuse filtering with `useMemo`, debounce search input, pass `filteredData` to `DataTable` |
| `package.json`                             | Add `fuse.js` dependency                                                                     |
