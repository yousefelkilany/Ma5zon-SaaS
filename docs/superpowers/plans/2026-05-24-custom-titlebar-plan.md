# Custom Theme-Aware Titlebar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a custom titlebar with logo, app name, current tab title, and theme-aware window controls positioned above the Navbar.

**Architecture:** Modify existing TitleBar component and its sub-components to create a 4-section layout (Logo | AppName | TabTitle | WindowControls). Window controls use Tauri window API directly. Active tab title reads from `useTabStore.getActiveTab()`.

**Tech Stack:** React, Tauri window API (`@tauri-apps/api/window`), CSS with existing theme variables.

---

## Task 1: Add TitleBarLogo, TitleBarAppName, TitleBarTabTitle to TitleBarContent.tsx

**Files:**
- Modify: `src/components/titlebar/TitleBarContent.tsx:1-125`

- [ ] **Step 1: Add new components to TitleBarContent.tsx**

Add the following after the existing imports:

```tsx
/**
 * Logo for the title bar (leftmost element).
 * Uses the same logo image as the Navbar.
 */
export function TitleBarLogo() {
  return (
    <img
      src="https://lh3.googleusercontent.com/aida-public/AB6AXuBiZVh33XK4sg0Cf0Pm2N5FrKbpAMT8lNGK97INqjoemoBZsqlzyY7NiAgGS3jiGjEPzRX6s5XJyPyyEixFtC4Vj_hvysR6CBiupoA-ceSylGa8Dy44bMRlPcrGzA1WYFEJT-HR4cXIEJ2PUFTlS2QdTf5AjhxMrOmkibHJVWkrHMx6bzFoXPqCkiP2vlxvuyDbwHrlWKWaYlW8EV3M6ocVQ5ds4g6WyTZnIWhEHMvf2OV0ztC5yFT_0sF1Q4d-rcpdwYtHWMm6Azo"
      alt="AccuLedger Logo"
      className="h-6 w-6 shrink-0"
    />
  )
}

/**
 * App name displayed after the logo.
 * Fixed text "AccuLedger".
 */
export function TitleBarAppName() {
  return (
    <span className="text-sm font-medium text-foreground/80">
      AccuLedger
    </span>
  )
}

interface TitleBarTabTitleProps {
  title: string
}

/**
 * Dynamic tab title shown in the center of the titlebar.
 * Displays the title of the currently active tab.
 */
export function TitleBarTabTitle({ title }: TitleBarTabTitleProps) {
  return (
    <span className="text-sm text-foreground/60">
      {title}
    </span>
  )
}
```

- [ ] **Step 2: Verify file integrity**

Run: `npx tsc --noEmit src/components/titlebar/TitleBarContent.tsx`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/titlebar/TitleBarContent.tsx
git commit -m "feat(titlebar): add Logo, AppName, TabTitle components"
```

---

## Task 2: Update TitleBar.tsx with new 4-section layout

**Files:**
- Modify: `src/components/titlebar/TitleBar.tsx:1-98`
- Read: `src/store/tab-store.ts:69-72` (for getActiveTab reference)

- [ ] **Step 1: Update TitleBar.tsx imports**

Add `useTabStore` to imports:

```tsx
import { useTabStore } from '@/store/tab-store'
```

- [ ] **Step 2: Update TitleBar component with new layout**

Replace the entire `TitleBar` component with:

```tsx
export function TitleBar({ className, forcePlatform }: TitleBarProps) {
  const { t } = useTranslation()
  const displayTitle = title ?? t('titlebar.default')
  const detectedPlatform = usePlatform()
  const activeTab = useTabStore(state => state.getActiveTab())
  const tabTitle = activeTab?.title ?? ''

  const platform =
    import.meta.env.DEV && forcePlatform ? forcePlatform : detectedPlatform

  if (platform === 'linux') {
    return <LinuxTitleBar className={className} title={displayTitle} />
  }

  return (
    <div
      data-tauri-drag-region
      className={cn(
        'relative flex h-10 w-full shrink-0 items-center justify-between',
        'bg-surface-container-low border-b border-outline-variant',
        className
      )}
    >
      {/* Left: Logo + App Name */}
      <div className="flex items-center gap-2 pl-2">
        <TitleBarLogo />
        <TitleBarAppName />
      </div>

      {/* Center: Tab Title */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center">
        <TitleBarTabTitle title={tabTitle} />
      </div>

      {/* Right: Actions + Window Controls */}
      <div className="flex items-center pr-2">
        <TitleBarRightActions />
        {platform === 'windows' ? (
          <WindowsWindowControls />
        ) : (
          <MacOSWindowControls />
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit src/components/titlebar/TitleBar.tsx`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/components/titlebar/TitleBar.tsx
git commit -m "feat(titlebar): update layout with Logo, AppName, TabTitle, WindowControls"
```

---

## Task 3: Update WindowsWindowControls.tsx with outline hover effects

**Files:**
- Modify: `src/components/titlebar/WindowsWindowControls.tsx:84-127`

- [ ] **Step 1: Update button hover styles**

The current WindowsWindowControls uses solid hover backgrounds. Update to outline-style hover with glow:

Find this code and replace:

```tsx
// Base button styles for Windows controls
const buttonClass =
  'flex h-8 w-12 items-center justify-center transition-colors'
```

Replace with:

```tsx
// Base button styles for Windows controls (outline style)
const buttonClass =
  'flex h-8 w-12 items-center justify-center transition-opacity duration-150'
```

Find the minimize button and replace:

```tsx
<button
  type="button"
  onClick={handleMinimize}
  className={cn(buttonClass, 'hover:bg-foreground/10')}
  title="Minimize"
  aria-label="Minimize window"
>
  <WindowsIcons.minimize />
</button>
```

Replace with:

```tsx
<button
  type="button"
  onClick={handleMinimize}
  className={cn(
    buttonClass,
    'opacity-70 hover:opacity-100 hover:drop-shadow-[0_0_4px_var(--foreground)]'
  )}
  title="Minimize"
  aria-label="Minimize window"
>
  <WindowsIcons.minimize />
</button>
```

Find the maximize/restore button and replace:

```tsx
<button
  type="button"
  onClick={handleMaximizeToggle}
  className={cn(buttonClass, 'hover:bg-foreground/10')}
  title={isMaximized ? 'Restore' : 'Maximize'}
  aria-label={isMaximized ? 'Restore window' : 'Maximize window'}
>
  {isMaximized ? <WindowsIcons.restore /> : <WindowsIcons.maximize />}
</button>
```

Replace with:

```tsx
<button
  type="button"
  onClick={handleMaximizeToggle}
  className={cn(
    buttonClass,
    'opacity-70 hover:opacity-100 hover:drop-shadow-[0_0_4px_var(--foreground)]'
  )}
  title={isMaximized ? 'Restore' : 'Maximize'}
  aria-label={isMaximized ? 'Restore window' : 'Maximize window'}
>
  {isMaximized ? <WindowsIcons.restore /> : <WindowsIcons.maximize />}
</button>
```

The close button already has hover effect with destructive color, so keep it but add opacity:

```tsx
<button
  type="button"
  onClick={handleClose}
  className={cn(
    buttonClass,
    'opacity-70 hover:opacity-100 hover:bg-destructive hover:text-destructive-foreground hover:drop-shadow-[0_0_4px_var(--destructive)]'
  )}
  title="Close"
  aria-label="Close window"
>
  <WindowsIcons.close />
</button>
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit src/components/titlebar/WindowsWindowControls.tsx`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/titlebar/WindowsWindowControls.tsx
git commit -m "feat(titlebar): add outline hover effects to WindowsWindowControls"
```

---

## Task 4: Update MacOSWindowControls.tsx with outline hover effects

**Files:**
- Modify: `src/components/titlebar/MacOSWindowControls.tsx:124-187`

- [ ] **Step 1: Update MacOS button hover styles**

The MacOSWindowControls currently uses colored solid buttons. For consistency with the outline style approach, update the hover behavior to show outline glow instead.

Find the close button and add opacity and glow on hover:

```tsx
<button
  type="button"
  onClick={handleClose}
  aria-label="Close window"
  className={cn(
    'group flex h-3 w-3 cursor-default items-center justify-center rounded-full border text-center text-black/60 hover:bg-[#ff544d] hover:border-black/[.12] active:bg-[#bf403a] active:text-black/60 dark:border-none',
    isWindowFocused
      ? 'border-black/[.12] bg-[#ff544d]'
      : 'border-gray-400/20 bg-gray-400'
  )}
>
```

Replace with:

```tsx
<button
  type="button"
  onClick={handleClose}
  aria-label="Close window"
  className={cn(
    'group flex h-3 w-3 cursor-default items-center justify-center rounded-full border text-center text-black/60 transition-all duration-150 hover:opacity-100 hover:drop-shadow-[0_0_4px_#ff544d] active:bg-[#bf403a] active:text-black/60 dark:border-none',
    isWindowFocused
      ? 'border-black/[.12] bg-[#ff544d]'
      : 'border-gray-400/20 bg-gray-400',
    isWindowFocused ? 'opacity-70' : 'opacity-50'
  )}
>
```

Apply same pattern to minimize button:

```tsx
<button
  type="button"
  onClick={handleMinimize}
  aria-label="Minimize window"
  className={cn(
    'group flex h-3 w-3 cursor-default items-center justify-center rounded-full border text-center text-black/60 hover:bg-[#ffbd2e] hover:border-black/[.12] active:bg-[#bf9122] active:text-black/60 dark:border-none',
    isWindowFocused
      ? 'border-black/[.12] bg-[#ffbd2e]'
      : 'border-gray-400/20 bg-gray-400'
  )}
>
```

Replace with:

```tsx
<button
  type="button"
  onClick={handleMinimize}
  aria-label="Minimize window"
  className={cn(
    'group flex h-3 w-3 cursor-default items-center justify-center rounded-full border text-center text-black/60 transition-all duration-150 hover:opacity-100 hover:drop-shadow-[0_0_4px_#ffbd2e] active:bg-[#bf9122] active:text-black/60 dark:border-none',
    isWindowFocused
      ? 'border-black/[.12] bg-[#ffbd2e]'
      : 'border-gray-400/20 bg-gray-400',
    isWindowFocused ? 'opacity-70' : 'opacity-50'
  )}
>
```

Apply same pattern to maximize/fullscreen button:

```tsx
<button
  type="button"
  onClick={handleMaximizeOrFullscreen}
  aria-label={isAltKeyPressed ? 'Maximize window' : 'Enter fullscreen'}
  className={cn(
    'group flex h-3 w-3 cursor-default items-center justify-center rounded-full border text-center text-black/60 hover:bg-[#28c93f] hover:border-black/[.12] active:bg-[#1e9930] active:text-black/60 dark:border-none',
    isWindowFocused
      ? 'border-black/[.12] bg-[#28c93f]'
      : 'border-gray-400/20 bg-gray-400'
  )}
>
```

Replace with:

```tsx
<button
  type="button"
  onClick={handleMaximizeOrFullscreen}
  aria-label={isAltKeyPressed ? 'Maximize window' : 'Enter fullscreen'}
  className={cn(
    'group flex h-3 w-3 cursor-default items-center justify-center rounded-full border text-center text-black/60 transition-all duration-150 hover:opacity-100 hover:drop-shadow-[0_0_4px_#28c93f] active:bg-[#1e9930] active:text-black/60 dark:border-none',
    isWindowFocused
      ? 'border-black/[.12] bg-[#28c93f]'
      : 'border-gray-400/20 bg-gray-400',
    isWindowFocused ? 'opacity-70' : 'opacity-50'
  )}
>
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit src/components/titlebar/MacOSWindowControls.tsx`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/titlebar/MacOSWindowControls.tsx
git commit -m "feat(titlebar): add outline hover effects to MacOSWindowControls"
```

---

## Task 5: Verify implementation against spec

**Files:**
- Read: `docs/superpowers/specs/2026-05-24-custom-titlebar-design.md`

- [ ] **Step 1: Run full typecheck**

Run: `npm run typecheck` (or `npx tsc --noEmit`)
Expected: No errors

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: No errors

- [ ] **Step 3: Verify acceptance criteria**

Check each acceptance criteria from the spec:

1. ✅ Titlebar renders at top of app with 40px height — `h-10` in TitleBar.tsx
2. ✅ Logo appears on left, app name "AccuLedger" next to it — TitleBarLogo + TitleBarAppName in left section
3. ✅ Active tab name displays in center, updates when tabs change — TitleBarTabTitle reads from useTabStore
4. ✅ Window controls (minimize, maximize/restore, close) on right — Right section in TitleBar.tsx
5. ✅ Maximize icon reflects current state — WindowsWindowControls already has isMaximized state logic
6. ✅ Hover effects on window buttons — opacity + drop-shadow on hover
7. ✅ Background uses `--surface-container-low` — `bg-surface-container-low` class
8. ✅ All text uses theme CSS variables — `text-foreground/80`, `text-foreground/60`
9. ✅ Theme-aware via CSS variables — existing system
10. ✅ Platform-specific layouts preserved — platform check in TitleBar.tsx

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat(titlebar): complete custom theme-aware titlebar implementation"
```

---

## Spec Coverage Check

- [x] Logo left — Task 1, 2
- [x] App name — Task 1, 2
- [x] Tab title from store — Task 1, 2
- [x] Window controls right — Task 2, 3, 4
- [x] 40px height, centered — Task 2
- [x] Surface-container-low background — Task 2
- [x] Hover effects with glow — Task 3, 4
- [x] State-aware maximize — Task 3 (already implemented)
- [x] Theme variables — Task 2

**Plan complete.** Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?