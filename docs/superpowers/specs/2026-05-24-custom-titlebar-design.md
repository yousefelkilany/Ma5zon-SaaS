# Custom Theme-Aware Titlebar Design

**Date:** 2026-05-24
**Topic:** Custom Titlebar with Logo and Window Controls
**Status:** Approved

---

## 1. Overview

Replace the existing titlebar with a custom theme-aware titlebar that sits above the Navbar. The titlebar displays logo, app name, current tab name (from tab store), and window controls — all styled to match the selected theme.

**Scope:**
- Modify `TitleBar.tsx` and `TitleBarContent.tsx` in `src/components/titlebar/`
- Add hover effects and state-aware maximize icon to window control components
- Theme-aware styling using existing CSS variables
- Read active tab from `useTabStore` directly

**Out of Scope:**
- Changing Navbar (stays as-is)
- Changing TabBar (stays as-is)
- Creating new components (modify existing)
- Light/dark theme switching logic (existing system works)

---

## 2. Component Structure

### File Changes

```
src/components/titlebar/
├── TitleBar.tsx           ← Modified: New 4-section layout
├── TitleBarContent.tsx    ← Modified: Add Logo, AppName, TabTitle
├── WindowsWindowControls.tsx ← Modified: Hover effects, state-aware icon
├── MacOSWindowControls.tsx    ← Modified: Hover effects, state-aware icon
└── index.ts              ← No changes
```

### New TitleBarContent Components

Add to `TitleBarContent.tsx`:

```tsx
interface TitleBarLogoProps {}
export function TitleBarLogo() { /* renders logo image */ }

interface TitleBarAppNameProps {}
export function TitleBarAppName() { /* renders "AccuLedger" text */ }

interface TitleBarTabTitleProps { title: string }
export function TitleBarTabTitle({ title }: TitleBarTabTitleProps) { /* renders dynamic tab title */ }
```

---

## 3. Layout Structure

### TitleBar Height
- **Height:** 40px (standard)
- **Vertical alignment:** All elements vertically centered

### Horizontal Layout

```
┌──────────────────────────────────────────────────────────────────┐
│ [Logo] AccuLedger           Dashboard                  [─][□][×] │
└──────────────────────────────────────────────────────────────────┘
     ←── left ──→            ←──── center ─────→           ← right →
```

**Left section (items-center, gap-2, pl-2):**
- TitleBarLogo (logo image, h-6 w-6)

**Center section (absolute, -translate-x-1/2, flex, items-center, gap-4):**
- TitleBarAppName (fixed text "AccuLedger")
- TitleBarTabTitle (dynamic, reads from tab store)

**Right section (flex items-center, pr-2):**
- TitleBarRightActions (settings, sidebar toggles)
- Window controls

### CSS Classes (TitleBar.tsx)

```tsx
<div
  data-tauri-drag-region
  className={cn(
    'relative flex h-10 w-full shrink-0 items-center justify-between',
    'bg-surface-container-low border-b border-outline-variant',
    className
  )}
>
  {/* Left */}
  <div className="flex items-center pl-2">
    <TitleBarLogo />
  </div>

  {/* Center */}
  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-4">
    <TitleBarAppName />
    <TitleBarTabTitle title={activeTabTitle} />
  </div>

  {/* Right */}
  <div className="flex items-center pr-2">
    <TitleBarRightActions />
    <PlatformWindowControls />
  </div>
</div>
```

---

## 4. Theme Variables

**Background:** `bg-surface-container-low` (matches Navbar)
**Border:** `border-b border-outline-variant`
**Text colors:**
- App name: `text-foreground/80`
- Tab title: `text-foreground/60`

**Window button hover:**
```css
.window-control-btn {
  opacity: 0.7;
  transition: opacity 0.15s, filter 0.15s;
}
.window-control-btn:hover {
  opacity: 1;
  filter: drop-shadow(0 0 4px var(--foreground));
}
```

---

## 5. Window Controls Behavior

### State-Aware Maximize Icon

**Approach:** Use `getCurrentWindow()` from `@tauri-apps/api/window` to read `isMaximized()` state.

```tsx
import { getCurrentWindow } from '@tauri-apps/api/window'

async function getMaximizeIcon() {
  const window = getCurrentWindow()
  const isMaximized = await window.isMaximized()
  return isMaximized ? 'window-restore' : 'window-maximize'
}
```

**Icon display:**
- When NOT maximized: show `window-maximize` icon (□)
- When IS maximized: show `window-restore` icon (⧉)

### Window Actions

Use Tauri window API directly (not command system):

```tsx
import { getCurrentWindow } from '@tauri-apps/api/window'

const handleMinimize = () => getCurrentWindow().minimize()
const handleToggleMaximize = () => getCurrentWindow().toggleMaximize()
const handleClose = () => getCurrentWindow().close()
```

---

## 6. Data Flow

```
useTabStore.getActiveTab()
       ↓
activeTab.title ──→ TitleBarTabTitle
                         ↓
                   Displays: "Dashboard"
```

**Implementation:** `TitleBar` reads from `useTabStore` directly (no prop drilling):

```tsx
export function TitleBar({ className, forcePlatform }: TitleBarProps) {
  const activeTab = useTabStore(state => state.getActiveTab())
  const tabTitle = activeTab?.title ?? ''

  // ... rest of component
}
```

---

## 7. Platform-Specific Handling

- **macOS:** Traffic lights on LEFT — keep as-is, update styling only
- **Windows:** Controls on RIGHT — update layout and styling
- **Linux:** Toolbar only (native decorations provide window controls) — no custom controls needed

Platform detection via existing `usePlatform()` hook.

---

## 8. Accessibility

- Window control buttons: `aria-label` with descriptive labels ("Minimize", "Maximize", "Restore", "Close")
- Focus states: `focus-visible:ring-2 focus-visible:ring-secondary` on interactive elements
- Keyboard: Tab navigation through all controls

---

## 9. Acceptance Criteria

1. Titlebar renders at top of app with 40px height
2. Logo appears on left, app name "AccuLedger" next to it
3. Active tab name displays in center, updates when tabs change
4. Window controls (minimize, maximize/restore, close) on right
5. Maximize icon reflects current state (maximized vs not)
6. Hover effects on window buttons (opacity + glow)
7. Background uses `--surface-container-low` (matches Navbar)
8. All text uses theme CSS variables
9. Theme-aware: dark mode uses dark colors, light mode uses light colors (handled by CSS variable system)
10. Platform-specific layouts preserved (macOS traffic lights left, Windows controls right)