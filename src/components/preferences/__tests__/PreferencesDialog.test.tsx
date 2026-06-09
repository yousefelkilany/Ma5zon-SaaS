import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { QueryWrapper } from '@/lib/test-utils/query-wrapper'
import { createTestQueryClient } from '@/lib/test-utils/create-test-query-client'
import { useUIStore } from '@/store/ui-store'

const mutateMock = vi.fn()

vi.mock('@/services/preferences', () => ({
  usePreferences: () => ({ data: null }),
  useSavePreferences: () => ({
    mutate: mutateMock,
    mutateAsync: mutateMock,
    isPending: false,
  }),
}))

vi.mock('@/hooks/use-theme', () => ({
  useTheme: () => ({ theme: 'system', setTheme: vi.fn() }),
}))

vi.mock('@/i18n', () => ({
  availableLanguages: ['en', 'ar'],
}))

vi.mock('@tauri-apps/plugin-os', () => ({
  locale: vi.fn().mockResolvedValue('en-US'),
}))

import { PreferencesDialog } from '../PreferencesDialog'
import { setPreferencesDirty } from '../preferences-dirty'

beforeEach(() => {
  vi.clearAllMocks()
  setPreferencesDirty(false)
  useUIStore.setState({ preferencesOpen: true })
})

describe('PreferencesDialog', () => {
  it('closing with unsaved preferences opens the 3-button confirm', async () => {
    const user = userEvent.setup()
    const client = createTestQueryClient()
    render(<PreferencesDialog />, {
      wrapper: p => <QueryWrapper {...p} client={client} />,
    })
    act(() => {
      setPreferencesDirty(true)
    })
    await user.keyboard('{Escape}')
    expect(screen.getByText('Keep editing')).toBeInTheDocument()
    expect(screen.getByText('Save & close')).toBeInTheDocument()
    expect(screen.getByText('Discard')).toBeInTheDocument()
  })

  it('"Save & close" calls useSavePreferences().mutate() and closes on success', async () => {
    const user = userEvent.setup()
    mutateMock.mockImplementation((_vars, opts) => {
      opts?.onSettled?.()
    })
    const client = createTestQueryClient()
    render(<PreferencesDialog />, {
      wrapper: p => <QueryWrapper {...p} client={client} />,
    })
    act(() => {
      setPreferencesDirty(true)
    })
    await user.keyboard('{Escape}')
    await user.click(screen.getByText('Save & close'))
    expect(mutateMock).toHaveBeenCalled()
    expect(useUIStore.getState().preferencesOpen).toBe(false)
  })

  it('"Discard" closes without saving', async () => {
    const user = userEvent.setup()
    const client = createTestQueryClient()
    render(<PreferencesDialog />, {
      wrapper: p => <QueryWrapper {...p} client={client} />,
    })
    act(() => {
      setPreferencesDirty(true)
    })
    await user.keyboard('{Escape}')
    await user.click(screen.getByText('Discard'))
    expect(mutateMock).not.toHaveBeenCalled()
    expect(useUIStore.getState().preferencesOpen).toBe(false)
  })

  it('"Keep editing" stays open', async () => {
    const user = userEvent.setup()
    const client = createTestQueryClient()
    render(<PreferencesDialog />, {
      wrapper: p => <QueryWrapper {...p} client={client} />,
    })
    act(() => {
      setPreferencesDirty(true)
    })
    await user.keyboard('{Escape}')
    await user.click(screen.getByText('Keep editing'))
    expect(useUIStore.getState().preferencesOpen).toBe(true)
  })
})
