import { useForm } from '@tanstack/react-form'
import { useTranslation } from 'react-i18next'
import type { z } from 'zod'
import { createWarehouseSchema } from '@/lib/validation/schemas'
import { TextField } from './fields'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'

interface WarehouseFormProps {
  onSubmit: (values: { name: string; location: string }) => void
  isLoading?: boolean
  initialValues?: { name: string; location: string }
  schema?: z.ZodSchema
}

export function WarehouseForm({
  onSubmit,
  isLoading,
  initialValues,
  schema = createWarehouseSchema,
}: WarehouseFormProps) {
  const { t } = useTranslation()

  const form = useForm({
    defaultValues: initialValues ?? { name: '', location: '' },
    validators: {
      onSubmit: schema,
    },
    onSubmit: async ({ value }) => {
      onSubmit(value)
    },
  })

  return (
    <form onSubmit={form.handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <TextField
          name="name"
          label={t('entity.warehouse.name')}
          form={form}
        />
        <TextField
          name="location"
          label={t('entity.warehouse.location')}
          form={form}
        />
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? <Spinner /> : null}
          {t('entity.create.button')}
        </Button>
      </div>
    </form>
  )
}