import { create } from 'zustand'
import type { Tab, TabType } from '@/lib/utils'
import { t } from 'i18next'

const DEFAULT_DASHBOARD_TAB = {
  id: 'dashboard',
  title: t('common.dashboard'),
  type: 'dashboard' as const,
  closable: false,
}

function generateId(): string {
  return crypto.randomUUID()
}

interface TabUIState {
  selectedIds: Record<string, boolean>
  expandedIds: Record<string, boolean>
  sort: { columnId: string; direction: 'asc' | 'desc' } | null
  filters: {
    columnId: string
    operator:
      | 'eq'
      | 'neq'
      | 'contains'
      | 'gt'
      | 'lt'
      | 'gte'
      | 'lte'
      | 'between'
    value: string | number | [number, number]
  }[]
  searchValue: string
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
}

interface TabState {
  tabs: Tab[]
  activeTabId: string
  tabUIStates: Record<string, TabUIState>

  addTab: (tab: Omit<Tab, 'id'>) => string
  removeTab: (tabId: string) => void
  setActiveTab: (tabId: string) => void
  getActiveTab: () => Tab | undefined
  getTabByType: (type: TabType) => Tab | undefined
  getTabByEntityType: (entityType: string) => Tab | undefined

  getSelectedIds: () => Record<string, boolean>
  setSelectedIds: (ids: Record<string, boolean>) => void
  toggleExpanded: (id: string) => void
  isExpanded: (id: string) => boolean
  setSort: (
    sort: { columnId: string; direction: 'asc' | 'desc' } | null
  ) => void
  setFilters: (
    filters: {
      columnId: string
      operator:
        | 'eq'
        | 'neq'
        | 'contains'
        | 'gt'
        | 'lt'
        | 'gte'
        | 'lte'
        | 'between'
      value: string | number | [number, number]
    }[]
  ) => void
  setSearchValue: (value: string) => void
  setPage: (page: number, pageSize?: number) => void
  setPaginationTotal: (
    totalCount: number,
    totalPages: number,
    tabId?: string
  ) => void
}

const defaultUIState: TabUIState = {
  selectedIds: {},
  expandedIds: {},
  sort: null,
  filters: [],
  searchValue: '',
  page: 1,
  pageSize: 10,
  totalCount: 0,
  totalPages: 1,
}

function ensureUIState(state: TabState, tabId: string): TabUIState {
  return state.tabUIStates[tabId] ?? { ...defaultUIState }
}

export const useTabStore = create<TabState>()((set, get) => ({
  tabs: [DEFAULT_DASHBOARD_TAB],
  activeTabId: 'dashboard',
  tabUIStates: {},

  addTab: tabData => {
    const newTab: Tab = {
      ...tabData,
      id: generateId(),
    }
    set(state => ({
      tabs: [...state.tabs, newTab],
      activeTabId: newTab.id,
      tabUIStates: { ...state.tabUIStates, [newTab.id]: { ...defaultUIState } },
    }))
    return newTab.id
  },

  removeTab: tabId => {
    const { tabs, activeTabId, tabUIStates } = get()
    const tab = tabs.find(t => t.id === tabId)
    if (!tab || !tab.closable) return

    const newTabs = tabs.filter(t => t.id !== tabId)
    const { [tabId]: _, ...remainingUIStates } = tabUIStates

    const dashboardTab = newTabs.find(t => t.type === 'dashboard')
    const otherTabs = newTabs.filter(t => t.type !== 'dashboard')
    const reorderedTabs = dashboardTab ? [dashboardTab, ...otherTabs] : newTabs

    let newActiveId = activeTabId
    if (activeTabId === tabId) {
      const closedIndex = tabs.findIndex(t => t.id === tabId)
      newActiveId =
        reorderedTabs[Math.min(closedIndex, reorderedTabs.length - 1)]?.id ||
        'dashboard'
    }

    set({
      tabs: reorderedTabs,
      activeTabId: newActiveId,
      tabUIStates: remainingUIStates,
    })
  },

  setActiveTab: tabId => {
    set({ activeTabId: tabId })
  },

  getActiveTab: () => {
    const { tabs, activeTabId } = get()
    return tabs.find(t => t.id === activeTabId)
  },

  getTabByType: type => {
    const { tabs } = get()
    return tabs.find(t => t.type === type)
  },

  getTabByEntityType: entityType => {
    const { tabs } = get()
    return tabs.find(t => t.entityType === entityType)
  },

  getSelectedIds: () => {
    const state = get()
    return ensureUIState(state, state.activeTabId).selectedIds
  },

  setSelectedIds: ids => {
    const { activeTabId } = get()
    set(state => {
      const current = ensureUIState(state, activeTabId)
      return {
        tabUIStates: {
          ...state.tabUIStates,
          [activeTabId]: { ...current, selectedIds: ids },
        },
      }
    })
  },

  toggleExpanded: id => {
    const { activeTabId } = get()
    set(state => {
      const current = ensureUIState(state, activeTabId)
      const expandedIds = { ...current.expandedIds }
      if (expandedIds[id]) {
        const { [id]: _, ...rest } = expandedIds
        return {
          tabUIStates: {
            ...state.tabUIStates,
            [activeTabId]: { ...current, expandedIds: rest },
          },
        }
      } else {
        expandedIds[id] = true
        return {
          tabUIStates: {
            ...state.tabUIStates,
            [activeTabId]: { ...current, expandedIds },
          },
        }
      }
    })
  },

  isExpanded: id => {
    const state = get()
    return ensureUIState(state, state.activeTabId).expandedIds[id] === true
  },

  setSort: sort => {
    const { activeTabId } = get()
    set(state => {
      const current = ensureUIState(state, activeTabId)
      return {
        tabUIStates: {
          ...state.tabUIStates,
          [activeTabId]: { ...current, sort, page: 1 },
        },
      }
    })
  },

  setFilters: filters => {
    const { activeTabId } = get()
    set(state => {
      const current = ensureUIState(state, activeTabId)
      return {
        tabUIStates: {
          ...state.tabUIStates,
          [activeTabId]: { ...current, filters, page: 1 },
        },
      }
    })
  },

  setSearchValue: searchValue => {
    const { activeTabId } = get()
    set(state => {
      const current = ensureUIState(state, activeTabId)
      return {
        tabUIStates: {
          ...state.tabUIStates,
          [activeTabId]: { ...current, searchValue },
        },
      }
    })
  },

  setPage: (page, pageSize) => {
    const { activeTabId } = get()
    set(state => {
      const current = ensureUIState(state, activeTabId)
      return {
        tabUIStates: {
          ...state.tabUIStates,
          [activeTabId]: {
            ...current,
            page,
            ...(pageSize !== undefined ? { pageSize } : {}),
          },
        },
      }
    })
  },

  setPaginationTotal: (
    totalCount: number,
    totalPages: number,
    tabId?: string
  ) => {
    const { activeTabId } = get()
    const targetTabId = tabId ?? activeTabId
    set(state => {
      const current = ensureUIState(state, targetTabId)
      return {
        tabUIStates: {
          ...state.tabUIStates,
          [targetTabId]: {
            ...current,
            totalCount,
            totalPages,
          },
        },
      }
    })
  },
}))
