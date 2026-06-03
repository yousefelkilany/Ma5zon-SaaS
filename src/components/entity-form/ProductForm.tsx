import { useForm } from '@tanstack/react-form'
import { useTranslation } from 'react-i18next'
import type { z } from 'zod'
import { createProductSchema } from '@/lib/validation/schemas'
import { TextField } from './fields'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'

interface ProductFormProps {
  onSubmit: (values: { company: string; name: string; category: string }) => void
  isLoading?: boolean
  initialValues?: { company: string; name: string; category: string }
  schema?: z.ZodSchema
}

export function ProductForm({
  onSubmit,
  isLoading,
  initialValues,
  schema = createProductSchema,
}: ProductFormProps) {
  const { t } = useTranslation()

  const form = useForm({
    defaultValues: initialValues ?? { company: '', name: '', category: '' },
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
        <TextField name="company" label={t('entity.layout.products.columns.company')} form={form} />
        <TextField name="name" label={t('entity.layout.products.columns.name')} form={form} />
        <TextField name="category" label={t('entity.layout.products.columns.category')} form={form} />
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