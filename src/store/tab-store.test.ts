import { describe, it, expect, beforeEach } from 'vitest'
import { useTabStore } from './tab-store'

describe('useTabStore', () => {
  beforeEach(() => {
    useTabStore.setState({
      tabs: [
        {
          id: 'dashboard',
          title: 'Dashboard',
          type: 'dashboard',
          closable: false,
        },
      ],
      activeTabId: 'dashboard',
    })
  })

  it('should have dashboard as initial tab', () => {
    const { tabs, activeTabId } = useTabStore.getState()
    expect(tabs).toHaveLength(1)
    expect(tabs.at(0)?.type).toBe('dashboard')
    expect(tabs.at(0)?.closable).toBe(false)
    expect(activeTabId).toBe('dashboard')
  })

  it('should add a new tab', () => {
    const { addTab } = useTabStore.getState()
    const newId = addTab({ title: 'New Tab', type: 'new-tab', closable: true })

    const { tabs, activeTabId } = useTabStore.getState()
    expect(tabs).toHaveLength(2)
    expect(activeTabId).toBe(newId)
    expect(tabs.at(1)?.title).toBe('New Tab')
  })

  it('should remove a closable tab', () => {
    const { addTab, removeTab } = useTabStore.getState()
    const newId = addTab({ title: 'Test', type: 'new-tab', closable: true })
    removeTab(newId)

    const { tabs } = useTabStore.getState()
    expect(tabs).toHaveLength(1)
    expect(tabs.at(0)?.type).toBe('dashboard')
  })

  it('should not remove non-closable tab', () => {
    const { removeTab } = useTabStore.getState()
    removeTab('dashboard')

    const { tabs } = useTabStore.getState()
    expect(tabs).toHaveLength(1)
    expect(tabs.at(0)?.type).toBe('dashboard')
  })

  it('should switch active tab', () => {
    const { addTab, setActiveTab } = useTabStore.getState()
    addTab({ title: 'Test', type: 'new-tab', closable: true })
    setActiveTab('dashboard')

    const { activeTabId } = useTabStore.getState()
    expect(activeTabId).toBe('dashboard')
  })

  it('should get active tab', () => {
    const { getActiveTab } = useTabStore.getState()
    const activeTab = getActiveTab()
    expect(activeTab).toBeDefined()
    expect(activeTab?.type).toBe('dashboard')
  })

  it('should get tab by type', () => {
    const { getTabByType } = useTabStore.getState()
    const dashboardTab = getTabByType('dashboard')
    expect(dashboardTab).toBeDefined()
    expect(dashboardTab?.id).toBe('dashboard')
  })

  it('should switch to adjacent tab when closing active tab', () => {
    const { addTab, removeTab, setActiveTab } = useTabStore.getState()
    const tab1Id = addTab({ title: 'Tab 1', type: 'new-tab', closable: true })
    const tab2Id = addTab({ title: 'Tab 2', type: 'new-tab', closable: true })

    setActiveTab(tab1Id)

    removeTab(tab1Id)

    const { tabs } = useTabStore.getState()
    expect(tabs).toHaveLength(2)
    expect(tabs.at(1)?.id).toBe(tab2Id)
  })
})
