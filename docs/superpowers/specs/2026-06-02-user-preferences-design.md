# User Preferences Design Spec

**Date:** 2026-06-02
**Topic:** Add user preferences (language, theme, dateFormat) to UI store with backend persistence

---

## Overview

Store user preferences (language, theme, dateFormat) in `ui-store.ts` as a single `userPreferences` object. Preferences load from backend on app initialization, then optimistic updates sync changes back to the backend. The system is extensible — new preferences can be added to the interface without restructuring.

---

## 1. Types

`src/store/ui-store.ts` — add `UserPreferences` interface:

```typescript
interface UserPreferences {
  language: 'ar' | 'en'
  theme?: 'light' | 'dark' | 'system'
  dateFormat?: string
}
```

---

## 2. Store Changes

### State Additions

- `userPreferences: UserPreferences` with initial defaults:
  ```typescript
  language: 'ar',
  theme: 'system',
  dateFormat: 'yyyy-MM-dd'
  ```

### Actions

- `setUserPreferences: (prefs: UserPreferences) => void` — replaces full preferences object
- `updateUserPreferences: (partial: Partial<UserPreferences>) => void` — merges partial updates, triggers backend sync

---

## 3. Backend Sync

New file: `src/store/preferences-sync.ts`

### `loadUserPreferences(): Promise<void>`

- Fetches user preferences from backend (userPreferences table)
- Merges over defaults using `setUserPreferences`
- On failure: silently falls back to defaults (non-blocking)

### `saveUserPreferences(prefs: UserPreferences): Promise<void>`

- Saves preferences to backend
- Debounced 1 second to avoid hammering the API on rapid changes
- Optimistic: UI updates immediately via `updateUserPreferences`, save happens in background

### App Initialization Flow

1. App starts with UI store defaults
2. `loadUserPreferences()` called (e.g., after auth check)
3. On success: `setUserPreferences()` updates store, triggering any side effects
4. On failure: defaults remain, no error shown to user

### Change Flow

1. Any component calls `updateUserPreferences({ language: 'en' })`
2. Store updates immediately (optimistic)
3. Debounced `saveUserPreferences()` fires after 1s
4. On save failure: silently retries or logs error (no rollback needed for non-critical prefs)

---

## 4. i18n Integration

`src/i18n/config.ts` behavior:

- Initializes i18n with defaults (`lng: 'ar'`) and no fetched language yet
- After `loadUserPreferences()` succeeds, call `i18n.changeLanguage(preferredLanguage)` to sync direction/doclang
- Existing `i18n.on('languageChanged', ...)` listener already handles `dir` and `lang` attribute updates on the document

### Flow

```
App Init → i18n with 'ar' defaults
         → loadUserPreferences() fetches { language: 'en', ... }
         → setUserPreferences() updates store → useUserPreferences hook sees 'en'
         → i18n.changeLanguage('en') → direction flips to 'ltr'
```

---

## 5. React Hook

New file: `src/hooks/useUserPreferences.ts`

```typescript
export const useUserPreferences = () => {
  const userPreferences = useUIStore(state => state.userPreferences)
  const updateUserPreferences = useUIStore(state => state.updateUserPreferences)
  return { userPreferences, updateUserPreferences }
}
```

This selector pattern avoids re-renders from unrelated store changes.

---

## 6. Theme & Square Corners

The existing `setSquareCorners: (enabled: boolean) => void` is a UI-only action with no backend sync. When `theme` is implemented in the future, follow the same pattern as `userPreferences` updates — optimistic UI update + debounced save.

---

## 7. Extensibility

To add a new preference (e.g., `timezone`):

1. Add to `UserPreferences` interface: `timezone?: string`
2. Add default in store initial state: `timezone: ' Asia/Riyadh'`
3. Done — no changes to sync layer, hooks, or components needed

---

## 8. Files Affected

| File                              | Change                                                 |
| --------------------------------- | ------------------------------------------------------ |
| `src/store/ui-store.ts`           | Add `UserPreferences` interface, state fields, actions |
| `src/store/preferences-sync.ts`   | New — load/save with debounce                          |
| `src/hooks/useUserPreferences.ts` | New — convenience hook                                 |
| `src/i18n/config.ts`              | Call `i18n.changeLanguage()` after prefs load          |

---

## 9. Backend Contract (Expected)

```
GET  /api/user/preferences  → UserPreferences
PUT  /api/user/preferences  → { language: 'ar'|'en', theme?: ..., dateFormat?: ... }
```

The exact endpoint names are backend implementation detail — the sync module will be typed to match whatever the backend exposes via `commands`.

---

## 10. Open Questions

- Backend endpoint path not yet defined — sync module typed as `fetchUserPreferences()` and `persistUserPreferences()` returning `Result` type, matching tauri-specta command pattern
- Theme implementation deferred — interface includes `theme?` field for future use
