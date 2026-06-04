import { useTranslation } from 'react-i18next'
import { formatFieldValue, type FieldType } from '@/lib/constants'
import type { Product, Variant, Warehouse } from '@/lib/bindings'

interface FieldConfig {
  key: string
  label: string
  type: FieldType
}

type Entity = Product | Variant | Warehouse

interface EntityFieldGridProps {
  rows: FieldConfig[][]
  entity: Entity
}

export function EntityFieldGrid({ rows, entity }: EntityFieldGridProps) {
  const { t } = useTranslation()

  return (
    <div className="space-y-4">
      {rows.map((row, rowIndex) => (
        <div
          key={rowIndex}
          className="grid gap-4"
          style={{ gridTemplateColumns: `repeat(${row.length}, 1fr)` }}
        >
          {row.map(field => (
            <div key={field.key} className="space-y-1">
              <label className="text-label-caps text-on-surface-variant">
                {t(field.label)}
              </label>
              <p className="text-body-md text-on-surface">
                {formatFieldValue(
                  entity[field.key as keyof Entity],
                  field.type
                )}
              </p>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
