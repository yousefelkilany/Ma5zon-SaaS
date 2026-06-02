import { commands } from '@/lib/bindings'
import type { UserPreferences } from './ui-store'

const DEFAULT_PREFS: UserPreferences = {
  language: 'ar',
  theme: 'system',
  dateFormat: 'yyyy-MM-dd',
}

let saveTimeout: ReturnType<typeof setTimeout> | null = null

const VALID_LANGUAGES = ['ar', 'en'] as const
const VALID_THEMES = ['light', 'dark', 'system'] as const

type ValidLanguage = typeof VALID_LANGUAGES[number]
type ValidTheme = typeof VALID_THEMES[number]

function isValidLanguage(lang: string | null): lang is ValidLanguage {
  return lang !== null && VALID_LANGUAGES.includes(lang as ValidLanguage)
}

function isValidTheme(theme: string | null): theme is ValidTheme {
  return theme !== null && VALID_THEMES.includes(theme as ValidTheme)
}

export async function loadUserPreferences(): Promise<UserPreferences> {
  const result = await commands.loadPreferences()

  if (result.status === 'ok') {
    const { theme, language } = result.data
    return {
      language: isValidLanguage(language) ? language : 'ar',
      theme: isValidTheme(theme) ? theme : 'system',
      dateFormat: 'yyyy-MM-dd',
    }
  }

  return DEFAULT_PREFS
}

export function saveUserPreferences(prefs: UserPreferences): void {
  if (saveTimeout) {
    clearTimeout(saveTimeout)
  }

  saveTimeout = setTimeout(() => {
    commands.savePreferences({
      theme: prefs.theme || 'system',
      language: prefs.language,
      quick_pane_shortcut: null,
    })
  }, 1000)
}