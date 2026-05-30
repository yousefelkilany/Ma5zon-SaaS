import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import ICU from 'i18next-icu'
import en from '../../locales/en.json'
import ar from '../../locales/ar.json'

const resources = {
  ar: { translation: ar },
  en: { translation: en },
}

const rtlLanguages = ['ar']
export const defaultLanguage = 'ar'

i18n.use(initReactI18next).use(ICU).init({
  resources,
  lng: 'ar',
  fallbackLng: 'ar',
  interpolation: {
    escapeValue: false,
  },
})

// Update document direction and lang on language change
i18n.on('languageChanged', lng => {
  const dir = rtlLanguages.includes(lng) ? 'rtl' : 'ltr'
  document.documentElement.dir = dir
  document.documentElement.lang = lng
})

export default i18n

// Export for use in non-React contexts (like menu building)
export { i18n }

// Helper to get available languages
export const availableLanguages = Object.keys(resources)

// Check if a language is RTL
export const isRTL = (lng: string): boolean => rtlLanguages.includes(lng)
