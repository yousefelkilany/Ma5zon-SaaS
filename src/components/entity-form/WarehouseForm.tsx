/* eslint-disable react/no-children-prop */
import { useEffect, useRef } from 'react'
import { useAppForm } from './createFormHook'
import { createWarehouseSchema } from '@/lib/validation/schemas'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useTranslation } from 'react-i18next'

interface WarehouseFormValues {
  name: string
  location: string
}

interface WarehouseFormProps {
  onSubmit: (values: WarehouseFormValues) => void
  isLoading?: boolean
  initialValues?: WarehouseFormValues
  submitText?: string
  onChange?: (values: WarehouseFormValues) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema?: any
}

export function WarehouseForm({
  onSubmit,
  isLoading,
  initialValues,
  schema = createWarehouseSchema,
  submitText,
  onChange,
}: WarehouseFormProps) {
  const { t } = useTranslation()
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const form = useAppForm({
    defaultValues: initialValues ?? { name: '', location: '' },
    validators: {
      onSubmit: schema,
    },
    onSubmit: async ({ value }) => {
      onSubmit(value)
    },
  })

  useEffect(() => {
    const name = form.state.values.name
    const location = form.state.values.location
    onChangeRef.current?.({
      name: name ?? '',
      location: location ?? '',
    })
  }, [form.state.values.name, form.state.values.location])

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
          children={field => (
            <field.TextField label={t('entity.warehouse.name')} />
          )}
        />
        <form.AppField
          name="location"
          children={field => (
            <field.TextField label={t('entity.warehouse.location')} />
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
