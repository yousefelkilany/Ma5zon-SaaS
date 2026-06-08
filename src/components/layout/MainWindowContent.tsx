import { useEffect, useRef } from 'react'
import { useNavigate, useLocation } from '@tanstack/react-router'
import { useTabStore } from '@/store/workspace-store'
import { ModalManager } from '@/components/modal/ModalManager'

export function MainWindowContent() {
  const navigate = useNavigate()
  const location = useLocation()
  const activeTabId = useTabStore(state => state.activeTabId)
  const tabs = useTabStore(state => state.tabs)
  const isNavigatingRef = useRef(false)

  useEffect(() => {
    if (isNavigatingRef.current) return

    const activeTab = tabs.find(t => t.id === activeTabId)

    if (activeTab) {
      let targetPath = ''
      if (activeTab.type === 'entity' && activeTab.entityType) {
        targetPath = `/entity/${activeTab.entityType}`
      } else {
        targetPath = `/${activeTab.type}`
      }

      if (location.pathname !== targetPath) {
        isNavigatingRef.current = true
        navigate({ to: targetPath, search: {} })
        isNavigatingRef.current = false
      }
    }
  }, [location.pathname, activeTabId, tabs, navigate])

  return (
    <div className="flex h-full flex-col bg-background">
      <ModalManager />
    </div>
  )
}
