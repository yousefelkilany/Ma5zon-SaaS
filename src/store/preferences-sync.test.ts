import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { loadUserPreferences, saveUserPreferences } from './preferences-sync'
import { commands } from '@/lib/bindings'

vi.mock('@/lib/bindings', () => ({
  commands: {
    loadPreferences: vi.fn(),
    savePreferences: vi.fn(),
  },
}))

describe('preferences-sync', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('loadUserPreferences', () => {
    it('calls commands.loadPreferences() and returns UserPreferences on success', async () => {
      const mockPrefs = {
        theme: 'dark',
        language: 'en',
        quick_pane_shortcut: null,
      }
      vi.mocked(commands.loadPreferences).mockResolvedValue({
        status: 'ok',
        data: mockPrefs,
      })

      const result = await loadUserPreferences()

      expect(commands.loadPreferences).toHaveBeenCalledTimes(1)
      expect(result).toEqual({
        language: 'en',
        theme: 'dark',
        dateFormat: 'yyyy-MM-dd',
      })
    })

    it('returns default prefs on failure', async () => {
      vi.mocked(commands.loadPreferences).mockResolvedValue({
        status: 'error',
        error: 'Failed to load',
      })

      const result = await loadUserPreferences()

      expect(commands.loadPreferences).toHaveBeenCalledTimes(1)
      expect(result).toEqual({
        language: 'ar',
        theme: 'system',
        dateFormat: 'yyyy-MM-dd',
      })
    })

    it('returns defaults when language/theme are invalid', async () => {
      vi.mocked(commands.loadPreferences).mockResolvedValue({
        status: 'ok',
        data: {
          theme: 'invalid-theme' as unknown as string,
          language: 'invalid-lang' as unknown as string,
          quick_pane_shortcut: null,
        },
      })

      const result = await loadUserPreferences()

      expect(result).toEqual({
        language: 'ar',
        theme: 'system',
        dateFormat: 'yyyy-MM-dd',
      })
    })
  })

  describe('saveUserPreferences', () => {
    it('is debounced 1 second', async () => {
      vi.mocked(commands.savePreferences).mockResolvedValue({
        status: 'ok',
        data: null,
      })

      const prefs = { language: 'en' as const, theme: 'dark' as const }
      saveUserPreferences(prefs)

      expect(commands.savePreferences).not.toHaveBeenCalled()

      await vi.advanceTimersByTimeAsync(500)
      expect(commands.savePreferences).not.toHaveBeenCalled()

      await vi.advanceTimersByTimeAsync(500)
      expect(commands.savePreferences).toHaveBeenCalledTimes(1)
    })

    it('calls commands.savePreferences with correct data after debounce', async () => {
      vi.mocked(commands.savePreferences).mockResolvedValue({
        status: 'ok',
        data: null,
      })

      const prefs = { language: 'en' as const, theme: 'dark' as const }
      saveUserPreferences(prefs)

      await vi.advanceTimersByTimeAsync(1000)

      expect(commands.savePreferences).toHaveBeenCalledWith({
        theme: 'dark',
        language: 'en',
        quick_pane_shortcut: null,
      })
    })

    it('cancels previous timeout when called again', async () => {
      vi.mocked(commands.savePreferences).mockResolvedValue({
        status: 'ok',
        data: null,
      })

      const prefs1 = { language: 'en' as const, theme: 'dark' as const }
      const prefs2 = { language: 'ar' as const, theme: 'light' as const }

      saveUserPreferences(prefs1)
      await vi.advanceTimersByTimeAsync(500)
      saveUserPreferences(prefs2)
      await vi.advanceTimersByTimeAsync(500)

      expect(commands.savePreferences).not.toHaveBeenCalled()

      await vi.advanceTimersByTimeAsync(500)
      expect(commands.savePreferences).toHaveBeenCalledTimes(1)
      expect(commands.savePreferences).toHaveBeenCalledWith({
        theme: 'light',
        language: 'ar',
        quick_pane_shortcut: null,
      })
    })
  })
})
