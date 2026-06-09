import { type ReactNode, type ComponentPropsWithoutRef } from 'react'
import {
  Dialog as HuiDialog,
  DialogBackdrop as HuiDialogBackdrop,
  DialogPanel as HuiDialogPanel,
  DialogTitle as HuiDialogTitle,
  DialogDescription as HuiDialogDescription,
} from '@headlessui/react'
import { XIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DialogProps {
  open: boolean
  onClose: (value: boolean) => void
  modal?: boolean
  children: ReactNode
  className?: string
  container?: HTMLElement
}

/**
 * Dialog root. Wraps Headless UI Dialog.
 *
 * `modal={true}` (default): draws a backdrop, locks body scroll, traps focus.
 * `modal={false}`: no backdrop, no scroll lock, no focus trap — the rest of
 *   the app stays interactive. Escape still closes.
 */
function Dialog({
  open,
  onClose,
  modal = true,
  children,
  className,
  container,
}: DialogProps) {
  return (
    <HuiDialog
      open={open}
      onClose={onClose}
      {...(container ? { container } : {})}
      className={cn('relative z-50', className)}
    >
      {modal && <DialogBackdrop />}
      {children}
    </HuiDialog>
  )
}

function DialogBackdrop() {
  return (
    <HuiDialogBackdrop className="fixed inset-0 bg-black/50 transition-opacity" />
  )
}

interface DialogPanelProps extends ComponentPropsWithoutRef<'div'> {
  showCloseButton?: boolean
  onClose?: () => void
}

function DialogPanel({
  className,
  children,
  showCloseButton = true,
  onClose,
  ...props
}: DialogPanelProps) {
  return (
    <div className="fixed inset-0 flex items-center justify-center p-4">
      <HuiDialogPanel
        data-slot="dialog-content"
        className={cn(
          'bg-background grid w-full gap-4 rounded-lg border p-6 shadow-lg min-w-200 max-w-[65vw] max-h-[80vh] overflow-auto',
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && onClose && (
          <button
            type="button"
            onClick={onClose}
            data-slot="dialog-close"
            aria-label="Close"
            className="ring-offset-background focus:ring-ring absolute top-4 inset-e-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden"
          >
            <XIcon />
          </button>
        )}
      </HuiDialogPanel>
    </div>
  )
}

function DialogTitle({ className, ...props }: ComponentPropsWithoutRef<'h2'>) {
  return (
    <HuiDialogTitle
      data-slot="dialog-title"
      className={cn('text-lg leading-none font-semibold', className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: ComponentPropsWithoutRef<'p'>) {
  return (
    <HuiDialogDescription
      data-slot="dialog-description"
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  )
}

export { Dialog, DialogBackdrop, DialogPanel, DialogTitle, DialogDescription }
