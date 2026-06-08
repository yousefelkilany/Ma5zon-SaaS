import { useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from '@tanstack/react-router'
import { useTabStore } from '@/store/workspace-store'
import { ModalManager } from '@/components/modal/ModalManager'

export function MainWindowContent() {
  const navigate = useNavigate()
  const location = useLocation()
  const activeTabId = useTabStore(state => state.activeTabId)
  const tabs = useTabStore(state => state.tabs)

  useEffect(() => {
    const activeTab = tabs.find(t => t.id === activeTabId)
    if (!activeTab) return

    const targetPath =
      activeTab.type === 'entity' && activeTab.entityType
        ? `/entity/${activeTab.entityType}`
        : `/${activeTab.type}`

    if (location.pathname !== targetPath) {
      navigate({ to: targetPath, search: {} })
    }
  }, [activeTabId, tabs, navigate, location.pathname])

  return (
    <div className="flex h-full flex-col bg-background">
      <Outlet />
      <ModalManager />
    </div>
  )
}
