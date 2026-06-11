import { useEffect } from 'react'
import { useUIStore } from '@/store/ui-store'

function isEditable(el: EventTarget | null): el is HTMLInputElement | HTMLTextAreaElement {
  if (!(el instanceof HTMLElement)) return false
  if (el.isContentEditable) return true
  if (el instanceof HTMLTextAreaElement) return true
  if (el instanceof HTMLInputElement) {
    const editableTypes = new Set([
      'text',
      'search',
      'email',
      'url',
      'tel',
      'password',
      'number',
    ])
    return editableTypes.has(el.type)
  }
  return false
}

/**
 * Handles global keyboard shortcuts for the application.
 *
 * Currently handles:
 * - Cmd/Ctrl+Z / Cmd/Ctrl+Shift+Z : Undo / Redo in focused text fields
 *   (fallback for environments where the Tauri Edit menu isn't registered)
 */
export function useKeyboardShortcuts() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        // Use `code` (physical key) so non-Latin layouts (e.g. Arabic, where
        // Ctrl+Z types `ئ`) still match.
        const code = e.code
        if (code === 'KeyZ' && isEditable(e.target)) {
          e.preventDefault()
          document.execCommand(e.shiftKey ? 'redo' : 'undo')
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])
}
