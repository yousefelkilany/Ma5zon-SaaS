import { useEffect, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { usePlatform, type AppPlatform } from '@/hooks/use-platform'
import { useTabStore } from '@/store/tab-store'
import { MacOSWindowControls } from './MacOSWindowControls'
import { WindowsWindowControls } from './WindowsWindowControls'
import {
  TitleBarLogo,
  TitleBarAppName,
  TitleBarTabTitle,
} from './TitleBarContent'
import { t } from 'i18next'

interface TitleBarProps {
  className?: string
  /**
   * Force a specific platform for development/testing.
   * Only works in development builds.
   */
  forcePlatform?: AppPlatform
}

/**
 * Cross-platform title bar component.
 *
 * Renders platform-specific title bars:
 * - **macOS**: Custom title bar with traffic lights on LEFT
 * - **Windows/Linux**: Custom title bar with controls on RIGHT
 *
 * Use `forcePlatform` prop in development to test other platform layouts.
 */
export function TitleBar({ className, forcePlatform }: TitleBarProps) {
  const detectedPlatform = usePlatform()
  const tabs = useTabStore(state => state.tabs)
  const activeTabId = useTabStore(state => state.activeTabId)

  const platform =
    import.meta.env.DEV && forcePlatform ? forcePlatform : detectedPlatform

  const tabTitle = useMemo(
    () => tabs.find(t => t.id === activeTabId)?.title ?? '',
    [tabs, activeTabId]
  )

  useEffect(() => {
    const appName = t('titlebar.appName')
    document.title = tabTitle ? `${appName} - ${tabTitle}` : appName
    getCurrentWindow()
      .setTitle(document.title)
      .catch(e => console.warn('Failed to set window title:', e))
  }, [tabTitle])

  // TODO: On Linux with frameless windows, resize cursors don't appear at title bar top edge.
  // Possible causes: CSS cursor:default global rule, app-region:drag, or Tauri Linux WebView behavior.
  // Investigate further if resize from title bar edge is needed on Linux.

  const handleDoubleClick = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const window = getCurrentWindow()
    const isMaximized = await window.isMaximized()
    if (isMaximized) {
      await window.unmaximize()
    } else {
      await window.maximize()
    }
  }

  const handleMouseDown = async (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    const isInDragRegion =
      e.target === e.currentTarget || target.closest('[data-tauri-drag-region]')

    if (!isInDragRegion) return

    // Skip second click of double-click (detail=2) to allow dblclick to fire
    if (e.detail !== 1) return

    await getCurrentWindow().startDragging()
  }

  return (
    <div
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      className={cn(
        'relative flex h-10 w-full shrink-0 items-center justify-between',
        'bg-surface-container-low border-b border-outline-variant',
        className
      )}
      dir="ltr"
    >
      <div className="flex items-center gap-2 ps-2" data-tauri-drag-region>
        <TitleBarLogo />
        <TitleBarAppName />
      </div>

      <div
        className="absolute start-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center"
        data-tauri-drag-region
      >
        <TitleBarTabTitle title={tabTitle} />
      </div>

      <div
        className="flex items-center pe-2"
        onDoubleClick={e => e.stopPropagation()}
      >
        {platform === 'windows' || platform === 'linux' ? (
          <WindowsWindowControls />
        ) : (
          <MacOSWindowControls />
        )}
      </div>
    </div>
  )
}
