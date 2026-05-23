import { describe, it, expect, beforeEach } from 'vitest'
import { useTabStore } from './tab-store'

describe('useTabStore', () => {
  beforeEach(() => {
    useTabStore.setState({
      tabs: [{
        id: 'dashboard',
        title: 'Dashboard',
        type: 'dashboard',
        closable: false,
      }],
      activeTabId: 'dashboard',
    })
  })

  it('should have dashboard as initial tab', () => {
    const { tabs, activeTabId } = useTabStore.getState()
    expect(tabs).toHaveLength(1)
    expect(tabs[0].type).toBe('dashboard')
    expect(tabs[0].closable).toBe(false)
    expect(activeTabId).toBe('dashboard')
  })

  it('should add a new tab', () => {
    const { addTab } = useTabStore.getState()
    const newId = addTab({ title: 'New Tab', type: 'new-tab', closable: true })

    const { tabs, activeTabId } = useTabStore.getState()
    expect(tabs).toHaveLength(2)
    expect(activeTabId).toBe(newId)
    expect(tabs[1].title).toBe('New Tab')
  })

  it('should remove a closable tab', () => {
    const { addTab, removeTab } = useTabStore.getState()
    const newId = addTab({ title: 'Test', type: 'new-tab', closable: true })
    removeTab(newId)

    const { tabs } = useTabStore.getState()
    expect(tabs).toHaveLength(1)
    expect(tabs[0].type).toBe('dashboard')
  })

  it('should not remove non-closable tab', () => {
    const { removeTab } = useTabStore.getState()
    removeTab('dashboard')

    const { tabs } = useTabStore.getState()
    expect(tabs).toHaveLength(1)
    expect(tabs[0].type).toBe('dashboard')
  })

  it('should switch active tab', () => {
    const { addTab, setActiveTab } = useTabStore.getState()
    const newId = addTab({ title: 'Test', type: 'new-tab', closable: true })
    setActiveTab('dashboard')

    const { activeTabId } = useTabStore.getState()
    expect(activeTabId).toBe('dashboard')
  })
})