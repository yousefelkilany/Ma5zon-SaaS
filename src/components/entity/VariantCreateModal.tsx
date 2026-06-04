import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import type { QueryClient } from '@tanstack/react-query'
import { commands } from '@/lib/tauri-bindings'
import { VariantForm } from '@/components/entity-form'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface VariantCreateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  queryClient: QueryClient
  productId: string
}

export function VariantCreateModal({
  open,
  onOpenChange,
  queryClient,
  productId,
}: VariantCreateModalProps) {
  const { t } = useTranslation()
  const [isSubmitting, setIsSubmitting] = useState(false)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('entity.create.variant.title')}</DialogTitle>
        </DialogHeader>
        <VariantForm
          productId={productId}
          onSubmit={async values => {
            setIsSubmitting(true)
            try {
              const result = await commands.variantsCreate({
                product_id: productId,
                sku: values.sku,
                variant_name: values.variant_name,
                uom_id: values.uom_id ?? '',
                retail_price: values.retail_price ?? 0,
                wholesale_price: values.wholesale_price ?? 0,
                distribution_price: values.distribution_price ?? 0,
              })
              if (result.status === 'ok') {
                queryClient.invalidateQueries({
                  queryKey: ['entity', 'product_variants'],
                })
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
          initialValues={{
            sku: '',
            variant_name: '',
            uom_id: '',
            retail_price: undefined,
            wholesale_price: undefined,
            distribution_price: undefined,
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
