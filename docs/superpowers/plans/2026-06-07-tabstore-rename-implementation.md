# Tab Store Rename + Semantic Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename `TabState` to `WorkspaceState`, rename files, fix semantic bugs in EntityWorkspace where old API signatures are still being used.

**Architecture:** Breaking change - rename interface and file, update all imports, fix incorrect API calls.

**Tech Stack:** TypeScript, Zustand, React

---

## File Map

| Action | File |
|--------|------|
| Rename | `src/store/tab-store.ts` → `src/store/workspace-store.ts` |
| Rename | `src/store/tab-store.test.ts` → `src/store/workspace-store.test.ts` |
| Modify | `src/components/entity/DataTableShell.tsx` |
| Modify | `src/components/entity/EntityWorkspace.tsx` |
| Modify | `src/components/entity/DataTable.tsx` |
| Modify | `src/components/layout/SideBar.tsx` |
| Modify | `src/components/layout/TabBar.tsx` |
| Modify | `src/components/layout/MainWindowContent.tsx` |
| Modify | `src/components/titlebar/TitleBar.tsx` |
| Modify | `src/hooks/useActiveTabUI.ts` |

---

## Task 1: Rename TabState → WorkspaceState in store file

**Files:**
- Modify: `src/store/tab-store.ts:53`

- [ ] **Step 1: Rename interface**

Change line 53:
```typescript
interface TabState {
```
to:
```typescript
interface WorkspaceState {
```

- [ ] **Step 2: Update ensureUIState parameter type**

Change line 83:
```typescript
function ensureUIState(state: TabState, tabId: string): TabUIState {
```
to:
```typescript
function ensureUIState(state: WorkspaceState, tabId: string): TabUIState {
```

- [ ] **Step 3: Update create call**

Change line 91:
```typescript
export const useTabStore = create<TabState>()((set, get) => ({
```
to:
```typescript
export const useTabStore = create<WorkspaceState>()((set, get) => ({
```

- [ ] **Step 4: Commit**

```bash
git add src/store/tab-store.ts
git commit -m "refactor: rename TabState → WorkspaceState in tab-store"
```

---

## Task 2: Rename tab-store files

**Files:**
- Rename: `src/store/tab-store.ts` → `src/store/workspace-store.ts`
- Rename: `src/store/tab-store.test.ts` → `src/store/workspace-store.test.ts`

- [ ] **Step 1: Rename files**

```bash
mv src/store/tab-store.ts src/store/workspace-store.ts
mv src/store/tab-store.test.ts src/store/workspace-store.test.ts
```

- [ ] **Step 2: Update import in test file**

In `src/store/workspace-store.test.ts`, change:
```typescript
import { useTabStore } from './tab-store'
```
to:
```typescript
import { useTabStore } from './workspace-store'
```

- [ ] **Step 3: Commit**

```bash
git add src/store/workspace-store.ts src/store/workspace-store.test.ts
git commit -m "refactor: rename tab-store files to workspace-store"
```

---

## Task 3: Fix EntityWorkspace semantic bugs

**Files:**
- Modify: `src/components/entity/EntityWorkspace.tsx:173`
- Modify: `src/components/entity/EntityWorkspace.tsx:268`

- [ ] **Step 1: Fix filters access (line 173)**

Change:
```typescript
const currentFilters = tabUIStateAtFetch?.filters?.[entityType] ?? []
```
to:
```typescript
const currentFilters = tabUIStateAtFetch?.filters ?? []
```

- [ ] **Step 2: Fix setFilters call (line 268)**

Change:
```typescript
useTabStore.getState().setFilters(entityType, filters)
```
to:
```typescript
useTabStore.getState().setFilters(filters)
```

- [ ] **Step 3: Commit**

```bash
git add src/components/entity/EntityWorkspace.tsx
git commit -m "fix: use correct setFilters signature and filters access pattern"
```

---

## Task 4: Update all other imports

**Files:**
- Modify: `src/components/entity/DataTableShell.tsx`
- Modify: `src/components/entity/DataTable.tsx`
- Modify: `src/components/layout/SideBar.tsx`
- Modify: `src/components/layout/TabBar.tsx`
- Modify: `src/components/layout/MainWindowContent.tsx`
- Modify: `src/components/titlebar/TitleBar.tsx`
- Modify: `src/hooks/useActiveTabUI.ts`

- [ ] **Step 1: Update DataTableShell.tsx import**

Change:
```typescript
import { useTabStore } from '@/store/tab-store'
```
to:
```typescript
import { useTabStore } from '@/store/workspace-store'
```

- [ ] **Step 2: Update DataTable.tsx import**

Change:
```typescript
import { useTabStore } from '@/store/tab-store'
```
to:
```typescript
import { useTabStore } from '@/store/workspace-store'
```

- [ ] **Step 3: Update SideBar.tsx import**

Change:
```typescript
import { useTabStore } from '@/store/tab-store'
```
to:
```typescript
import { useTabStore } from '@/store/workspace-store'
```

- [ ] **Step 4: Update TabBar.tsx import**

Change:
```typescript
import { useTabStore } from '@/store/tab-store'
```
to:
```typescript
import { useTabStore } from '@/store/workspace-store'
```

- [ ] **Step 5: Update MainWindowContent.tsx import**

Change:
```typescript
import { useTabStore } from '@/store/tab-store'
```
to:
```typescript
import { useTabStore } from '@/store/workspace-store'
```

- [ ] **Step 6: Update TitleBar.tsx import**

Change:
```typescript
import { useTabStore } from '@/store/tab-store'
```
to:
```typescript
import { useTabStore } from '@/store/workspace-store'
```

- [ ] **Step 7: Update useActiveTabUI.ts import**

Change:
```typescript
import { defaultUIState, useTabStore } from '@/store/tab-store'
```
to:
```typescript
import { defaultUIState, useTabStore } from '@/store/workspace-store'
```

- [ ] **Step 8: Commit**

```bash
git add src/components/entity/DataTableShell.tsx src/components/entity/DataTable.tsx src/components/layout/SideBar.tsx src/components/layout/TabBar.tsx src/components/layout/MainWindowContent.tsx src/components/titlebar/TitleBar.tsx src/hooks/useActiveTabUI.ts
git commit -m "refactor: update all useTabStore imports to workspace-store"
```

---

## Task 5: Run typecheck and tests

- [ ] **Step 1: Run typecheck**

```bash
cd /mnt/C/Accountant-SaaS && pnpm run typecheck
```

Expected: No errors

- [ ] **Step 2: Run tests**

```bash
cd /mnt/C/Accountant-SaaS && pnpm test -- --run
```

Expected: All tests pass

- [ ] **Step 3: Commit final changes if any**

---

## Summary of Changes

| Location | Change |
|----------|--------|
| `src/store/workspace-store.ts` | `TabState` → `WorkspaceState`, file renamed |
| `src/store/workspace-store.test.ts` | File renamed, import updated |
| `src/components/entity/EntityWorkspace.tsx` | Fixed `filters[entityType]` → `filters`, fixed `setFilters(entityType, filters)` → `setFilters(filters)` |
| All other component files | Import path updated to `@/store/workspace-store` |