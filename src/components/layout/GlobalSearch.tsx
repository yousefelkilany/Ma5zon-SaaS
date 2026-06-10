import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/hooks/useAuth'
import { SearchDropdown } from './search/SearchDropdown'

export function GlobalSearch() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const userId = user?.id ?? null
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      const inField =
        target && ['INPUT', 'TEXTAREA'].includes(target.tagName) && target !== inputRef.current
      if (inField) return
      if (e.key === '/' || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) {
        e.preventDefault()
        inputRef.current?.focus()
        setOpen(true)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  return (
    <div ref={containerRef} className="relative w-full">
      <span className="material-symbols-outlined absolute inset-inline-start-1 top-1/2 -translate-y-1/2 me-2 text-on-surface-variant text-[20px]">
        search
      </span>
      <input
        ref={inputRef}
        value={query}
        onChange={e => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={e => {
          if (e.key === 'Escape') {
            setOpen(false)
            inputRef.current?.blur()
          }
        }}
        className="bg-surface-container-high border border-outline-variant/30 rounded-lg ps-10 pe-4 py-2 text-body-sm font-body-sm text-on-surface focus:ring-1 focus:ring-primary w-full transition-all"
        placeholder={t('nav.globalSearchPlaceholder')}
        type="text"
        data-testid="global-search-input"
      />
      {open && (
        <SearchDropdown
          query={query}
          userId={userId}
          onPickQuery={setQuery}
          onClose={() => {
            setOpen(false)
            inputRef.current?.blur()
          }}
        />
      )}
    </div>
  )
}