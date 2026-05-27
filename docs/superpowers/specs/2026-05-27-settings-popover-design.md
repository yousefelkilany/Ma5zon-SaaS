# Settings Popover Design

**Date**: 2026-05-27
**Status**: Approved

## Overview

A lightweight settings popover attached to the gear icon in the Navbar, providing quick access to theme and language settings without navigating to the full Preferences dialog.

## Design

### Appearance
- **Component**: Radix UI Popover — appears attached to gear icon (not centered)
- **Styling**: `bg-surface-container`, `border-outline-variant`, `rounded-lg`, shadow
- **Size**: ~280px wide, max ~320px height with overflow scroll if needed

### Layout

```
┌─────────────────────────────┐
│  Theme                       │
│  [☀️] [🌙] [💻]              │
│  (selected has ring/bg)      │
│                              │
│  Language                    │
│  [EN] [عربي] [💻]            │
│  (selected has ring/bg)      │
└─────────────────────────────┘
```

- Section labels on left using `text-label-caps`
- Toggle groups on right with icon buttons
- Currently selected option visually highlighted (ring + background)
- No footer

### Icon Buttons

**Theme toggles:**
- ☀️ Light (`light` mode)
- 🌙 Dark (`dark` mode)
- 💻 System (`system` mode — follows device preference)

**Language toggles:**
- AR Arabic (العربية) — first, since it's the default
- EN English
- 💻 System (follows device locale)

### Behavior

- Theme defaults: `system` (existing behavior preserved)
- Language defaults: `system` (existing behavior preserved)
- Clicking an option immediately updates the setting
- Changes persist via `useSavePreferences()` mutation
- Click outside closes the popover
- Escape key closes the popover

## Technical Approach

### Files to Create/Modify

1. **Create** `src/components/layout/SettingsPopover.tsx`
   - Uses Radix `Popover` with `PopoverTrigger` wrapping the gear icon button
   - `PopoverContent` contains the settings UI
   - Reuses `useTheme()` for theme state
   - Reuses `usePreferences()` / `useSavePreferences()` for persistence
   - Reuses `i18n.changeLanguage()` for language switching

2. **Modify** `src/components/layout/index.ts`
   - Export `SettingsPopover`

3. **Modify** `src/components/layout/Navbar.tsx`
   - Remove existing gear icon `<button>`
   - Wrap ProfileSection with `<SettingsPopover>` which contains the trigger

### State Management

- Theme state: `useTheme()` hook (already exists)
- Language state: `i18n.changeLanguage()` + `useSavePreferences()`
- Persistence: `usePreferences()` / `useSavePreferences()` (already exist)

### Styling

- Use existing design tokens from `theme-variables.css`
- Selected toggle: `bg-secondary text-on-secondary` or `ring-2 ring-secondary`
- Hover states: `hover:bg-surface-container-high`
- Spacing: `gap-2` between toggle buttons, `space-y-4` between sections