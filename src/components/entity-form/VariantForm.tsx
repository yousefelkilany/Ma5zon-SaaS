import { useForm } from '@tanstack/react-form'
import { useTranslation } from 'react-i18next'
import type { z } from 'zod'
import { createVariantSchema, updateVariantSchema } from '@/lib/validation/schemas'
import { TextField, NumberField } from './fields'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'

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
  schema?: z.ZodSchema
}

export function VariantForm({
  productId,
  onSubmit,
  isLoading,
  initialValues,
  schema = createVariantSchema,
}: VariantFormProps) {
  const { t } = useTranslation()

  const form = useForm({
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
    <form onSubmit={form.handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <TextField
          name="sku"
          label={t('entity.layout.product_variants.columns.sku')}
          form={form}
        />
        <TextField
          name="variant_name"
          label={t('entity.layout.product_variants.columns.variant_name')}
          form={form}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <TextField name="uom_id" label={t('entity.layout.product_variants.columns.uom')} form={form} />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <NumberField
          name="retail_price"
          label={t('entity.layout.product_variants.columns.retail')}
          form={form}
          min={0}
          max={999999}
          precision={2}
        />
        <NumberField
          name="wholesale_price"
          label={t('entity.layout.product_variants.columns.wholesale')}
          form={form}
          min={0}
          max={999999}
          precision={2}
        />
        <NumberField
          name="distribution_price"
          label={t('entity.layout.product_variants.columns.distribution')}
          form={form}
          min={0}
          max={999999}
          precision={2}
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