import { Navbar } from './Navbar'
import { TabBar } from './TabBar'
import { LeftSideBar } from './LeftSideBar'
import { MainWindowContent } from './MainWindowContent'
import { CommandPalette } from '@/components/command-palette/CommandPalette'
import { PreferencesDialog } from '@/components/preferences/PreferencesDialog'
import { Toaster } from 'sonner'
import { useTheme } from '@/hooks/use-theme'
import { useUIStore } from '@/store/ui-store'
import { useMainWindowEventListeners } from '@/hooks/useMainWindowEventListeners'

export function MainWindow() {
  const { theme } = useTheme()
  const leftSidebarVisible = useUIStore(state => state.leftSidebarVisible)

  // Set up global event listeners (keyboard shortcuts, etc.)
  useMainWindowEventListeners()

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden  bg-background">
      <header className="flex flex-col shrink-0 z-40">
        <Navbar />
        <TabBar />
      </header>

      <div className="flex flex-1 overflow-hidden">
        {leftSidebarVisible && <LeftSideBar />}
        <MainWindowContent />
      </div>

      {/* Global UI Components (hidden until triggered) */}
      <CommandPalette />
      <PreferencesDialog />
      <Toaster
        position="bottom-right"
        theme={
          theme === 'dark' ? 'dark' : theme === 'light' ? 'light' : 'system'
        }
        className="toaster group"
        toastOptions={{
          classNames: {
            toast:
              'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
            description: 'group-[.toast]:text-muted-foreground',
            actionButton:
              'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
            cancelButton:
              'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
          },
        }}
      />
    </div>
  )
}
