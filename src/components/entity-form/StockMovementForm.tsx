import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { useTranslation } from 'react-i18next'
import { stockMovementSchema } from '@/lib/validation/schemas'
import { NumberField, SelectField } from './fields'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'

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
}: StockMovementFormProps) {
  const { t } = useTranslation()
  const [movementType, setMovementType] = useState<string>('')

  const form = useForm({
    defaultValues: {
      variant_id: '',
      from_warehouse_id: '',
      to_warehouse_id: '',
      quantity: 0,
      movement_type: '',
    },
    validators: {
      onSubmit: stockMovementSchema,
    },
    onSubmit: async ({ value }) => {
      onSubmit(value)
    },
  })

  const showFromWarehouse = movementType === 'transfer' || movementType === 'shipped'
  const showToWarehouse = movementType === 'transfer' || movementType === 'received'

  return (
    <form onSubmit={form.handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <SelectField
          name="variant_id"
          label={t('entity.stockMovement.variant')}
          options={[]}
          placeholder={t('entity.stockMovement.selectVariant')}
          form={form}
        />
        <SelectField
          name="movement_type"
          label={t('entity.stockMovement.movementType')}
          options={MOVEMENT_TYPES}
          form={form}
          onChange={val => setMovementType(val)}
        />
      </div>

      {showFromWarehouse && (
        <SelectField
          name="from_warehouse_id"
          label={t('entity.stockMovement.fromWarehouse')}
          options={warehouses}
          form={form}
        />
      )}

      {showToWarehouse && (
        <SelectField
          name="to_warehouse_id"
          label={t('entity.stockMovement.toWarehouse')}
          options={warehouses}
          form={form}
        />
      )}

      <NumberField
        name="quantity"
        label={t('entity.stockMovement.quantity')}
        min={1}
        step={1}
        form={form}
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