import { create } from 'zustand'

interface UIState {
  sidebarVisible: boolean
  commandPaletteOpen: boolean
  preferencesOpen: boolean
  lastQuickPaneEntry: string | null

  toggleSidebar: () => void
  setSidebarVisible: (visible: boolean) => void
  toggleCommandPalette: () => void
  setCommandPaletteOpen: (open: boolean) => void
  togglePreferences: () => void
  setPreferencesOpen: (open: boolean) => void
  setLastQuickPaneEntry: (text: string) => void
  setSquareCorners: (enabled: boolean) => void
}

export const useUIStore = create<UIState>()(set => ({
  sidebarVisible: true,
  commandPaletteOpen: false,
  preferencesOpen: false,
  lastQuickPaneEntry: null,

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
}))
