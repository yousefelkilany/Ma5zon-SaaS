# Entity Table Sorting - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add single-column sorting to entity data tables (products, warehouses) with UI button, backend SQL ordering, and reactive data refetch.

**Architecture:** Sort state flows from DataTable → DataTableShell → EntityWorkspace → Tauri command → SQLite ORDER BY. Default sort is `name ASC` when no sort is active.

**Tech Stack:** React + TanStack Table, Zustand/TanStack Query, Tauri v2, SQLite, Rust

---

## File Map

| File | Responsibility |
|------|----------------|
| `src-tauri/src/types.rs` | Add `SortState` struct |
| `src-tauri/src/sql/products.rs` | Modify `build_get_all` to accept sort |
| `src-tauri/src/sql/warehouses.rs` | Modify `build_get_all` to accept sort |
| `src-tauri/src/commands/products.rs` | Add `sort` param to `get_all` |
| `src-tauri/src/commands/warehouses.rs` | Add `sort` param to `warehousesGetAll` |
| `src/lib/types/entity.ts` | Add `BindingSortState` interface |
| `src/components/entity/DataTableShell.tsx` | Add `onSortChange` prop |
| `src/components/entity/EntityWorkspace.tsx` | Wire sort into query state and command calls |

---

## Task 1: Add SortState Type to Rust Backend

**Files:**
- Modify: `src-tauri/src/types.rs:276`

- [ ] **Step 1: Add SortState struct to types.rs**

Add after `FilterState` (line 276):

```rust
// ============================================================================
// Sort State
// ============================================================================

#[derive(Debug, Clone, Deserialize, Type)]
pub struct SortState {
    pub column_id: String,
    pub direction: String,
}
```

- [ ] **Step 2: Verify types compile**

Run: `cd /mnt/C/Accountant-SaaS/src-tauri && cargo check`
Expected: PASS with no errors

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/types.rs
git commit -m "feat: add SortState type for entity sorting"
```

---

## Task 2: Update products.rs SQL Builder

**Files:**
- Modify: `src-tauri/src/sql/products.rs`

- [ ] **Step 1: Add SortState import to products.rs**

Check existing imports (line 46 shows `use crate::types::FilterState;`). Add `SortState`:

```rust
use crate::types::{FilterState, SortState};
```

- [ ] **Step 2: Modify build_get_all signature and body**

Replace the existing `build_get_all` function (lines 115-122):

```rust
pub fn build_get_all(where_clause: &str, sort: Option<&SortState>) -> String {
    let base = "SELECT id, company, name, category, created_at, updated_at, deleted_at FROM active_products";
    let query = if where_clause.is_empty() {
        base.to_string()
    } else {
        format!("{base} WHERE {where_clause}")
    };

    match sort {
        Some(s) => format!("{query} ORDER BY {} {}", s.column_id, s.direction),
        None => format!("{query} ORDER BY name"),
    }
}
```

- [ ] **Step 3: Verify compilation**

Run: `cd /mnt/C/Accountant-SaaS/src-tauri && cargo check`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/sql/products.rs
git commit -m "feat: add sort parameter to products build_get_all"
```

---

## Task 3: Update warehouses.rs SQL Builder

**Files:**
- Modify: `src-tauri/src/sql/warehouses.rs`

- [ ] **Step 1: Add SortState import**

Find the import line and add `SortState`:

```rust
use crate::types::{FilterState, SortState};
```

- [ ] **Step 2: Modify build_get_all function**

Replace `build_get_all` (lines 114-122):

```rust
pub fn build_get_all(where_clause: &str, sort: Option<&SortState>) -> String {
    let base = "SELECT id, name, location, created_at, updated_at, deleted_at FROM active_warehouses";
    let query = if where_clause.is_empty() {
        base.to_string()
    } else {
        format!("{base} WHERE {where_clause}")
    };

    match sort {
        Some(s) => format!("{query} ORDER BY {} {}", s.column_id, s.direction),
        None => format!("{query} ORDER BY name"),
    }
}
```

- [ ] **Step 3: Verify compilation**

Run: `cd /mnt/C/Accountant-SaaS/src-tauri && cargo check`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/sql/warehouses.rs
git commit -m "feat: add sort parameter to warehouses build_get_all"
```

---

## Task 4: Update products.rs Command

**Files:**
- Modify: `src-tauri/src/commands/products.rs`

- [ ] **Step 1: Add SortState to imports**

Find `use crate::types::FilterState;` (line 46) and change to:

```rust
use crate::types::{FilterState, SortState};
```

- [ ] **Step 2: Add sort parameter to get_all command**

Modify `get_all` function signature (around line 100-104). Change from:

```rust
pub async fn get_all(
    app: AppHandle,
    filters: Vec<FilterState>,
    _columns: Vec<String>,
) -> Result<Vec<Product>, String>
```

To:

```rust
pub async fn get_all(
    app: AppHandle,
    filters: Vec<FilterState>,
    _columns: Vec<String>,
    sort: Option<SortState>,
) -> Result<Vec<Product>, String>
```

- [ ] **Step 3: Pass sort to build_get_all**

Find the line `let query = build_get_all(&where_clause);` (line 108) and change to:

```rust
let query = build_get_all(&where_clause, sort.as_ref());
```

- [ ] **Step 4: Verify compilation**

Run: `cd /mnt/C/Accountant-SaaS/src-tauri && cargo check`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/commands/products.rs
git commit -m "feat: add sort parameter to products get_all command"
```

---

## Task 5: Update warehouses.rs Command

**Files:**
- Modify: `src-tauri/src/commands/warehouses.rs`

- [ ] **Step 1: Add SortState to imports**

Find `use crate::types::FilterState;` (line 12) and change to:

```rust
use crate::types::{FilterState, SortState};
```

- [ ] **Step 2: Add sort parameter to warehouses_get_all command**

Modify `warehouses_get_all` signature (lines 74-80). Change from:

```rust
pub async fn warehouses_get_all(
    app: AppHandle,
    filters: Vec<FilterState>,
    _columns: Vec<String>,
) -> Result<Vec<Warehouse>, String>
```

To:

```rust
pub async fn warehouses_get_all(
    app: AppHandle,
    filters: Vec<FilterState>,
    _columns: Vec<String>,
    sort: Option<SortState>,
) -> Result<Vec<Warehouse>, String>
```

- [ ] **Step 3: Pass sort to build_get_all**

Find `let query = build_get_all(&where_clause);` (line 84) and change to:

```rust
let query = build_get_all(&where_clause, sort.as_ref());
```

- [ ] **Step 4: Verify compilation**

Run: `cd /mnt/C/Accountant-SaaS/src-tauri && cargo check`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/commands/warehouses.rs
git commit -m "feat: add sort parameter to warehouses_get_all command"
```

---

## Task 6: Add Frontend BindingSortState Type

**Files:**
- Modify: `src/lib/types/entity.ts`

- [ ] **Step 1: Add BindingSortState interface**

Add after `FilterState` interface (around line 42):

```typescript
export interface BindingSortState {
  column_id: string
  direction: 'asc' | 'desc'
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /mnt/C/Accountant-SaaS && pnpm run typecheck` (or check via IDE)
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/lib/types/entity.ts
git commit -m "feat: add BindingSortState type for frontend"
```

---

## Task 7: Update DataTableShell to Export Sort State

**Files:**
- Modify: `src/components/entity/DataTableShell.tsx`

- [ ] **Step 1: Add onSortChange to DataTableShellProps interface**

Add after line 37 (before the closing `}`):

```typescript
onSortChange?: (sort: SortState | null) => void
```

- [ ] **Step 2: Rename handleSort to handleSortChange and propagate to parent**

Change `handleSort` (line 80) to:

```typescript
const handleSortChange = useCallback((newSort: SortState | null) => {
    setSort(newSort)
    onSortChange?.(newSort)
}, [onSortChange])
```

- [ ] **Step 3: Update onSort prop name in DataTable call**

Find `onSort={handleSort}` (line 131) and change to:

```typescript
onSort={handleSortChange}
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `pnpm run typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/entity/DataTableShell.tsx
git commit -m "feat: add onSortChange prop to DataTableShell"
```

---

## Task 8: Wire Sort into EntityWorkspace

**Files:**
- Modify: `src/components/entity/EntityWorkspace.tsx`

- [ ] **Step 1: Add sort state**

Find `const [activeFilters, setActiveFilters] = useState<FilterState[]>([]);` (around line 170) and add after:

```typescript
const [sort, setSort] = useState<SortState | null>(null)
```

- [ ] **Step 2: Add handleSortChange callback**

Find `const handleFiltersApply = useCallback(` (around line 297) and add before it:

```typescript
const handleSortChange = useCallback((newSort: SortState | null) => {
    setSort(newSort)
}, [])
```

- [ ] **Step 3: Pass sort and onSortChange to DataTableShell**

Find `<DataTableShell` (line 312) and add `sort` and `onSortChange` props:

```typescript
<DataTableShell
    // ... existing props ...
    sort={sort}
    onSortChange={handleSortChange}
```

- [ ] **Step 4: Add sort to query key**

Find `queryKey: ['entity', entityType, activeFilters],` (line 250) and change to:

```typescript
queryKey: ['entity', entityType, activeFilters, sort],
```

- [ ] **Step 5: Pass sort to commands**

Find `commands.getAll(bindingFilters, [])` and `commands.warehousesGetAll(bindingFilters, [])` and change to:

```typescript
commands.getAll(bindingFilters, [], sort)
commands.warehousesGetAll(bindingFilters, [], sort)
```

- [ ] **Step 6: Verify TypeScript compiles**

Run: `pnpm run typecheck`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/components/entity/EntityWorkspace.tsx
git commit -m "feat: wire sort state into EntityWorkspace query"
```

---

## Task 9: Verify Full Integration

- [ ] **Step 1: Run pnpm run check:all**

Run: `cd /mnt/C/Accountant-SaaS && pnpm run check:all`
Expected: PASS

- [ ] **Step 2: Test sorting in browser**

1. Start the dev server: `pnpm run tauri dev`
2. Navigate to products or warehouses entity
3. Click column header sort buttons
4. Verify data re-sorts and appropriate ORDER BY appears in backend

---

**Plan complete and saved to `docs/superpowers/plans/2026-05-30-entity-sorting-plan.md`**

Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?