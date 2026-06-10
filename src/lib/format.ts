import { useUIStore } from '@/store/ui-store'

const LOCALE_MAP = { ar: 'ar-EG', en: 'en-US' } as const
const CURRENCY_MAP = { ar: 'EGP', en: 'USD' } as const
const DEFAULT_LANG = 'en' as const

function resolveLocale(): string {
  const lang = useUIStore.getState().userPreferences.language
  return LOCALE_MAP[lang] ?? LOCALE_MAP[DEFAULT_LANG]
}

function resolveCurrency(): string {
  const lang = useUIStore.getState().userPreferences.language
  return CURRENCY_MAP[lang] ?? CURRENCY_MAP[DEFAULT_LANG]
}

export function formatDateTime(
  value: string | number | Date | null | undefined
): string {
  if (value == null) return '-'
  const d = value instanceof Date ? value : new Date(value)
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleString(resolveLocale())
}

export function formatNumber(
  value: number | null | undefined,
  options?: Intl.NumberFormatOptions
): string {
  if (value == null || Number.isNaN(value)) return '-'
  return value.toLocaleString(resolveLocale(), options)
}

export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '-'
  return new Intl.NumberFormat(resolveLocale(), {
    style: 'currency',
    currency: resolveCurrency(),
    minimumFractionDigits: 2,
  }).format(value)
}
