import { describe, it, expect, beforeEach } from 'vitest'
import { useUIStore } from './ui-store'

describe('UIStore', () => {
  beforeEach(() => {
    useUIStore.setState({
      sidebarVisible: true,
      commandPaletteOpen: false,
      preferencesOpen: false,
      lastQuickPaneEntry: null,
      userPreferences: {
        language: 'ar',
        theme: 'system',
        dateFormat: 'yyyy-MM-dd',
      },
    })
  })

  it('has correct initial state', () => {
    const state = useUIStore.getState()
    expect(state.sidebarVisible).toBe(true)
    expect(state.commandPaletteOpen).toBe(false)
    expect(state.preferencesOpen).toBe(false)
  })

  it('toggles sidebar visibility', () => {
    const { toggleSidebar } = useUIStore.getState()

    toggleSidebar()
    expect(useUIStore.getState().sidebarVisible).toBe(false)

    toggleSidebar()
    expect(useUIStore.getState().sidebarVisible).toBe(true)
  })

  it('sets sidebar visibility directly', () => {
    const { setSidebarVisible } = useUIStore.getState()

    setSidebarVisible(false)
    expect(useUIStore.getState().sidebarVisible).toBe(false)

    setSidebarVisible(true)
    expect(useUIStore.getState().sidebarVisible).toBe(true)
  })

  it('toggles preferences dialog', () => {
    const { togglePreferences } = useUIStore.getState()

    togglePreferences()
    expect(useUIStore.getState().preferencesOpen).toBe(true)

    togglePreferences()
    expect(useUIStore.getState().preferencesOpen).toBe(false)
  })

  it('toggles command palette', () => {
    const { toggleCommandPalette } = useUIStore.getState()

    toggleCommandPalette()
    expect(useUIStore.getState().commandPaletteOpen).toBe(true)

    toggleCommandPalette()
    expect(useUIStore.getState().commandPaletteOpen).toBe(false)
  })

  it('has correct default userPreferences', () => {
    const state = useUIStore.getState()
    expect(state.userPreferences.language).toBe('ar')
    expect(state.userPreferences.theme).toBe('system')
    expect(state.userPreferences.dateFormat).toBe('yyyy-MM-dd')
  })

  it('setUserPreferences replaces full preferences object', () => {
    const { setUserPreferences } = useUIStore.getState()

    setUserPreferences({ language: 'en', theme: 'dark', dateFormat: 'dd/MM/yyyy' })
    expect(useUIStore.getState().userPreferences.language).toBe('en')
    expect(useUIStore.getState().userPreferences.theme).toBe('dark')
    expect(useUIStore.getState().userPreferences.dateFormat).toBe('dd/MM/yyyy')
  })

  it('updateUserPreferences merges partial updates', () => {
    useUIStore.setState({
      userPreferences: { language: 'en', theme: 'dark', dateFormat: 'dd/MM/yyyy' },
    })

    const { updateUserPreferences } = useUIStore.getState()
    updateUserPreferences({ language: 'ar' })

    const prefs = useUIStore.getState().userPreferences
    expect(prefs.language).toBe('ar')
    expect(prefs.theme).toBe('dark')
    expect(prefs.dateFormat).toBe('dd/MM/yyyy')
  })
})
