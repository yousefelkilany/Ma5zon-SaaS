import { formatDateTime, formatNumber, formatCurrency } from './format'

export const UOM_LIST = [
  '', // placeholder - DB uses 1-based index
  'pcs قطعة',
  'm متر',
  'kg كيلو',
  'L لتر',
  'box علبة',
  'roll بكرة',
  'set طقم',
]

export const UOM_OPTIONS: { value: string; label: string }[] = UOM_LIST.slice(
  1
).map((label, i) => ({ value: String(i + 1), label }))

export function getUomLabelByIndex(indexStr: string): string {
  return UOM_LIST[parseInt(indexStr, 10)] ?? '—'
}

export type FieldType = 'text' | 'date' | 'number' | 'uom' | 'currency'

export function formatFieldValue(value: unknown, type: FieldType): string {
  if (value == null) return '—'
  switch (type) {
    case 'date':
      return formatDateTime(value as string)
    case 'number':
      return typeof value === 'number' ? formatNumber(value) : String(value)
    case 'currency':
      return typeof value === 'number' ? formatCurrency(value) : String(value)
    case 'uom':
      return getUomLabelByIndex(String(value))
    default:
      return String(value)
  }
}
