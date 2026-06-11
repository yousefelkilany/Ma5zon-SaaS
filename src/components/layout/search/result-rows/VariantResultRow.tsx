import { useTranslation } from 'react-i18next'
import { sanitizeHighlight } from '@/lib/sanitize'
import type { SearchHit } from '../types'

export function VariantResultRow({ hit }: { hit: SearchHit }) {
  const { t } = useTranslation()
  return (
    <div className="flex items-center gap-3">
      <span className="material-symbols-outlined text-on-surface-variant">style</span>
      <div className="flex flex-col flex-1 min-w-0">
        <span
          className="text-body-sm text-on-surface truncate"
          dangerouslySetInnerHTML={{ __html: sanitizeHighlight(hit.highlighted_title) }}
        />
        <span className="text-label-caps text-on-surface-variant truncate">
          {hit.subtitle}
          {hit.meta ? ` · ${hit.meta}` : ''}
        </span>
      </div>
      <span className="text-[10px] uppercase text-on-surface-variant">
        {t('search.matchedColumn.' + (hit.matched_column ?? 'name'), { defaultValue: hit.matched_column ?? 'name' })}
      </span>
    </div>
  )
}