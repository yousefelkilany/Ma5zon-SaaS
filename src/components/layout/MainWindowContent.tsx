import { useEffect, useRef } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { flushSync } from 'react-dom'
import { useTabStore } from '@/store/tab-store'
import { DashboardContent, NewTabContent } from '@/components/tabs'

export function MainWindowContent() {
  const navigate = useNavigate()
  const location = useLocation()
  const { tabs, activeTabId, setActiveTab: _setActiveTab } = useTabStore()
  const isNavigatingRef = useRef(false)

  // Sync both URL and active tab in a single effect to prevent feedback loops
  useEffect(() => {
    if (isNavigatingRef.current) return

    const activeTab = tabs.find(t => t.id === activeTabId)

    // Active tab changed → update URL to match
    if (activeTab && location.pathname !== `/${activeTab.type}`) {
      isNavigatingRef.current = true
      try {
        flushSync(() => navigate(`/${activeTab.type}`, { replace: true }))
      } finally {
        isNavigatingRef.current = false
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
        <Route path="*" element={<DashboardContent />} />
      </Routes>
    </div>
  )
}
