import { create } from 'zustand'
import type { EntityType, ModalType } from '@/lib/utils'

interface TabModalState {
  entity_modal: ModalType
  entity_id: string | null
  createDraft?: Record<string, unknown>
  editDraft?: Record<string, unknown>
  isDirty: boolean
}

type TabStateSlice = Partial<Record<EntityType, TabModalState>>

export interface InterceptedNavigation {
  targetTabId: string
  onDiscard: () => void
  onSaveAndClose?: () => Promise<void> | void
}

interface UIState {
  isAppReady: boolean
  sidebarVisible: boolean
  commandPaletteOpen: boolean
  preferencesOpen: boolean
  lastQuickPaneEntry: string | null
  userPreferences: UserPreferences
  tabState: TabStateSlice
  interceptedNavigation: InterceptedNavigation | null

  setAppReady: (isAppReady: boolean) => void
  toggleSidebar: () => void
  setSidebarVisible: (visible: boolean) => void
  toggleCommandPalette: () => void
  setCommandPaletteOpen: (open: boolean) => void
  togglePreferences: () => void
  setPreferencesOpen: (open: boolean) => void
  setLastQuickPaneEntry: (text: string) => void
  setSquareCorners: (enabled: boolean) => void
  setUserPreferences: (prefs: UserPreferences) => void
  updateUserPreferences: (partial: Partial<UserPreferences>) => void
  setTabModal: (
    tabId: EntityType,
    modal: { entity_modal: ModalType; entity_id: string | null }
  ) => void
  setTabCreateDraft: (
    tabId: EntityType,
    draft: Record<string, unknown> | undefined
  ) => void
  setTabEditDraft: (
    tabId: EntityType,
    draft: Record<string, unknown> | undefined
  ) => void
  setTabIsDirty: (tabId: EntityType, dirty: boolean) => void
  clearTabState: (tabId: EntityType) => void
  clearAllTabState: () => void
  setInterceptedNavigation: (nav: InterceptedNavigation | null) => void
}

export interface UserPreferences {
  language: 'ar' | 'en'
  theme?: 'light' | 'dark' | 'system'
  dateFormat?: string
}

export const useUIStore = create<UIState>()(set => ({
  isAppReady: false,
  setAppReady: (ready: boolean) => set({ isAppReady: ready }),
  sidebarVisible: true,
  commandPaletteOpen: false,
  preferencesOpen: false,
  lastQuickPaneEntry: null,
  userPreferences: {
    language: 'ar',
    theme: 'system',
    dateFormat: 'yyyy-MM-dd',
  },
  tabState: {} as TabStateSlice,
  interceptedNavigation: null,

  toggleSidebar: () =>
    set(state => ({ sidebarVisible: !state.sidebarVisible })),

  setSidebarVisible: visible => set({ sidebarVisible: visible }),

  toggleCommandPalette: () =>
    set(state => ({ commandPaletteOpen: !state.commandPaletteOpen })),

  setCommandPaletteOpen: open => set({ commandPaletteOpen: open }),

  togglePreferences: () =>
    set(state => ({ preferencesOpen: !state.preferencesOpen })),

  setPreferencesOpen: open => set({ preferencesOpen: open }),

  setLastQuickPaneEntry: text => set({ lastQuickPaneEntry: text }),

  setSquareCorners: (enabled: boolean) => {
    document.documentElement.classList.toggle('square-corners', enabled)
  },

  setUserPreferences: prefs => set({ userPreferences: prefs }),

  updateUserPreferences: partial =>
    set(state => ({
      userPreferences: { ...state.userPreferences, ...partial },
    })),

  setTabModal: (tabId, modal) =>
    set(state => {
      const existing = state.tabState[tabId] ?? {
        entity_modal: null,
        entity_id: null,
        isDirty: false,
      }
      return {
        tabState: {
          ...state.tabState,
          [tabId]: { ...existing, ...modal },
        },
      }
    }),

  setTabCreateDraft: (tabId, draft) =>
    set(state => {
      const existing = state.tabState[tabId] ?? {
        entity_modal: null,
        entity_id: null,
        isDirty: false,
      }
      return {
        tabState: {
          ...state.tabState,
          [tabId]: { ...existing, createDraft: draft },
        },
      }
    }),

  setTabEditDraft: (tabId, draft) =>
    set(state => {
      const existing = state.tabState[tabId] ?? {
        entity_modal: null,
        entity_id: null,
        isDirty: false,
      }
      return {
        tabState: {
          ...state.tabState,
          [tabId]: { ...existing, editDraft: draft },
        },
      }
    }),

  setTabIsDirty: (tabId, dirty) =>
    set(state => {
      const existing = state.tabState[tabId] ?? {
        entity_modal: null,
        entity_id: null,
        isDirty: false,
      }
      return {
        tabState: {
          ...state.tabState,
          [tabId]: { ...existing, isDirty: dirty },
        },
      }
    }),

  clearTabState: tabId =>
    set(state => ({
      tabState: {
        ...state.tabState,
        [tabId]: { entity_modal: null, entity_id: null, isDirty: false },
      },
    })),

  clearAllTabState: () => set({ tabState: {} }),

  setInterceptedNavigation: nav => set({ interceptedNavigation: nav }),
}))
