import { describe, it, expect, beforeEach } from 'vitest'
import { useUIStore } from '../ui-store'

const emptyTabState = {
  entity_modal: null,
  entity_id: null,
  isDirty: false,
}

describe('useUIStore tabState slice', () => {
  beforeEach(() => {
    useUIStore.setState({ tabState: {} })
  })

  it('starts with an empty tabState', () => {
    expect(useUIStore.getState().tabState).toEqual({})
  })

  it('setTabModal writes entity_modal and entity_id for a given tab', () => {
    useUIStore
      .getState()
      .setTabModal('products', { entity_modal: 'product', entity_id: 'P1' })
    expect(useUIStore.getState().tabState.products!).toEqual({
      ...emptyTabState,
      entity_modal: 'product',
      entity_id: 'P1',
    })
  })

  it('setTabCreateDraft stores the draft without touching the modal state', () => {
    useUIStore
      .getState()
      .setTabCreateDraft('products', { name: 'Draft Name' })
    expect(useUIStore.getState().tabState.products!.createDraft).toEqual({
      name: 'Draft Name',
    })
    expect(useUIStore.getState().tabState.products!.entity_modal).toBeNull()
  })

  it('setTabEditDraft and setTabIsDirty update the right fields', () => {
    useUIStore
      .getState()
      .setTabEditDraft('products', { company: 'ACME 2' })
    useUIStore.getState().setTabIsDirty('products', true)
    expect(useUIStore.getState().tabState.products!.editDraft).toEqual({
      company: 'ACME 2',
    })
    expect(useUIStore.getState().tabState.products!.isDirty).toBe(true)
  })

  it('clearTabState wipes the tab back to empty defaults', () => {
    useUIStore
      .getState()
      .setTabModal('products', { entity_modal: 'product', entity_id: 'P1' })
    useUIStore.getState().setTabEditDraft('products', { company: 'ACME 2' })
    useUIStore.getState().setTabIsDirty('products', true)
    useUIStore.getState().clearTabState('products')
    expect(useUIStore.getState().tabState.products!).toEqual(emptyTabState)
  })

  it('clearAllTabState empties the entire slice', () => {
    useUIStore
      .getState()
      .setTabModal('products', { entity_modal: 'product', entity_id: 'P1' })
    useUIStore
      .getState()
      .setTabModal('warehouses', {
        entity_modal: 'warehouse',
        entity_id: 'W1',
      })
    useUIStore.getState().clearAllTabState()
    expect(useUIStore.getState().tabState).toEqual({})
  })

  it('tabs are isolated — writes to products do not affect variants', () => {
    useUIStore
      .getState()
      .setTabModal('products', { entity_modal: 'product', entity_id: 'P1' })
    expect(useUIStore.getState().tabState.variants).toBeUndefined()
  })
})
