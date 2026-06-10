import { describe, it, expect } from 'vitest'
import { sanitizeHighlight } from './sanitize'

describe('sanitizeHighlight', () => {
  it('keeps <mark> tags intact', () => {
    expect(sanitizeHighlight('Hello <mark>world</mark>')).toBe('Hello <mark>world</mark>')
  })

  it('strips arbitrary tags', () => {
    expect(sanitizeHighlight('<script>x</script><mark>ok</mark>')).toBe('<mark>ok</mark>')
  })

  it('strips dangerous attributes', () => {
    expect(sanitizeHighlight('<mark onclick="x">a</mark>')).toBe('<mark>a</mark>')
  })

  it('returns empty string for empty input', () => {
    expect(sanitizeHighlight('')).toBe('')
  })
})
