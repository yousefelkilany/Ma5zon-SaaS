import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { useTabStore } from '@/store/tab-store'
import { DashboardContent, NewTabContent } from '@/components/tabs'
import { cn } from '@/lib/utils'

interface MainWindowContentProps {
  children?: React.ReactNode
  className?: string
}

export function MainWindowContent({
  children,
  className,
}: MainWindowContentProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { tabs, activeTabId, setActiveTab } = useTabStore()

  useEffect(() => {
    const path = location.pathname.replace('/', '') || 'dashboard'
    const matchingTab = tabs.find(t => t.type === path)
    if (matchingTab && matchingTab.id !== activeTabId) {
      setActiveTab(matchingTab.id)
    }
  }, [location.pathname])

  useEffect(() => {
    const activeTab = tabs.find(t => t.id === activeTabId)
    if (activeTab && location.pathname !== `/${activeTab.type}`) {
      navigate(`/${activeTab.type}`, { replace: true })
    }
  }, [activeTabId])

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
