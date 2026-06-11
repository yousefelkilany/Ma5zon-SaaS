import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useTabStore } from '@/store/workspace-store'
import { useCurrentModalFrame } from '../use-current-modal-frame'

describe('useCurrentModalFrame', () => {
  beforeEach(() => {
    useTabStore.setState({
      tabs: [
        { id: 'dashboard', title: 'D', type: 'dashboard', closable: false },
      ],
      activeTabId: 'dashboard',
      tabUIStates: {},
    })
  })

  it('returns null when the active tab has no modal stack', () => {
    const { result } = renderHook(() => useCurrentModalFrame())
    expect(result.current).toBeNull()
  })

  it('returns the top frame of the active tab stack', () => {
    const { addTab, pushModal, setActiveTab } = useTabStore.getState()
    const tabId = addTab({ title: 'P', type: 'new-tab', closable: true })
    pushModal({ entity_modal: 'product', entity_id: 'P1' })
    pushModal({ entity_modal: 'variant', entity_id: 'V1' })
    setActiveTab(tabId)
    const { result } = renderHook(() => useCurrentModalFrame())
    expect(result.current).toEqual({
      entity_modal: 'variant',
      entity_id: 'V1',
    })
  })
})