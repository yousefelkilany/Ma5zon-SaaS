import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { useTabStore } from '@/store/tab-store'
import { WindowsWindowControls } from './WindowsWindowControls'
import {
  TitleBarLogo,
  TitleBarAppName,
  TitleBarTabTitle,
} from './TitleBarContent'

interface LinuxTitleBarProps {
  className?: string
}

/**
 * Linux title bar / toolbar.
 *
 * Since decorations: false is set in tauri.conf.json, we need custom window controls.
 * This component renders the custom titlebar content with Logo, AppName, TabTitle,
 * and window controls (minimize/maximize/close).
 */
export function LinuxTitleBar({ className }: LinuxTitleBarProps) {
  const tabs = useTabStore(state => state.tabs)
  const activeTabId = useTabStore(state => state.activeTabId)
  const tabTitle = useMemo(() => tabs.find(t => t.id === activeTabId)?.title ?? '', [tabs, activeTabId])

  return (
    <div
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

      {/* Right: Window Controls */}
      <div className="flex items-center pr-2">
        <WindowsWindowControls />
      </div>
    </div>
  )
}
