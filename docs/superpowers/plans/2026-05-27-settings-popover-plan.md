# Settings Popover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a lightweight settings popover attached to the gear icon in the Navbar for quick theme and language settings.

**Architecture:** Uses Radix UI Popover to create a dropdown attached to the gear icon. Theme uses existing `useTheme()` hook. Language uses existing `i18n.changeLanguage()`. Persistence via existing `useSavePreferences()`.

**Tech Stack:** React, Radix UI Popover, Tailwind CSS, existing i18n/theme infrastructure

---

## File Structure

- **Create:** `src/components/layout/SettingsPopover.tsx` — new popover component
- **Modify:** `src/components/layout/index.ts` — export the new component
- **Modify:** `src/components/layout/Navbar.tsx` — replace gear button with SettingsPopover

---

### Task 1: Create SettingsPopover component

**Files:**

- Create: `src/components/layout/SettingsPopover.tsx`
- Check: `src/components/ui/popover.tsx` (Radix Popover API)
- Check: `src/hooks/use-theme.ts` (theme hook API)
- Check: `src/components/preferences/panes/AppearancePane.tsx` (theme/language handling patterns)

- [ ] **Step 1: Write the component skeleton**

```tsx
import { useTranslation } from 'react-i18next'
import * as Popover from '@/components/ui/popover'
import { useTheme } from '@/hooks/use-theme'
import { usePreferences, useSavePreferences } from '@/services/preferences'
import i18n from '@/i18n/config'

export function SettingsPopover() {
  const { t, i18n } = useTranslation()
  const { theme, setTheme } = useTheme()
  const { data: preferences } = usePreferences()
  const savePreferences = useSavePreferences()

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme)
    if (preferences) {
      savePreferences.mutate({ ...preferences, theme: newTheme })
    }
  }

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang)
    if (preferences) {
      savePreferences.mutate({
        ...preferences,
        language: lang === 'system' ? null : lang,
      })
    }
  }

  return (
    <Popover.Popover>
      <Popover.PopoverTrigger asChild>
        <button className="p-2 text-on-surface-variant hover:bg-surface-container-high rounded-full">
          <span
            className="material-symbols-outlined"
            style={{ fontSize: '1.75em' }}
          >
            settings
          </span>
        </button>
      </Popover.PopoverTrigger>
      <Popover.PopoverContent
        align="end"
        side="bottom"
        sideOffset={8}
        className="w-72 bg-surface-container border-outline-variant rounded-lg p-4 shadow-xl"
      >
        {/* Theme section */}
        <div className="space-y-3">
          <span className="text-label-caps text-on-surface-variant uppercase">
            {t('preferences.appearance.theme')}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => handleThemeChange('light')}
              className={`flex-1 flex flex-col items-center gap-1 p-3 rounded-lg transition-all ${
                theme === 'light'
                  ? 'bg-secondary text-on-secondary ring-2 ring-secondary'
                  : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest'
              }`}
            >
              <span className="material-symbols-outlined">light_mode</span>
              <span className="text-xs">
                {t('preferences.appearance.theme.light')}
              </span>
            </button>
            <button
              onClick={() => handleThemeChange('dark')}
              className={`flex-1 flex flex-col items-center gap-1 p-3 rounded-lg transition-all ${
                theme === 'dark'
                  ? 'bg-secondary text-on-secondary ring-2 ring-secondary'
                  : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest'
              }`}
            >
              <span className="material-symbols-outlined">dark_mode</span>
              <span className="text-xs">
                {t('preferences.appearance.theme.dark')}
              </span>
            </button>
            <button
              onClick={() => handleThemeChange('system')}
              className={`flex-1 flex flex-col items-center gap-1 p-3 rounded-lg transition-all ${
                theme === 'system'
                  ? 'bg-secondary text-on-secondary ring-2 ring-secondary'
                  : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest'
              }`}
            >
              <span className="material-symbols-outlined">desktop_windows</span>
              <span className="text-xs">
                {t('preferences.appearance.theme.system')}
              </span>
            </button>
          </div>
        </div>

        {/* Language section */}
        <div className="space-y-3 mt-4">
          <span className="text-label-caps text-on-surface-variant uppercase">
            {t('preferences.appearance.language')}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => handleLanguageChange('ar')}
              className={`flex-1 flex flex-col items-center gap-1 p-3 rounded-lg transition-all ${
                i18n.language === 'ar'
                  ? 'bg-secondary text-on-secondary ring-2 ring-secondary'
                  : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest'
              }`}
            >
              <span className="text-lg font-medium">عربي</span>
              <span className="text-xs">
                {t('preferences.appearance.language.arabic')}
              </span>
            </button>
            <button
              onClick={() => handleLanguageChange('en')}
              className={`flex-1 flex flex-col items-center gap-1 p-3 rounded-lg transition-all ${
                i18n.language === 'en'
                  ? 'bg-secondary text-on-secondary ring-2 ring-secondary'
                  : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest'
              }`}
            >
              <span className="text-lg font-medium">EN</span>
              <span className="text-xs">
                {t('preferences.appearance.language.english')}
              </span>
            </button>
            <button
              onClick={() => handleLanguageChange('system')}
              className={`flex-1 flex flex-col items-center gap-1 p-3 rounded-lg transition-all ${
                i18n.language === 'system'
                  ? 'bg-secondary text-on-secondary ring-2 ring-secondary'
                  : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest'
              }`}
            >
              <span className="material-symbols-outlined">desktop_windows</span>
              <span className="text-xs">
                {t('preferences.appearance.theme.system')}
              </span>
            </button>
          </div>
        </div>
      </Popover.PopoverContent>
    </Popover.Popover>
  )
}
```

- [ ] **Step 2: Run TypeScript check**

Run: `cd /mnt/C/Ma5zon-SaaS && npx tsc --noEmit src/components/layout/SettingsPopover.tsx 2>&1 || true`
Expected: Should show any type errors to fix

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/SettingsPopover.tsx
git commit -m "feat: add SettingsPopover component"
```

---

### Task 2: Export from layout index

**Files:**

- Modify: `src/components/layout/index.ts`

- [ ] **Step 1: Add export**

In `src/components/layout/index.ts`, add:

```ts
export { SettingsPopover } from './SettingsPopover'
```

- [ ] **Step 2: Commit**

```bash
git add src/components/layout/index.ts
git commit -m "feat: export SettingsPopover from layout"
```

---

### Task 3: Wire up in Navbar

**Files:**

- Modify: `src/components/layout/Navbar.tsx:41-51`

- [ ] **Step 1: Replace gear button with SettingsPopover**

Replace the current gear icon button:

```tsx
<button className="p-2 text-on-surface-variant hover:bg-surface-container-high rounded-full">
  <span className="material-symbols-outlined" style={{ fontSize: '1.75em' }}>
    settings
  </span>
</button>
```

With:

```tsx
<SettingsPopover />
```

And add import at top:

```tsx
import { SettingsPopover } from './SettingsPopover'
```

Note: The ProfileSection already handles its own styling, so SettingsPopover should be placed before or after it as appropriate for the layout.

- [ ] **Step 2: Run TypeScript check**

Run: `cd /mnt/C/Ma5zon-SaaS && npx tsc --noEmit 2>&1 | head -50`
Expected: No errors related to SettingsPopover

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/Navbar.tsx
git commit -m "feat: wire SettingsPopover to gear icon in Navbar"
```

---

## Spec Coverage Check

- [x] Radix Popover attached to gear icon — Task 1
- [x] Theme toggle (light/dark/system) — Task 1
- [x] Language toggle (AR/EN/system) with AR first — Task 1
- [x] Visual indication of selected options — Task 1
- [x] Click outside closes — Radix default behavior
- [x] Persistence via useSavePreferences — Task 1
- [x] Dark theme styling — Task 1

## Plan Review

The plan covers all requirements from the spec. No placeholders found. Type consistency verified across all tasks.
