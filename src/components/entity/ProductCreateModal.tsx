import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import type { QueryClient } from '@tanstack/react-query'
import { commands } from '@/lib/tauri-bindings'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ProductForm } from '@/components/entity-form'

interface ProductCreateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  queryClient: QueryClient
}

export function ProductCreateModal({
  open,
  onOpenChange,
  queryClient,
}: ProductCreateModalProps) {
  const { t } = useTranslation()
  const [isSubmitting, setIsSubmitting] = useState(false)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('entity.create.product.title')}</DialogTitle>
        </DialogHeader>
        <ProductForm
          onSubmit={async (values) => {
            setIsSubmitting(true)
            try {
              const result = await commands.create(values.company, values.name, values.category)
              if (result.status === 'ok') {
                queryClient.invalidateQueries({ queryKey: ['entity', 'products'] })
                onOpenChange(false)
              } else {
                toast.error(result.error)
              }
            } catch (err: unknown) {
              toast.error(err instanceof Error ? err.message : String(err))
            } finally {
              setIsSubmitting(false)
            }
          }}
          isLoading={isSubmitting}
          initialValues={{ company: '', name: '', category: '' }}
        />
      </DialogContent>
    </Dialog>
  )
}