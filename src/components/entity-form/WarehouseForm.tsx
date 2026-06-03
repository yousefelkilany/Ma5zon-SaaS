/* eslint-disable react/no-children-prop */
import { useAppForm } from './createFormHook'
import { createWarehouseSchema } from '@/lib/validation/schemas'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useTranslation } from 'react-i18next'

interface WarehouseFormProps {
  onSubmit: (values: { name: string; location: string }) => void
  isLoading?: boolean
  initialValues?: { name: string; location: string }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema?: any
}

export function WarehouseForm({
  onSubmit,
  isLoading,
  initialValues,
  schema = createWarehouseSchema,
}: WarehouseFormProps) {
  const { t } = useTranslation()

  const form = useAppForm({
    defaultValues: initialValues ?? { name: '', location: '' },
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
          name="name"
          children={field => <field.TextField label={t('entity.warehouse.name')} />}
        />
        <form.AppField
          name="location"
          children={field => <field.TextField label={t('entity.warehouse.location')} />}
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