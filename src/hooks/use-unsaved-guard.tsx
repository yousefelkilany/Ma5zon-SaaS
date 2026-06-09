import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface UseUnsavedGuardArgs {
  isDirty: boolean
  onDiscard: () => void
  onSaveAndClose?: () => Promise<void> | void
  context?: Record<string, unknown>
}

export function useUnsavedGuard({
  isDirty,
  onDiscard,
  onSaveAndClose,
  context,
}: UseUnsavedGuardArgs) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  const requestClose = useCallback(() => {
    if (!isDirty) {
      onDiscard()
      return
    }
    setOpen(true)
  }, [isDirty, onDiscard])

  const handleDiscard = useCallback(() => {
    setOpen(false)
    onDiscard()
  }, [onDiscard])

  const handleSaveAndClose = useCallback(async () => {
    if (!onSaveAndClose) return
    setOpen(false)
    await onSaveAndClose()
  }, [onSaveAndClose])

  const ConfirmDialog = useCallback(
    () =>
      open ? (
        <Dialog open={open} onClose={setOpen}>
          <DialogPanel
            className="max-w-sm"
            onClose={() => setOpen(false)}
            showCloseButton={false}
          >
            <DialogTitle>{t('common.unsavedChanges.discardTitle')}</DialogTitle>
            <DialogDescription>
              {t('common.unsavedChanges.body', context)}
            </DialogDescription>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>
                {t('common.unsavedChanges.keepEditing')}
              </Button>
              {onSaveAndClose && (
                <Button onClick={handleSaveAndClose}>
                  {t('common.unsavedChanges.saveAndClose')}
                </Button>
              )}
              <Button variant="destructive" onClick={handleDiscard}>
                {t('common.unsavedChanges.discard')}
              </Button>
            </div>
          </DialogPanel>
        </Dialog>
      ) : null,
    [open, t, context, onSaveAndClose, handleSaveAndClose, handleDiscard]
  )

  return { requestClose, ConfirmDialog }
}
