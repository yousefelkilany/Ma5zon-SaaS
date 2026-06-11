import { describe, it, expect, beforeEach } from 'vitest'
import { useTabStore } from './workspace-store'

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
      tabUIStates: {},
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

  describe('modal stack', () => {
    it('pushModal appends a frame to the active tab stack', () => {
      const { addTab, pushModal } = useTabStore.getState()
      const tabId = addTab({ title: 'P', type: 'new-tab', closable: true })
      pushModal({ entity_modal: 'product', entity_id: 'P1' })
      const stack = useTabStore.getState().tabUIStates[tabId]?.modalStack
      expect(stack).toEqual([{ entity_modal: 'product', entity_id: 'P1' }])
    })

    it('popModal removes the top frame', () => {
      const { addTab, pushModal, popModal } = useTabStore.getState()
      const tabId = addTab({ title: 'P', type: 'new-tab', closable: true })
      pushModal({ entity_modal: 'product', entity_id: 'P1' })
      pushModal({ entity_modal: 'variant', entity_id: 'V1' })
      popModal()
      const stack = useTabStore.getState().tabUIStates[tabId]?.modalStack
      expect(stack).toEqual([{ entity_modal: 'product', entity_id: 'P1' }])
    })

    it('popModal is a no-op on empty stack', () => {
      const { popModal } = useTabStore.getState()
      popModal()
      const state = useTabStore.getState()
      expect(state.tabUIStates.dashboard?.modalStack ?? []).toEqual([])
    })

    it('pushModal dedupes when top frame is shallow-equal to incoming frame', () => {
      const { addTab, pushModal } = useTabStore.getState()
      const tabId = addTab({ title: 'P', type: 'new-tab', closable: true })
      pushModal({ entity_modal: 'product', entity_id: 'P1' })
      pushModal({ entity_modal: 'product', entity_id: 'P1' })
      const stack = useTabStore.getState().tabUIStates[tabId]?.modalStack
      expect(stack).toHaveLength(1)
    })

    it('pushModal pushes when the new frame differs from the top', () => {
      const { addTab, pushModal } = useTabStore.getState()
      const tabId = addTab({ title: 'P', type: 'new-tab', closable: true })
      pushModal({ entity_modal: 'product', entity_id: 'P1' })
      pushModal({ entity_modal: 'product', entity_id: 'P2' })
      const stack = useTabStore.getState().tabUIStates[tabId]?.modalStack
      expect(stack).toHaveLength(2)
    })

    it('stacks are isolated per tab', () => {
      const { addTab, pushModal, setActiveTab } = useTabStore.getState()
      const tabA = addTab({ title: 'A', type: 'new-tab', closable: true })
      const tabB = addTab({ title: 'B', type: 'new-tab', closable: true })
      setActiveTab(tabA)
      pushModal({ entity_modal: 'product', entity_id: 'A1' })
      setActiveTab(tabB)
      pushModal({ entity_modal: 'product', entity_id: 'B1' })
      expect(
        useTabStore.getState().tabUIStates[tabA]?.modalStack
      ).toEqual([{ entity_modal: 'product', entity_id: 'A1' }])
      expect(
        useTabStore.getState().tabUIStates[tabB]?.modalStack
      ).toEqual([{ entity_modal: 'product', entity_id: 'B1' }])
    })

    it('removeTab wipes the tab modalStack', () => {
      const { addTab, pushModal, removeTab } = useTabStore.getState()
      const tabId = addTab({ title: 'X', type: 'new-tab', closable: true })
      pushModal({ entity_modal: 'product', entity_id: 'P1' })
      removeTab(tabId)
      expect(useTabStore.getState().tabUIStates[tabId]).toBeUndefined()
    })

    it('clearModalStack empties the active tab stack', () => {
      const { addTab, pushModal, clearModalStack } = useTabStore.getState()
      const tabId = addTab({ title: 'C', type: 'new-tab', closable: true })
      pushModal({ entity_modal: 'product', entity_id: 'P1' })
      clearModalStack()
      expect(
        useTabStore.getState().tabUIStates[tabId]?.modalStack
      ).toEqual([])
    })
  })

  describe('tab drafts (active-tab scoped)', () => {
    it('setCreateDraft writes to the active tab', () => {
      const { addTab, setCreateDraft } = useTabStore.getState()
      const tabId = addTab({ title: 'D', type: 'new-tab', closable: true })
      setCreateDraft({ name: 'Draft' })
      expect(useTabStore.getState().tabUIStates[tabId]?.createDraft).toEqual({
        name: 'Draft',
      })
    })

    it('setEditDraft and setIsDirty update independent fields', () => {
      const { addTab, setEditDraft, setIsDirty } = useTabStore.getState()
      const tabId = addTab({ title: 'D', type: 'new-tab', closable: true })
      setEditDraft({ name: 'Edit' })
      setIsDirty(true)
      const ui = useTabStore.getState().tabUIStates[tabId]
      expect(ui?.editDraft).toEqual({ name: 'Edit' })
      expect(ui?.isDirty).toBe(true)
    })

    it('clearTabDrafts wipes drafts and resets isDirty', () => {
      const { addTab, setCreateDraft, setIsDirty, clearTabDrafts } =
        useTabStore.getState()
      const tabId = addTab({ title: 'D', type: 'new-tab', closable: true })
      setCreateDraft({ name: 'X' })
      setIsDirty(true)
      clearTabDrafts()
      const ui = useTabStore.getState().tabUIStates[tabId]
      expect(ui?.createDraft).toBeUndefined()
      expect(ui?.editDraft).toBeUndefined()
      expect(ui?.isDirty).toBe(false)
    })
  })
})
