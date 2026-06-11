import { create } from 'zustand'
import type { Tab, TabType } from '@/lib/utils'
import type { ColumnDef, FilterState, SortState } from '@/lib/types/entity'
import type { ModalFrame } from '@/lib/types/modal-frame'
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
  page: number
  pageSize: number
  totalCount: number
  totalPages: number

  sort?: SortState
  filters: FilterState[]
  searchValue?: string
  localColumns: ColumnDef[]

  filterDialogOpen: boolean
  columnDialogOpen: boolean
  deleteDialogOpen: boolean

  selectedIds: Record<string, boolean>
  expandedIds: Record<string, boolean>

  modalStack: ModalFrame[]
  createDraft?: Record<string, unknown>
  editDraft?: Record<string, unknown>
  isDirty: boolean
}

export const defaultUIState: TabUIState = {
  page: 1,
  pageSize: 10,
  totalCount: 0,
  totalPages: 1,

  filters: [],
  localColumns: [],

  filterDialogOpen: false,
  columnDialogOpen: false,
  deleteDialogOpen: false,

  selectedIds: {},
  expandedIds: {},

  modalStack: [],
  isDirty: false,
}

interface WorkspaceState {
  tabs: Tab[]
  activeTabId: string
  tabUIStates: Record<string, TabUIState>

  addTab: (tab: Omit<Tab, 'id'>) => string
  removeTab: (tabId: string) => void
  setActiveTab: (tabId: string) => void
  getActiveTab: () => Tab | undefined
  getTabByType: (type: TabType) => Tab | undefined
  getTabByEntityType: (entityType: string) => Tab | undefined

  setSelectedIds: (ids: Record<string, boolean>) => void
  toggleExpanded: (id: string) => void
  isExpanded: (id: string) => boolean
  setSort: (sort?: SortState) => void
  setFilters: (filters: FilterState[]) => void
  setSearchValue: (value?: string) => void
  setPage: (page: number, pageSize?: number) => void
  setPaginationTotal: (
    totalCount: number,
    totalPages: number,
    tabId?: string
  ) => void
  setFilterDialogOpen: (open: boolean) => void
  setColumnDialogOpen: (open: boolean) => void
  setDeleteDialogOpen: (open: boolean) => void
  setLocalColumns: (columns: ColumnDef[]) => void

  pushModal: (frame: ModalFrame) => void
  popModal: () => void
  clearModalStack: () => void

  setCreateDraft: (draft: Record<string, unknown> | undefined) => void
  setEditDraft: (draft: Record<string, unknown> | undefined) => void
  setIsDirty: (dirty: boolean) => void
  clearTabDrafts: () => void
}

function ensureUIState(state: WorkspaceState, tabId: string): TabUIState {
  const existing = state.tabUIStates[tabId]
  if (existing) return existing
  return {
    ...defaultUIState,
  }
}

function ensureTabUIState(
  state: WorkspaceState,
  tabId: string
): TabUIState {
  return state.tabUIStates[tabId] ?? { ...defaultUIState }
}

function shallowEqualFrame(a: ModalFrame, b: ModalFrame): boolean {
  return (
    a.entity_modal === b.entity_modal &&
    a.entity_id === b.entity_id &&
    (a.product_id ?? undefined) === (b.product_id ?? undefined)
  )
}

export const useTabStore = create<WorkspaceState>()((set, get) => ({
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
          [activeTabId]: {
            ...current,
            filters: filters,
            page: 1,
          },
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

  setFilterDialogOpen: open => {
    const { activeTabId } = get()
    set(state => {
      const current = ensureUIState(state, activeTabId)
      return {
        tabUIStates: {
          ...state.tabUIStates,
          [activeTabId]: {
            ...current,
            filterDialogOpen: open,
          },
        },
      }
    })
  },

  setColumnDialogOpen: open => {
    const { activeTabId } = get()
    set(state => {
      const current = ensureUIState(state, activeTabId)
      return {
        tabUIStates: {
          ...state.tabUIStates,
          [activeTabId]: {
            ...current,
            columnDialogOpen: open,
          },
        },
      }
    })
  },

  setDeleteDialogOpen: open => {
    const { activeTabId } = get()
    set(state => {
      const current = ensureUIState(state, activeTabId)
      return {
        tabUIStates: {
          ...state.tabUIStates,
          [activeTabId]: {
            ...current,
            deleteDialogOpen: open,
          },
        },
      }
    })
  },

  setLocalColumns: columns => {
    const { activeTabId } = get()
    set(state => {
      const current = ensureUIState(state, activeTabId)
      return {
        tabUIStates: {
          ...state.tabUIStates,
          [activeTabId]: {
            ...current,
            localColumns: columns,
          },
        },
      }
    })
  },

  pushModal: frame => {
    set(state => {
      const tabId = state.activeTabId
      const current = ensureTabUIState(state, tabId)
      const stack = current.modalStack
      const lastFrame = stack[stack.length - 1]
      if (stack.length > 0 && lastFrame && shallowEqualFrame(lastFrame, frame)) {
        return state
      }
      return {
        tabUIStates: {
          ...state.tabUIStates,
          [tabId]: { ...current, modalStack: [...stack, frame] },
        },
      }
    })
  },

  popModal: () => {
    set(state => {
      const tabId = state.activeTabId
      const current = state.tabUIStates[tabId]
      if (!current || current.modalStack.length === 0) return state
      return {
        tabUIStates: {
          ...state.tabUIStates,
          [tabId]: {
            ...current,
            modalStack: current.modalStack.slice(0, -1),
          },
        },
      }
    })
  },

  clearModalStack: () => {
    set(state => {
      const tabId = state.activeTabId
      const current = state.tabUIStates[tabId]
      if (!current) return state
      return {
        tabUIStates: {
          ...state.tabUIStates,
          [tabId]: { ...current, modalStack: [] },
        },
      }
    })
  },

  setCreateDraft: draft => {
    set(state => {
      const tabId = state.activeTabId
      const current = ensureTabUIState(state, tabId)
      return {
        tabUIStates: {
          ...state.tabUIStates,
          [tabId]: { ...current, createDraft: draft },
        },
      }
    })
  },

  setEditDraft: draft => {
    set(state => {
      const tabId = state.activeTabId
      const current = ensureTabUIState(state, tabId)
      return {
        tabUIStates: {
          ...state.tabUIStates,
          [tabId]: { ...current, editDraft: draft },
        },
      }
    })
  },

  setIsDirty: dirty => {
    set(state => {
      const tabId = state.activeTabId
      const current = ensureTabUIState(state, tabId)
      return {
        tabUIStates: {
          ...state.tabUIStates,
          [tabId]: { ...current, isDirty: dirty },
        },
      }
    })
  },

  clearTabDrafts: () => {
    set(state => {
      const tabId = state.activeTabId
      const current = state.tabUIStates[tabId]
      if (!current) return state
      return {
        tabUIStates: {
          ...state.tabUIStates,
          [tabId]: {
            ...current,
            createDraft: undefined,
            editDraft: undefined,
            isDirty: false,
          },
        },
      }
    })
  },
}))
