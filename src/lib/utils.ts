import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(
  price: number | undefined,
  locale?: string
): string {
  if (price === undefined) return '-'

  const resolvedLocale = locale ?? 'en-US'
  const currency = resolvedLocale.startsWith('ar') ? 'EGP' : 'USD'

  return new Intl.NumberFormat(resolvedLocale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(price)
}

export type TabType = 'dashboard' | 'new-tab' | 'sales-invoice' | 'purchase-invoice' | 'entity'

export interface Tab {
  id: string
  title: string
  type: TabType
  closable: boolean
  entityType?: string
}
