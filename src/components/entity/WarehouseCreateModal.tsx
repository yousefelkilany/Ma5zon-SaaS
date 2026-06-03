import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import type { QueryClient } from '@tanstack/react-query'
import { commands } from '@/lib/tauri-bindings'
import { WarehouseForm } from '@/components/entity-form'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface WarehouseCreateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  queryClient: QueryClient
}

export function WarehouseCreateModal({
  open,
  onOpenChange,
  queryClient,
}: WarehouseCreateModalProps) {
  const { t } = useTranslation()
  const [isSubmitting, setIsSubmitting] = useState(false)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('entity.create.warehouse.title')}</DialogTitle>
        </DialogHeader>
        <WarehouseForm
          onSubmit={async (values) => {
            setIsSubmitting(true)
            try {
              const result = await commands.warehousesCreate(values.name, values.location)
              if (result.status === 'ok') {
                queryClient.invalidateQueries({ queryKey: ['entity', 'warehouses'] })
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
          initialValues={{ name: '', location: '' }}
        />
      </DialogContent>
    </Dialog>
  )
}