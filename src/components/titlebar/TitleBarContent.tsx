import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { useUIStore } from '@/store/ui-store'
import { executeCommand, useCommandContext } from '@/lib/commands'
import {
  PanelLeft,
  PanelLeftClose,
  PanelRight,
  PanelRightClose,
  Settings,
} from 'lucide-react'

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

/**
 * Left-side toolbar actions (sidebar toggle).
 * Place this after window controls on macOS, or at the start on Windows/Linux.
 */
export function TitleBarLeftActions() {
  const { t } = useTranslation()
  const leftSidebarVisible = useUIStore(state => state.leftSidebarVisible)
  const toggleLeftSidebar = useUIStore(state => state.toggleLeftSidebar)

  return (
    <div className="flex items-center gap-1">
      <Button
        onClick={toggleLeftSidebar}
        variant="ghost"
        size="icon"
        className="h-6 w-6 text-foreground/70 hover:text-foreground"
        title={t(
          leftSidebarVisible
            ? 'titlebar.hideLeftSidebar'
            : 'titlebar.showLeftSidebar'
        )}
      >
        {leftSidebarVisible ? (
          <PanelLeftClose className="h-3 w-3" />
        ) : (
          <PanelLeft className="h-3 w-3" />
        )}
      </Button>
    </div>
  )
}

/**
 * Right-side toolbar actions (settings, sidebar toggle).
 * Place this before window controls on Windows, or at the end on macOS/Linux.
 */
export function TitleBarRightActions() {
  const { t } = useTranslation()
  const rightSidebarVisible = useUIStore(state => state.rightSidebarVisible)
  const toggleRightSidebar = useUIStore(state => state.toggleRightSidebar)
  const commandContext = useCommandContext()

  const handleOpenPreferences = async () => {
    const result = await executeCommand('open-preferences', commandContext)
    if (!result.success && result.error) {
      commandContext.showToast(result.error, 'error')
    }
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        onClick={handleOpenPreferences}
        variant="ghost"
        size="icon"
        className="h-6 w-6 text-foreground/70 hover:text-foreground"
        title={t('titlebar.settings')}
      >
        <Settings className="h-3 w-3" />
      </Button>

      <Button
        onClick={toggleRightSidebar}
        variant="ghost"
        size="icon"
        className="h-6 w-6 text-foreground/70 hover:text-foreground"
        title={t(
          rightSidebarVisible
            ? 'titlebar.hideRightSidebar'
            : 'titlebar.showRightSidebar'
        )}
      >
        {rightSidebarVisible ? (
          <PanelRightClose className="h-3 w-3" />
        ) : (
          <PanelRight className="h-3 w-3" />
        )}
      </Button>
    </div>
  )
}

interface TitleBarTitleProps {
  title?: string
}

/**
 * Centered title for the title bar.
 * Uses absolute positioning to stay centered regardless of other content.
 */
export function TitleBarTitle({ title = 'Tauri App' }: TitleBarTitleProps) {
  return (
    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
      <span className="text-sm font-medium text-foreground/80">{title}</span>
    </div>
  )
}

/**
 * Combined toolbar content for simple layouts.
 * Use this for Linux or when you want all toolbar items in one fragment.
 *
 * For more control, use TitleBarLeftActions, TitleBarRightActions, and TitleBarTitle separately.
 */
export function TitleBarContent({ title = 'Tauri App' }: TitleBarTitleProps) {
  return (
    <>
      <TitleBarLeftActions />
      <TitleBarTitle title={title} />
      <TitleBarRightActions />
    </>
  )
}
