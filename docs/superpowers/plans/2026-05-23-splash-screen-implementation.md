# Splash Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the inline loading state in MainWindow with a branded splash screen that shows during app initialization for minimum 3 seconds.

**Architecture:** Pure React component that conditionally renders either the SplashScreen or MainWindow based on app ready state. Uses CSS variables for theming and Tailwind for layout/styling.

**Tech Stack:** React 19, Tailwind CSS v4, Lucide icons, existing Spinner component

---

### Task 1: Create SplashScreen Component

**Files:**
- Create: `src/components/splash/SplashScreen.tsx`
- Create: `src/components/splash/index.ts`

- [ ] **Step 1: Write SplashScreen component**

```tsx
import { useEffect, useState } from 'react'
import { Banknote, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SplashScreenProps {
  isReady: boolean
  minDuration?: number
}

function SplashScreen({ isReady, minDuration = 3000 }: SplashScreenProps) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const startTime = Date.now()

    const checkReady = () => {
      const elapsed = Date.now() - startTime
      if (isReady && elapsed >= minDuration) {
        setVisible(false)
      }
    }

    const interval = setInterval(checkReady, 100)
    return () => clearInterval(interval)
  }, [isReady, minDuration])

  if (!visible) return null

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex flex-col items-center justify-center bg-background transition-opacity duration-500 ease-out',
        !visible && 'opacity-0 pointer-events-none'
      )}
    >
      <main className="flex flex-1 flex-col items-center justify-center space-y-8">
        <div className="h-[120px] w-[120px] flex items-center justify-center">
          <Banknote className="h-16 w-16 text-secondary" />
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Ma5zon
          </h1>
          <p className="text-base text-muted-foreground opacity-70">
            Precision in every transaction.
          </p>
        </div>

        <div className="flex items-center justify-center pt-12">
          <Loader2 className="h-6 w-6 animate-spin text-secondary" />
        </div>
      </main>

      <footer className="flex w-full justify-center pb-10">
        <p className="text-sm text-muted-foreground opacity-50">
          © 2026 Ma5zon v0.1.0
        </p>
      </footer>
    </div>
  )
}

export { SplashScreen }
export type { SplashScreenProps }
```

- [ ] **Step 2: Write index.ts re-export**

```ts
export { SplashScreen } from './SplashScreen'
export type { SplashScreenProps } from './SplashScreen'
```

- [ ] **Step 3: Commit**

```bash
git add src/components/splash/SplashScreen.tsx src/components/splash/index.ts
git commit -m "feat: add SplashScreen component"
```

---

### Task 2: Add Logo Image with Fallback

**Files:**
- Create: `src/assets/logo.png` (user will add actual file)
- Modify: `src/components/splash/SplashScreen.tsx`

- [ ] **Step 1: Update SplashScreen to use logo with fallback**

Replace the Banknote icon with logo image that falls back to icon:

```tsx
import { useState } from 'react'
import { Banknote, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import logoUrl from '@/assets/logo.png'

interface SplashScreenProps {
  isReady: boolean
  minDuration?: number
}

function SplashScreen({ isReady, minDuration = 3000 }: SplashScreenProps) {
  const [visible, setVisible] = useState(true)
  const [logoError, setLogoError] = useState(false)

  useEffect(() => {
    const startTime = Date.now()

    const checkReady = () => {
      const elapsed = Date.now() - startTime
      if (isReady && elapsed >= minDuration) {
        setVisible(false)
      }
    }

    const interval = setInterval(checkReady, 100)
    return () => clearInterval(interval)
  }, [isReady, minDuration])

  if (!visible) return null

  const LogoIcon: LucideIcon = Banknote

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex flex-col items-center justify-center bg-background transition-opacity duration-500 ease-out',
        !visible && 'opacity-0 pointer-events-none'
      )}
    >
      <main className="flex flex-1 flex-col items-center justify-center space-y-8">
        <div className="h-[120px] w-[120px] flex items-center justify-center">
          {!logoError ? (
            <img
              src={logoUrl}
              alt="Ma5zon Logo"
              className="h-full w-full object-contain"
              onError={() => setLogoError(true)}
            />
          ) : (
            <LogoIcon className="h-16 w-16 text-secondary" />
          )}
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Ma5zon
          </h1>
          <p className="text-base text-muted-foreground opacity-70">
            Precision in every transaction.
          </p>
        </div>

        <div className="flex items-center justify-center pt-12">
          <Loader2 className="h-6 w-6 animate-spin text-secondary" />
        </div>
      </main>

      <footer className="flex w-full justify-center pb-10">
        <p className="text-sm text-muted-foreground opacity-50">
          © 2026 Ma5zon v0.1.0
        </p>
      </footer>
    </div>
  )
}

export { SplashScreen }
export type { SplashScreenProps }
```

- [ ] **Step 2: Update index.ts with new export**

```ts
export { SplashScreen } from './SplashScreen'
export type { SplashScreenProps } from './SplashScreen'
```

- [ ] **Step 3: Commit**

```bash
git add src/components/splash/SplashScreen.tsx
git commit -m "feat: add logo fallback to SplashScreen"
```

---

### Task 3: Integrate SplashScreen into App

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Update App.tsx to track app ready state and render SplashScreen**

Replace current App.tsx content:

```tsx
import { useEffect, useState } from 'react'
import { check } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'
import { initializeCommandSystem } from './lib/commands'
import { buildAppMenu, setupMenuLanguageListener } from './lib/menu'
import { initializeLanguage } from './i18n/language-init'
import { logger } from './lib/logger'
import { cleanupOldFiles } from './lib/recovery'
import { commands } from './lib/tauri-bindings'
import './App.css'
import { MainWindow } from './components/layout/MainWindow'
import { ThemeProvider } from './components/ThemeProvider'
import { ErrorBoundary } from './components/ErrorBoundary'
import { useSquareCornersEffect } from './hooks/useSquareCornersEffect'
import { SplashScreen } from './components/splash'

function App() {
  useSquareCornersEffect()
  const [isAppReady, setIsAppReady] = useState(false)

  useEffect(() => {
    logger.info('🚀 Frontend application starting up')
    initializeCommandSystem()
    logger.debug('Command system initialized')

    const initLanguageAndMenu = async () => {
      try {
        const result = await commands.loadPreferences()
        const savedLanguage =
          result.status === 'ok' ? result.data.language : null

        await initializeLanguage(savedLanguage)
        await buildAppMenu()
        logger.debug('Application menu built')
        setupMenuLanguageListener()
      } catch (error) {
        logger.warn('Failed to initialize language or menu', { error })
      }
    }

    const initApp = async () => {
      await initLanguageAndMenu()

      try {
        await cleanupOldFiles()
      } catch (error) {
        logger.warn('Failed to cleanup old recovery files', { error })
      }

      logger.info('App environment', {
        isDev: import.meta.env.DEV,
        mode: import.meta.env.MODE,
      })

      setIsAppReady(true)
    }

    initApp()

    const checkForUpdates = async () => {
      try {
        const update = await check()
        if (update) {
          logger.info(`Update available: ${update.version}`)

          const shouldUpdate = confirm(
            `Update available: ${update.version}\n\nWould you like to install this update now?`
          )

          if (shouldUpdate) {
            try {
              await update.downloadAndInstall((event) => {
                switch (event.event) {
                  case 'Started':
                    logger.info(`Downloading ${event.data.contentLength} bytes`)
                    break
                  case 'Progress':
                    logger.info(`Downloaded: ${event.data.chunkLength} bytes`)
                    break
                  case 'Finished':
                    logger.info('Download complete, installing...')
                    break
                }
              })

              const shouldRestart = confirm(
                'Update completed successfully!\n\nWould you like to restart the app now to use the new version?'
              )

              if (shouldRestart) {
                await relaunch()
              }
            } catch (updateError) {
              logger.error(`Update installation failed: ${String(updateError)}`)
              alert(
                `Update failed: There was a problem with the automatic download.\n\n${String(updateError)}`
              )
            }
          }
        }
      } catch (checkError) {
        logger.error(`Update check failed: ${String(checkError)}`)
      }
    }

    const updateTimer = setTimeout(checkForUpdates, 5000)
    return () => clearTimeout(updateTimer)
  }, [])

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <SplashScreen isReady={isAppReady} minDuration={3000} />
        <MainWindow />
      </ThemeProvider>
    </ErrorBoundary>
  )
}

export default App
```

- [ ] **Step 2: Commit**

```bash
git add src/App.tsx
git commit -m "feat: integrate SplashScreen into App with ready state tracking"
```

---

### Task 4: Run TypeScript and Lint Checks

- [ ] **Step 1: Run typecheck**

Run: `cd /mnt/C/Accountant-SaaS && pnpm run typecheck`
Expected: No errors (may need to add @types/node if logo import causes issues)

- [ ] **Step 2: Run lint**

Run: `pnpm run lint`
Expected: No warnings or errors

- [ ] **Step 3: Fix any issues if needed**

- [ ] **Step 4: Commit if changes made**

---

### Task 5: Test in Browser (Manual Verification)

**Note:** This is a Tauri app, so `pnpm run dev` will not work directly. You need to run `pnpm run tauri:dev` to test.

- [ ] **Step 1: Run tauri dev**

Run: `pnpm run tauri:dev`
Expected: App window opens showing splash screen for minimum 3 seconds, then transitions to main window

- [ ] **Step 2: Verify splash screen displays correctly**
- Logo (or fallback icon) visible
- "Ma5zon" brand name visible
- "Precision in every transaction." tagline visible
- Spinner animating
- Copyright footer visible

- [ ] **Step 3: Verify transition to main window**
- Splash fades out after 3+ seconds and initialization completes
- Main window with sidebars and content appears

---

## Spec Coverage

| Spec Requirement | Task |
|------------------|------|
| Logo from src/assets/logo.png with fallback | Task 2 |
| Ma5zon brand name | Task 1 |
| Spinner instead of progress bar | Task 1 |
| Minimum 3 second display | Task 1 (minDuration prop) |
| Disappears after initialization | Task 3 (isReady state) |
| Dark theme colors | Task 1 (uses theme variables) |
| Centered layout | Task 1 |
| Footer with copyright | Task 1 |

## Files Changed Summary

| File | Action |
|------|--------|
| `src/components/splash/SplashScreen.tsx` | Create |
| `src/components/splash/index.ts` | Create |
| `src/App.tsx` | Modify |

**Total: 2 new files, 1 modified**