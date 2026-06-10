import { useTranslation } from 'react-i18next'

export function EntityMissingState({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  return (
    <div
      className="flex flex-col items-center justify-center text-center gap-4 p-8"
      data-testid="entity-missing-state"
    >
      <span className="material-symbols-outlined text-on-surface-variant text-[48px]">
        delete
      </span>
      <p className="text-body-md text-on-surface">{t('entity.missing.message')}</p>
      <button
        type="button"
        onClick={onClose}
        className="px-4 py-2 rounded-md bg-primary text-on-primary"
      >
        {t('common.close')}
      </button>
    </div>
  )
}