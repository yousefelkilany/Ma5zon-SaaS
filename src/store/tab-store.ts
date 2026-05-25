import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { Tab, TabType } from '@/lib/utils'

const DEFAULT_DASHBOARD_TAB = {
  id: 'dashboard',
  title: 'Dashboard',
  type: 'dashboard' as const,
  closable: false,
}

function generateId(): string {
  return crypto.randomUUID()
}

interface TabState {
  tabs: Tab[]
  activeTabId: string

  addTab: (tab: Omit<Tab, 'id'>) => string
  removeTab: (tabId: string) => void
  setActiveTab: (tabId: string) => void
  getActiveTab: () => Tab | undefined
  getTabByType: (type: TabType) => Tab | undefined
  getTabByEntityType: (entityType: string) => Tab | undefined
}

export const useTabStore = create<TabState>()(
  devtools(
    (set, get) => ({
      tabs: [DEFAULT_DASHBOARD_TAB],
      activeTabId: 'dashboard',

      addTab: (tabData) => {
        const newTab: Tab = {
          ...tabData,
          id: generateId(),
        }
        set(state => ({
          tabs: [...state.tabs, newTab],
          activeTabId: newTab.id,
        }))
        return newTab.id
      },

      removeTab: (tabId) => {
        const { tabs, activeTabId } = get()
        const tab = tabs.find(t => t.id === tabId)
        if (!tab || !tab.closable) return

        const newTabs = tabs.filter(t => t.id !== tabId)

        const dashboardTab = newTabs.find(t => t.type === 'dashboard')
        const otherTabs = newTabs.filter(t => t.type !== 'dashboard')
        const reorderedTabs = dashboardTab ? [dashboardTab, ...otherTabs] : newTabs

        let newActiveId = activeTabId
        if (activeTabId === tabId) {
          const closedIndex = tabs.findIndex(t => t.id === tabId)
          newActiveId = reorderedTabs[Math.min(closedIndex, reorderedTabs.length - 1)]?.id || 'dashboard'
        }

        set({ tabs: reorderedTabs, activeTabId: newActiveId })
      },

      setActiveTab: (tabId) => {
        set({ activeTabId: tabId })
      },

      getActiveTab: () => {
        const { tabs, activeTabId } = get()
        return tabs.find(t => t.id === activeTabId)
      },

      getTabByType: (type) => {
        const { tabs } = get()
        return tabs.find(t => t.type === type)
      },

      getTabByEntityType: (entityType) => {
        const { tabs } = get()
        return tabs.find(t => t.entityType === entityType)
      },
    }),
    { name: 'tab-store' }
  )
)