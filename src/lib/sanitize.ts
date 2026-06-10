/**
 * Allowlist sanitizer for FTS5 `highlight()` HTML.
 *
 * FTS5's highlight() emits <mark>...</mark> around matches. The backend is
 * trusted, but we still pass the result through this allowlist so a future
 * backend change can't accidentally inject arbitrary HTML.
 */
export function sanitizeHighlight(html: string): string {
  if (!html) return ''

  let result = ''
  let i = 0
  let seenTag = false

  while (i < html.length) {
    if (html.slice(i).startsWith('<mark')) {
      const closeIndex = html.indexOf('</mark>', i)
      if (closeIndex === -1) {
        i += 5
        continue
      }
      result += '<mark>'
      const tagEnd = html.indexOf('>', i)
      i = tagEnd + 1
      while (i < closeIndex) {
        result += html[i]
        i++
      }
      result += '</mark>'
      i = closeIndex + 7
      seenTag = true
    } else if (html[i] === '<') {
      const closeIndex = html.indexOf('>', i)
      if (closeIndex === -1) {
        i++
        continue
      }
      i = closeIndex + 1
      seenTag = true
    } else {
      if (!seenTag) {
        result += html[i]
      }
      i++
    }
  }

  return result
}
