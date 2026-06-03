/* eslint-disable react/no-children-prop */
import { useAppForm } from './createFormHook'
import { createVariantSchema } from '@/lib/validation/schemas'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useTranslation } from 'react-i18next'

interface VariantFormProps {
  productId?: string
  onSubmit: (values: {
    sku: string
    variant_name: string
    uom_id?: string
    retail_price?: number
    wholesale_price?: number
    distribution_price?: number
    product_id?: string
  }) => void
  isLoading?: boolean
  initialValues?: {
    sku: string
    variant_name: string
    uom_id?: string
    retail_price?: number
    wholesale_price?: number
    distribution_price?: number
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema?: any
}

export function VariantForm({
  productId,
  onSubmit,
  isLoading,
  initialValues,
  schema = createVariantSchema,
}: VariantFormProps) {
  const { t } = useTranslation()

  const form = useAppForm({
    defaultValues: initialValues ?? {
      sku: '',
      variant_name: '',
      uom_id: '',
      retail_price: undefined,
      wholesale_price: undefined,
      distribution_price: undefined,
    },
    validators: {
      onSubmit: schema,
    },
    onSubmit: async ({ value }) => {
      onSubmit(productId ? { ...value, product_id: productId } : value)
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
          name="sku"
          children={field => (
            <field.TextField
              label={t('entity.layout.product_variants.columns.sku')}
            />
          )}
        />
        <form.AppField
          name="variant_name"
          children={field => (
            <field.TextField
              label={t('entity.layout.product_variants.columns.variant_name')}
            />
          )}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <form.AppField
          name="uom_id"
          children={field => (
            <field.TextField
              label={t('entity.layout.product_variants.columns.uom')}
            />
          )}
        />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <form.AppField
          name="retail_price"
          children={field => (
            <field.NumberField
              label={t('entity.layout.product_variants.columns.retail')}
              min={0}
              max={999999}
              precision={2}
            />
          )}
        />
        <form.AppField
          name="wholesale_price"
          children={field => (
            <field.NumberField
              label={t('entity.layout.product_variants.columns.wholesale')}
              min={0}
              max={999999}
              precision={2}
            />
          )}
        />
        <form.AppField
          name="distribution_price"
          children={field => (
            <field.NumberField
              label={t('entity.layout.product_variants.columns.distribution')}
              min={0}
              max={999999}
              precision={2}
            />
          )}
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
