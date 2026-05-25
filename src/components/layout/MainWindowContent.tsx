import { useEffect, useRef } from 'react'
import { Routes, Route, useNavigate, useLocation, useParams } from 'react-router-dom'
import { flushSync } from 'react-dom'
import { useTabStore } from '@/store/tab-store'
import { DashboardContent, NewTabContent } from '@/components/tabs'
import { EntityWorkspace } from '@/components/entity'

export function MainWindowContent() {
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams()
  const { tabs, activeTabId, setActiveTab: _setActiveTab } = useTabStore()
  const isNavigatingRef = useRef(false)

  // Sync both URL and active tab in a single effect to prevent feedback loops
  useEffect(() => {
    if (isNavigatingRef.current) return

    const activeTab = tabs.find(t => t.id === activeTabId)

    // Active tab changed → update URL to match
    if (activeTab) {
      let targetPath = ''
      if (activeTab.type === 'entity' && activeTab.entityType) {
        targetPath = `/entity/${activeTab.entityType}`
      } else {
        targetPath = `/${activeTab.type}`
      }

      if (location.pathname !== targetPath) {
        isNavigatingRef.current = true
        try {
          flushSync(() => navigate(targetPath, { replace: true }))
        } finally {
          isNavigatingRef.current = false
        }
      }
    }
  }, [location.pathname, activeTabId, tabs, navigate])

  return (
    <div className="flex h-full flex-col bg-background">
      <Routes>
        <Route path="/dashboard" element={<DashboardContent />} />
        <Route path="/new-tab" element={<NewTabContent />} />
        <Route path="/sales-invoice" element={<NewTabContent />} />
        <Route path="/purchase-invoice" element={<NewTabContent />} />
        {/* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */}
        <Route path="/entity/:entityType" element={<EntityWorkspace entityType={params.entityType!} />} />
        <Route path="*" element={<DashboardContent />} />
      </Routes>
    </div>
  )
}
