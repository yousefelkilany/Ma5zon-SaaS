# Splash Screen Design Specification

**Date:** 2026-05-23
**Topic:** Splash Screen Implementation

## Overview

Replace the inline loading state in MainWindow with a branded splash screen that displays during app initialization. The splash screen shows for a minimum of 3 seconds, then disappears once initialization completes.

## Visual Design

### Layout

- Centered content with vertical stack layout
- Logo at top, brand name below, spinner at bottom
- Footer with copyright notice at the very bottom

### Components

**Logo Section**

- Container: 120px × 120px
- Logo image from `src/assets/logo.png`
- Falls back to Material Symbols icon if logo file is missing or fails to load
- Uses Lucide icon as fallback (e.g., `Banknote` or similar finance-related icon)

**Brand Identity**

- Brand name: "Ma5zon"
- Headline style: `headline-lg` with tight tracking
- Tagline: "Precision in every transaction."
- Tagline uses muted color with 70% opacity

**Loading Indicator**

- Spinner using Tailwind CSS animation (animate-spin)
- Secondary color (green accent from design tokens)
- Replaces progress bar (progress bar was removed because initialization time is unknown)

**Footer**

- Copyright notice: "© 2026 Ma5zon v0.1.0"
- Uses `body-sm` styling with 50% opacity
- Fixed at bottom with padding

### Colors (from existing design tokens)

- Background: `surface` (#031427)
- Text: `on-surface` (#d3e4fe)
- Text muted: `on-surface-variant` (#c6c6cd)
- Accent/spinner: `secondary` (#4edea3)

## Behavior

### Timing

- Minimum display duration: 3 seconds
- After minimum time elapses, check if initialization is complete
- Hide splash when BOTH conditions are met:
  1. Minimum 3 seconds have passed
  2. App initialization has finished

### Initialization Tasks (tracked in App.tsx)

- `initializeCommandSystem()` completes
- `initializeLanguage()` completes
- `buildAppMenu()` completes
- `cleanupOldFiles()` completes

### Transition

- Fade out animation using CSS opacity transition
- Duration: 500ms ease-out

## Component Structure

```
src/components/splash/
  SplashScreen.tsx    # Main splash component
  index.ts            # Re-export
```

### Props Interface

```typescript
interface SplashScreenProps {
  isReady: boolean // Whether app initialization is complete
  minDuration?: number // Minimum display time in ms (default: 3000)
}
```

## State Management

App-level state to track splash visibility:

- Add `isAppReady` state to track initialization completion
- Splash screen manages its own visibility based on `isAppReady` + minimum time

## File Changes

1. **Create** `src/components/splash/SplashScreen.tsx`
2. **Create** `src/components/splash/index.ts`
3. **Create** `src/assets/logo.png` (user will add)
4. **Modify** `src/App.tsx` — Add app ready state, render SplashScreen conditionally

## Technical Notes

- Uses Tailwind CSS for styling (matches existing codebase)
- Uses existing design token CSS variables for colors
- Responsive: works at any window size (content stays centered)
- No Tauri configuration changes needed (purely frontend)
