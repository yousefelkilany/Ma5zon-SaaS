import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogPanel,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface ConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  isDestructive?: boolean
  isLoading?: boolean
  error?: string
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  isDestructive = true,
  isLoading = false,
  error,
}: ConfirmationDialogProps) {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onClose={onOpenChange}>
      <DialogPanel showCloseButton={false}>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
        {error && <p className="text-error text-body-sm mt-2">{error}</p>}
        <div className="flex justify-end gap-2 pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            {cancelLabel ?? t('common.cancel')}
          </Button>
          <Button
            variant={isDestructive ? 'destructive' : 'default'}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="material-symbols-outlined text-sm animate-spin">
                sync
              </span>
            ) : null}
            {confirmLabel ?? t('common.confirm')}
          </Button>
        </div>
      </DialogPanel>
    </Dialog>
  )
}
