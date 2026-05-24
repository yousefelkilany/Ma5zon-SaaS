import { useMemo } from 'react'
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
  const tabTitle = useMemo(() => tabs.find(t => t.id === activeTabId)?.title ?? '', [tabs, activeTabId])

  const platform =
    import.meta.env.DEV && forcePlatform ? forcePlatform : detectedPlatform

  const handleDoubleClick = async () => {
    const window = getCurrentWindow()
    const isMaximized = await window.isMaximized()
    if (isMaximized) {
      await window.unmaximize()
    } else {
      await window.maximize()
    }
  }

  return (
    <div
      data-tauri-drag-region
      onDoubleClick={handleDoubleClick}
      className={cn(
        'relative flex h-10 w-full shrink-0 items-center justify-between',
        'bg-surface-container-low border-b border-outline-variant',
        className
      )}
      dir="ltr"
    >
      <div className="flex items-center gap-2 ps-2">
        <TitleBarLogo />
        <TitleBarAppName />
      </div>

      <div className="absolute start-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center">
        <TitleBarTabTitle title={tabTitle} />
      </div>

      <div className="flex items-center pe-2">
        {platform === 'windows' || platform === 'linux' ? (
          <WindowsWindowControls />
        ) : (
          <MacOSWindowControls />
        )}
      </div>
    </div>
  )
}
