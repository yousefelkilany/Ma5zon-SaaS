import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useUserPreferences } from './useUserPreferences'
import { useUIStore } from '@/store/ui-store'

describe('useUserPreferences', () => {
  it('returns userPreferences from store', () => {
    const { result } = renderHook(() => useUserPreferences())

    expect(result.current.userPreferences).toBeDefined()
    expect(result.current.userPreferences).toHaveProperty('language')
    expect(result.current.userPreferences).toHaveProperty('theme')
    expect(result.current.userPreferences).toHaveProperty('dateFormat')
  })

  it('returns updateUserPreferences function', () => {
    const { result } = renderHook(() => useUserPreferences())

    expect(result.current.updateUserPreferences).toBeDefined()
    expect(typeof result.current.updateUserPreferences).toBe('function')
  })

  it('updating preferences updates store', () => {
    const { result } = renderHook(() => useUserPreferences())

    const initialLanguage = result.current.userPreferences.language

    act(() => {
      result.current.updateUserPreferences({ language: initialLanguage === 'ar' ? 'en' : 'ar' })
    })

    expect(useUIStore.getState().userPreferences.language).toBe(initialLanguage === 'ar' ? 'en' : 'ar')
  })
})