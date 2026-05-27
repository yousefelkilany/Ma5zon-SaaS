import { useTranslation } from 'react-i18next'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { useTheme } from '@/hooks/use-theme'
import { usePreferences, useSavePreferences } from '@/services/preferences'

export function SettingsPopover() {
  const { t, i18n } = useTranslation()
  const { theme, setTheme } = useTheme()
  const { data: preferences } = usePreferences()
  const savePreferences = useSavePreferences()

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme)
    if (preferences) {
      savePreferences.mutate({ ...preferences, theme: newTheme })
    }
  }

  const handleLanguageChange = async (lang: string) => {
    if (lang === 'system') {
      // Detect and apply system locale
      const { locale: systemLocale } = await import('@tauri-apps/plugin-os')
      const systemLocaleValue = await systemLocale()
      const langCode = systemLocaleValue?.split('-')[0]?.toLowerCase() ?? 'en'
      await i18n.changeLanguage(langCode)
      if (preferences) {
        savePreferences.mutate({ ...preferences, language: null })
      }
    } else {
      await i18n.changeLanguage(lang)
      if (preferences) {
        savePreferences.mutate({ ...preferences, language: lang })
      }
    }
  }

  const isSystemLanguage = preferences?.language === null

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="p-2 text-on-surface-variant hover:bg-surface-container-high rounded-full">
          <span className="material-symbols-outlined" style={{ fontSize: '1.75em' }}>
            settings
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side="bottom"
        sideOffset={8}
        className="w-72 bg-surface-container border-outline-variant rounded-lg p-4 shadow-xl"
      >
        {/* Theme section */}
        <div className="space-y-3">
          <span className="text-label-caps text-on-surface-variant uppercase">
            {t('preferences.appearance.theme')}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => handleThemeChange('light')}
              className={`flex-1 flex flex-col items-center gap-1 p-3 rounded-lg transition-all ${
                theme === 'light'
                  ? 'bg-secondary text-on-secondary ring-2 ring-secondary'
                  : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest'
              }`}
            >
              <span className="material-symbols-outlined">light_mode</span>
              <span className="text-xs">{t('preferences.appearance.theme.light')}</span>
            </button>
            <button
              onClick={() => handleThemeChange('dark')}
              className={`flex-1 flex flex-col items-center gap-1 p-3 rounded-lg transition-all ${
                theme === 'dark'
                  ? 'bg-secondary text-on-secondary ring-2 ring-secondary'
                  : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest'
              }`}
            >
              <span className="material-symbols-outlined">dark_mode</span>
              <span className="text-xs">{t('preferences.appearance.theme.dark')}</span>
            </button>
            <button
              onClick={() => handleThemeChange('system')}
              className={`flex-1 flex flex-col items-center gap-1 p-3 rounded-lg transition-all ${
                theme === 'system'
                  ? 'bg-secondary text-on-secondary ring-2 ring-secondary'
                  : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest'
              }`}
            >
              <span className="material-symbols-outlined">desktop_windows</span>
              <span className="text-xs">{t('preferences.appearance.theme.system')}</span>
            </button>
          </div>
        </div>

        {/* Language section */}
        <div className="space-y-3 mt-4">
          <span className="text-label-caps text-on-surface-variant uppercase">
            {t('preferences.appearance.language')}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => handleLanguageChange('ar')}
              className={`flex-1 flex flex-col items-center gap-1 p-3 rounded-lg transition-all ${
                i18n.language === 'ar' && !isSystemLanguage
                  ? 'bg-secondary text-on-secondary ring-2 ring-secondary'
                  : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest'
              }`}
            >
              <span className="text-2xl">🇸🇦</span>
              <span className="text-xs">عربي</span>
            </button>
            <button
              onClick={() => handleLanguageChange('en')}
              className={`flex-1 flex flex-col items-center gap-1 p-3 rounded-lg transition-all ${
                i18n.language === 'en' && !isSystemLanguage
                  ? 'bg-secondary text-on-secondary ring-2 ring-secondary'
                  : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest'
              }`}
            >
              <span className="text-2xl">🇺🇸</span>
              <span className="text-xs">EN</span>
            </button>
            <button
              onClick={() => handleLanguageChange('system')}
              className={`flex-1 flex flex-col items-center gap-1 p-3 rounded-lg transition-all ${
                isSystemLanguage
                  ? 'bg-secondary text-on-secondary ring-2 ring-secondary'
                  : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest'
              }`}
            >
              <span className="material-symbols-outlined">desktop_windows</span>
              <span className="text-xs">{t('preferences.appearance.theme.system')}</span>
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}