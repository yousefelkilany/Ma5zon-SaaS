import { describe, it, expect } from 'vitest'
import { shouldInterceptTabSwitch } from '../tab-switch-guard'
import type { Tab } from '@/lib/utils'

const productsTab: Tab = {
  id: 'tab-1',
  title: 'Products',
  type: 'entity',
  closable: true,
  entityType: 'products',
}

const dashboardTab: Tab = {
  id: 'tab-dash',
  title: 'Dashboard',
  type: 'dashboard',
  closable: false,
}

describe('shouldInterceptTabSwitch', () => {
  it('returns false when current tab is undefined', () => {
    expect(shouldInterceptTabSwitch({}, undefined)).toBe(false)
  })

  it('returns false when current tab has no entityType', () => {
    expect(shouldInterceptTabSwitch({}, dashboardTab)).toBe(false)
  })

  it('returns false when tabState has no entry for the current entityType', () => {
    expect(shouldInterceptTabSwitch({}, productsTab)).toBe(false)
  })

  it('returns false when current entity is not dirty', () => {
    expect(
      shouldInterceptTabSwitch(
        { products: { entity_modal: null, entity_id: null, isDirty: false } },
        productsTab
      )
    ).toBe(false)
  })

  it('returns true when current entity is dirty', () => {
    expect(
      shouldInterceptTabSwitch(
        { products: { entity_modal: 'view', entity_id: 'p1', isDirty: true } },
        productsTab
      )
    ).toBe(true)
  })
})
