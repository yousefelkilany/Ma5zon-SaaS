# Tab Store Rename: TabState → WorkspaceState

**Date:** 2026-06-07
**Status:** Approved

## Overview

Rename `TabState` → `WorkspaceState` with full propagation across the codebase. This is a breaking change — all references will be updated in a single pass.

## Changes

### 1. Store File (`src/store/tab-store.ts` → `src/store/workspace-store.ts`)

- Rename file from `tab-store.ts` to `workspace-store.ts`
- Rename `TabState` interface → `WorkspaceState`
- Keep `useTabStore` export name (no change to hook name)
- Keep `TabUIState` as-is (represents per-tab UI state, naming is coherent)
- Keep `defaultUIState` export as-is

### 2. All Import Updates

Update imports in all files that reference `useTabStore` or `TabState`:

| File | Change |
|------|--------|
| `src/components/entity/DataTableShell.tsx` | Import path update |
| `src/components/entity/EntityWorkspace.tsx` | Import path update |
| `src/components/entity/DataTable.tsx` | Import path update |
| `src/components/layout/SideBar.tsx` | Import path update |
| `src/components/layout/TabBar.tsx` | Import path update |
| `src/components/layout/MainWindowContent.tsx` | Import path update |
| `src/components/titlebar/TitleBar.tsx` | Import path update |
| `src/hooks/useActiveTabUI.ts` | Import path update |
| `src/store/tab-store.test.ts` | File rename + import update |
| `src/store/tab-store.ts` | File rename |

### 3. Test File Rename

- `src/store/tab-store.test.ts` → `src/store/workspace-store.test.ts`

## Files Unchanged

- `src/store/ui-store.ts` — unrelated store
- `src/store/preferences-sync.ts` — unrelated store
- `src/store/preferences-sync.test.ts` — unrelated

## Naming Summary

| Before | After |
|--------|-------|
| `TabState` interface | `WorkspaceState` interface |
| `tab-store.ts` | `workspace-store.ts` |
| `tab-store.test.ts` | `workspace-store.test.ts` |
| `useTabStore` hook | `useTabStore` (unchanged) |
| `TabUIState` interface | `TabUIState` (unchanged) |
| `defaultUIState` export | `defaultUIState` (unchanged) |

## Scope

This is a pure rename refactoring — no logic changes. All functionality remains identical.
