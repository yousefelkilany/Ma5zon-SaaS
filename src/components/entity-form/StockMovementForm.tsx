/* eslint-disable react/no-children-prop */
import { useState } from 'react'
import { useAppForm } from './createFormHook'
import { createStockMovementSchema } from '@/lib/validation/schemas'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useTranslation } from 'react-i18next'

interface StockMovementFormProps {
  onSubmit: (values: {
    variant_id: string
    from_warehouse_id?: string
    to_warehouse_id?: string
    quantity: number
    movement_type: string
  }) => void
  isLoading?: boolean
  warehouses?: { value: string; label: string }[]
  variantId?: string
}

const MOVEMENT_TYPES = [
  { value: 'transfer', label: 'Transfer' },
  { value: 'adjustment', label: 'Adjustment' },
  { value: 'received', label: 'Received' },
  { value: 'shipped', label: 'Shipped' },
]

export function StockMovementForm({
  onSubmit,
  isLoading,
  warehouses = [],
  variantId,
}: StockMovementFormProps) {
  const { t } = useTranslation()
  const [movementType, setMovementType] = useState<string>('')

  const form = useAppForm({
    defaultValues: {
      variant_id: variantId ?? '',
      from_warehouse_id: '',
      to_warehouse_id: '',
      quantity: 0,
      movement_type: '',
    },
    validators: {
      onSubmit: createStockMovementSchema,
    },
    onSubmit: async ({ value }) => {
      onSubmit(value)
    },
  })

  const showFromWarehouse =
    movementType === 'transfer' || movementType === 'shipped'
  const showToWarehouse =
    movementType === 'transfer' || movementType === 'received'

  return (
    <form
      onSubmit={e => {
        e.preventDefault()
        form.handleSubmit()
      }}
      className="space-y-4"
    >
      {!variantId && (
        <form.AppField
          name="variant_id"
          children={field => (
            <field.SelectField
              label={t('entity.stockMovement.variant')}
              options={[]}
              placeholder={t('entity.stockMovement.selectVariant')}
            />
          )}
        />
      )}

      <form.AppField
        name="movement_type"
        children={field => (
          <field.SelectField
            label={t('entity.stockMovement.movementType')}
            options={MOVEMENT_TYPES}
            onChange={val => setMovementType(val)}
          />
        )}
      />

      {showFromWarehouse && (
        <form.AppField
          name="from_warehouse_id"
          children={field => (
            <field.SelectField
              label={t('entity.stockMovement.fromWarehouse')}
              options={warehouses}
            />
          )}
        />
      )}

      {showToWarehouse && (
        <form.AppField
          name="to_warehouse_id"
          children={field => (
            <field.SelectField
              label={t('entity.stockMovement.toWarehouse')}
              options={warehouses}
            />
          )}
        />
      )}

      <form.AppField
        name="quantity"
        children={field => (
          <field.NumberField
            label={t('entity.stockMovement.quantity')}
            min={1}
            step={1}
          />
        )}
      />

      <div className="flex justify-end gap-2 pt-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? <Spinner /> : null}
          {t('entity.create.button')}
        </Button>
      </div>
    </form>
  )
}
