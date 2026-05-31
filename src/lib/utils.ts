import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { invoke } from '@tauri-apps/api/core'
import * as XLSX from 'xlsx'

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

export type TabType =
  | 'dashboard'
  | 'new-tab'
  | 'sales-invoice'
  | 'purchase-invoice'
  | 'entity'

export interface Tab {
  id: string
  title: string
  type: TabType
  closable: boolean
  entityType?: string
}

export function normalizeArabic(text: string): string {
  if (!text) return ''
  return text
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[\u064B-\u065F]/g, '')
}

export interface EntityRow {
  id: string
  [key: string]: unknown
}

export interface ColumnDef {
  id: string
  label: string
  visible?: boolean
  type?: string
}

export async function exportSelectedToCSV(
  columns: ColumnDef[],
  data: EntityRow[]
): Promise<void> {
  const visibleCols = columns.filter(c => c.visible && c.type !== 'actions')
  const headers = visibleCols.map(c => c.label).join(',')
  const rows = data.map(row =>
    visibleCols
      .map(c => {
        const value = row[c.id]
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value}"`
        }
        return String(value ?? '')
      })
      .join(',')
  )

  const csvFile = '\ufeff' + [headers, ...rows].join('\n')
  const filePath = `ma5zon-export-${Date.now()}.csv`

  try {
    await invoke('export_file', {
      filePath,
      content: csvFile,
    })
  } catch (err) {
    console.error(`export csv error: ${err}`)
    throw err
  }
}

export async function exportSelectedToExcel(
  columns: ColumnDef[],
  data: EntityRow[]
): Promise<void> {
  const visibleCols = columns.filter(c => c.visible && c.type !== 'actions')
  const worksheetData = [
    visibleCols.map(c => c.label),
    ...data.map(row =>
      visibleCols.map(c => {
        const value = row[c.id]
        if (value === null || value === undefined) return ''
        return String(value)
      })
    ),
  ]

  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Selected Items')

  const fileName = `ma5zon-export-${Date.now()}.xlsx`
  const base64 = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'base64',
  })

  try {
    await invoke('export_file', {
      filePath: fileName,
      content: base64,
    })
  } catch (err) {
    console.error(`export excel error: ${err}`)
    throw err
  }
}
