import { describe, it, expect, beforeEach } from 'vitest'
import { useUIStore } from '@/store/ui-store'
import { formatDateTime, formatNumber, formatCurrency } from './format'

function setLang(language: 'ar' | 'en') {
  useUIStore.setState({
    userPreferences: { language, theme: 'system', dateFormat: 'yyyy-MM-dd' },
  })
}

describe('formatDateTime', () => {
  beforeEach(() => setLang('en'))

  it('formats a valid ISO string in the active locale', () => {
    expect(formatDateTime('2024-01-15T10:30:00Z')).toMatch(/1\/15\/2024/)
  })

  it('formats a Date instance', () => {
    const d = new Date('2024-06-01T12:00:00Z')
    expect(formatDateTime(d)).toMatch(/2024/)
  })

  it('formats a numeric timestamp', () => {
    expect(formatDateTime(0)).toMatch(/1970|1969|1\/1/)
  })

  it('returns "-" for null', () => {
    expect(formatDateTime(null)).toBe('-')
  })

  it('returns "-" for undefined', () => {
    expect(formatDateTime(undefined)).toBe('-')
  })

  it('returns "-" for an invalid date string', () => {
    expect(formatDateTime('not-a-date')).toBe('-')
  })
})

describe('formatNumber', () => {
  beforeEach(() => setLang('en'))

  it('formats a valid number with thousands separators', () => {
    expect(formatNumber(1234567)).toMatch(/1,234,567/)
  })

  it('honors custom options', () => {
    expect(formatNumber(3.14159, { minimumFractionDigits: 2 })).toBe('3.142')
  })

  it('returns "-" for null', () => {
    expect(formatNumber(null)).toBe('-')
  })

  it('returns "-" for undefined', () => {
    expect(formatNumber(undefined)).toBe('-')
  })

  it('returns "-" for NaN', () => {
    expect(formatNumber(Number.NaN)).toBe('-')
  })
})

describe('formatCurrency', () => {
  it('formats USD when language is en', () => {
    setLang('en')
    expect(formatCurrency(10)).toContain('10.00')
    expect(formatCurrency(10)).toMatch(/\$|US\$/)
  })

  it('formats EGP when language is ar', () => {
    setLang('ar')
    const out = formatCurrency(10)
    expect(out).toContain('١٠٫٠٠')
    expect(out).toMatch(/ج\.م/)
  })

  it('returns "-" for null', () => {
    expect(formatCurrency(null)).toBe('-')
  })

  it('returns "-" for undefined', () => {
    expect(formatCurrency(undefined)).toBe('-')
  })
})
