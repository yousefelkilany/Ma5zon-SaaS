import { Navbar } from './Navbar'
import { TabBar } from './TabBar'
import { SideBar } from './SideBar'
import { MainWindowContent } from './MainWindowContent'
import { TitleBar } from '@/components/titlebar/TitleBar'
import { CommandPalette } from '@/components/command-palette/CommandPalette'
import { Toaster } from 'sonner'
import { useTheme } from '@/hooks/use-theme'
import { useUIStore } from '@/store/ui-store'
import { useMainWindowEventListeners } from '@/hooks/useMainWindowEventListeners'

export function MainWindow() {
  const { theme } = useTheme()
  const sidebarVisible = useUIStore(state => state.sidebarVisible)

  // Set up global event listeners (keyboard shortcuts, etc.)
  useMainWindowEventListeners()

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden  bg-background">
      <header className="flex flex-col shrink-0 z-40">
        <TitleBar />
        <Navbar />
        <TabBar />
      </header>

      <div className="flex flex-1 overflow-hidden">
        {sidebarVisible && <SideBar />}
        <MainWindowContent />
      </div>

      {/* Global UI Components (hidden until triggered) */}
      <CommandPalette />
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
