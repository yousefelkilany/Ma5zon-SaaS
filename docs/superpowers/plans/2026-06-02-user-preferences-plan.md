# User Preferences Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `userPreferences` object to `ui-store.ts` with `language`, `theme`, `dateFormat`. Load from backend on app init, sync changes optimistically with debounce.

**Architecture:** `UserPreferences` typed interface in `ui-store.ts`. Sync layer in `preferences-sync.ts` wraps existing `loadPreferences()`/`savePreferences()` Tauri commands. New `useUserPreferences()` hook for components. `i18n.changeLanguage()` called after prefs load.

**Tech Stack:** Tauri v2, Zustand, i18next, Vitest, TypeScript

---

## File Map

| File                                 | Role                                            |
| ------------------------------------ | ----------------------------------------------- |
| `src/store/ui-store.ts`              | Add `UserPreferences` interface, state, actions |
| `src/store/preferences-sync.ts`      | New — load/save with debounce                   |
| `src/hooks/useUserPreferences.ts`    | New — selector-pattern hook                     |
| `src/i18n/config.ts`                 | Call `i18n.changeLanguage()` after prefs load   |
| `src/store/ui-store.test.ts`         | Add tests for new state/actions                 |
| `src/store/preferences-sync.test.ts` | New — test load/save/optimistic/debounce        |

---

## Task 1: Add UserPreferences to UIStore

**Files:**

- Modify: `src/store/ui-store.ts`

- [ ] **Step 1a: Add interface above store definition**

```typescript
interface UserPreferences {
  language: 'ar' | 'en'
  theme?: 'light' | 'dark' | 'system'
  dateFormat?: string
}
```

- [ ] **Step 1b: Add to UIState interface**

```typescript
interface UIState {
  // ...existing fields...
  userPreferences: UserPreferences

  setUserPreferences: (prefs: UserPreferences) => void
  updateUserPreferences: (partial: Partial<UserPreferences>) => void
}
```

- [ ] **Step 1c: Add initial state in create()**

```typescript
export const useUIStore = create<UIState>()(set => ({
  // ...existing state...
  userPreferences: {
    language: 'ar',
    theme: 'system',
    dateFormat: 'yyyy-MM-dd',
  },
  // ...
}))
```

- [ ] **Step 1d: Add setUserPreferences implementation**

```typescript
setUserPreferences: prefs => set({ userPreferences: prefs }),
```

- [ ] **Step 1e: Add updateUserPreferences implementation**

```typescript
updateUserPreferences: partial =>
  set(state => ({
    userPreferences: { ...state.userPreferences, ...partial },
  })),
```

- [ ] **Step 1f: Add setSquareCorners to toggle function**

The existing `setSquareCorners(enabled)` toggles CSS class. Leave it as-is — it doesn't interact with userPreferences.

- [ ] **Step 1g: Commit**

```bash
git add src/store/ui-store.ts
git commit -m "feat(ui-store): add userPreferences state and actions"
```

---

## Task 2: Create preferences-sync.ts

**Files:**

- Create: `src/store/preferences-sync.ts`
- Test: `src/store/preferences-sync.test.ts`

- [ ] **Step 2a: Write failing test**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { loadUserPreferences, saveUserPreferences } from './preferences-sync'

vi.mock('@/lib/tauri-bindings', () => ({
  commands: {
    loadPreferences: vi.fn(),
    savePreferences: vi.fn(),
  },
}))

describe('loadUserPreferences', () => {
  it('calls commands.loadPreferences and returns UserPreferences on success')
  it('returns default prefs on failure')
})

describe('saveUserPreferences', () => {
  it('calls commands.savePreferences with correct data')
  it('is debounced 1 second')
})
```

- [ ] **Step 2b: Run test to verify it fails**

```bash
pnpm run test src/store/preferences-sync.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 2c: Write implementation**

```typescript
import { commands } from '@/lib/tauri-bindings'
import type { UserPreferences } from './ui-store'

let saveTimer: ReturnType<typeof setTimeout> | null = null

export async function loadUser preferences(): Promise<UserPreferences> {
  const result = await commands.loadPreferences()
  if (result.status === 'ok') {
    const { theme, language } = result.data
    return {
      language: (language as 'ar' | 'en') || 'ar',
      theme: (theme as 'light' | 'dark' | 'system') || 'system',
      dateFormat: 'yyyy-MM-dd',
    }
  }
  return { language: 'ar', theme: 'system', dateFormat: 'yyyy-MM-dd' }
}

export function saveUserPreferences(prefs: UserPreferences): void {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(async () => {
    await commands.savePreferences({
      theme: prefs.theme || 'system',
      language: prefs.language,
      quick_pane_shortcut: null,
    })
  }, 1000)
}
```

Note: `savePreferences` expects `AppPreferences` which has `theme`, `language`, `quick_pane_shortcut`. We only send the fields we manage; the Rust side may merge with existing stored prefs.

- [ ] **Step 2d: Run tests**

```bash
pnpm run test src/store/preferences-sync.test.ts
```

Expected: PASS

- [ ] **Step 2e: Commit**

```bash
git add src/store/preferences-sync.ts src/store/preferences-sync.test.ts
git commit -m "feat: add preferences sync module with debounced save"
```

---

## Task 3: Create useUserPreferences hook

**Files:**

- Create: `src/hooks/useUserPreferences.ts`
- Test: `src/hooks/useUserPreferences.test.ts`

- [ ] **Step 3a: Write failing test**

```typescript
import { describe, it, expect } from 'vitest'
import { useUserPreferences } from './useUserPreferences'

it('returns userPreferences and updateUserPreferences')
it('updates prefs which triggers saveUserPreferences')
```

- [ ] **Step 3b: Write implementation**

```typescript
import { useUIStore } from '@/store/ui-store'
import { updateUserPreferences } from '@/store/ui-store'

export const useUserPreferences = () => {
  const userPreferences = useUIStore(state => state.userPreferences)
  const updatePrefs = useUIStore(state => state.updateUserPreferences)

  const update = (partial: Parameters<typeof updatePrefs>[0]) => {
    updatePrefs(partial)
  }

  return { userPreferences, updateUserPreferences: update }
}
```

- [ ] **Step 3c: Run tests**

```bash
pnpm run test src/hooks/useUserPreferences.test.ts
```

Expected: PASS

- [ ] **Step 3d: Commit**

```bash
git add src/hooks/useUserPreferences.ts src/hooks/useUserPreferences.test.ts
git commit -m "feat: add useUserPreferences hook"
```

---

## Task 4: Integrate i18n with loaded preferences

**Files:**

- Modify: `src/i18n/config.ts`
- Create: `src/hooks/useSyncLanguageToI18n.ts` (or inline in app init)

- [ ] **Step 4a: After loadUserPreferences in app init flow, call i18n.changeLanguage()**

The exact app initialization location depends on your app entry point. Most likely `src/App.tsx` or `src/main.tsx`. This is a coordination step — the `loadUserPreferences()` call site needs to:

1. Call `loadUserPreferences()`
2. Call `useUIStore.getState().setUserPreferences(prefs)` with loaded prefs
3. Call `i18n.changeLanguage(prefs.language)` to sync direction/doclang

This could be a small `useInitializedPreferences()` hook that runs once on mount, or just inline in app init.

```typescript
// In App.tsx or main.tsx after auth check:
const loaded = await loadUserPreferences()
useUIStore.getState().setUserPreferences(loaded)
i18n.changeLanguage(loaded.language)
```

- [ ] **Step 4b: Commit**

```bash
git add src/i18n/config.ts src/App.tsx
git commit -m "feat: sync i18n language with loaded user preferences"
```

---

## Task 5: Add tests to ui-store.test.ts

**Files:**

- Modify: `src/store/ui-store.test.ts`

- [ ] **Step 5a: Reset state in beforeEach**

```typescript
beforeEach(() => {
  useUIStore.setState({
    // ...existing reset...
    userPreferences: {
      language: 'ar',
      theme: 'system',
      dateFormat: 'yyyy-MM-dd',
    },
  })
})
```

- [ ] **Step 5b: Add test cases**

```typescript
it('has correct default userPreferences', () => {
  const state = useUIStore.getState()
  expect(state.userPreferences.language).toBe('ar')
  expect(state.userPreferences.theme).toBe('system')
  expect(state.userPreferences.dateFormat).toBe('yyyy-MM-dd')
})

it('setters and updaters work correctly', () => {
  const { setUserPreferences, updateUserPreferences } = useUIStore.getState()

  setUserPreferences({
    language: 'en',
    theme: 'dark',
    dateFormat: 'dd/MM/yyyy',
  })
  expect(useUIStore.getState().userPreferences.language).toBe('en')

  updateUserPreferences({ language: 'ar' })
  expect(useUIStore.getState().userPreferences.language).toBe('ar')
  expect(useUIStore.getState().userPreferences.theme).toBe('dark')
})
```

- [ ] **Step 5c: Run tests**

```bash
pnpm run test src/store/ui-store.test.ts
```

Expected: PASS

- [ ] **Step 5d: Commit**

```bash
git add src/store/ui-store.test.ts
git commit -m "test(ui-store): add userPreferences tests"
```

---

## Task 6: Run full check

- [ ] **Run check:all**

```bash
pnpm run check:all
```

Fix any TypeScript, lint, or type errors. Commit any fixes.

- [ ] **Commit remaining changes**

```bash
git add -A && git commit -m "feat: user preferences complete"
```
