/* eslint-disable react/no-children-prop */
import { useEffect, useRef } from 'react'
import { useAppForm } from './createFormHook'
import { createProductSchema } from '@/lib/validation/schemas'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useTranslation } from 'react-i18next'

interface ProductFormValues {
  company: string
  name: string
  category: string
}

interface ProductFormProps {
  onSubmit: (values: ProductFormValues) => void
  isLoading?: boolean
  initialValues?: ProductFormValues
  submitText?: string
  onChange?: (values: ProductFormValues) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema?: any
}

export function ProductForm({
  onSubmit,
  isLoading,
  initialValues,
  schema = createProductSchema,
  submitText,
  onChange,
}: ProductFormProps) {
  const { t } = useTranslation()
  const onChangeRef = useRef(onChange)
  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  const form = useAppForm({
    defaultValues: initialValues ?? { company: '', name: '', category: '' },
    validators: {
      onSubmit: schema,
    },
    onSubmit: async ({ value }) => {
      onSubmit(value)
    },
  })

  useEffect(() => {
    const company = form.state.values.company
    const name = form.state.values.name
    const category = form.state.values.category
    onChangeRef.current?.({
      company: company ?? '',
      name: name ?? '',
      category: category ?? '',
    })
  }, [form.state.values.company, form.state.values.name, form.state.values.category])

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
