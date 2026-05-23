import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export type TabType = 'dashboard' | 'new-tab' | 'sales-invoice' | 'purchase-invoice'

export interface Tab {
  id: string
  title: string
  type: TabType
  closable: boolean
}
