/* eslint-disable react/no-children-prop */
import { useAppForm } from './createFormHook'
import { createProductSchema } from '@/lib/validation/schemas'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useTranslation } from 'react-i18next'

interface ProductFormProps {
  onSubmit: (values: {
    company: string
    name: string
    category: string
  }) => void
  isLoading?: boolean
  initialValues?: { company: string; name: string; category: string }
  submitText?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema?: any
}

export function ProductForm({
  onSubmit,
  isLoading,
  initialValues,
  schema = createProductSchema,
  submitText,
}: ProductFormProps) {
  const { t } = useTranslation()

  const form = useAppForm({
    defaultValues: initialValues ?? { company: '', name: '', category: '' },
    validators: {
      onSubmit: schema,
    },
    onSubmit: async ({ value }) => {
      onSubmit(value)
    },
  })

  return (
    <form
      onSubmit={e => {
        e.preventDefault()
        form.handleSubmit()
      }}
      className="space-y-4"
    >
      <div className="grid grid-cols-2 gap-4">
        <form.AppField
          name="company"
          children={field => (
            <field.TextField
              label={t('entity.layout.products.columns.company')}
            />
          )}
        />
        <form.AppField
          name="name"
          children={field => (
            <field.TextField label={t('entity.layout.products.columns.name')} />
          )}
        />
        <form.AppField
          name="category"
          children={field => (
            <field.TextField
              label={t('entity.layout.products.columns.category')}
            />
          )}
        />
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? <Spinner /> : null}
          {submitText ?? t('entity.create.button')}
        </Button>
      </div>
    </form>
  )
}
