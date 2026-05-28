import type { ColumnDef } from './types/entity'
import type { TFunction } from 'i18next'

const SKIP_COLUMNS = ['id', '_id', 'pk', 'fk_']

export function getEntityLayout(
  entityType: string,
  t: TFunction
): ColumnDef[] {
  const layout = t(`entity.layout.${entityType}`, { returnObjects: true })

  if (!layout || typeof layout !== 'object') {
    console.warn(`[entity-layout] No layout found for entity: ${entityType}`)
    return []
  }

  const columns = layout.columns as Record<
    string,
    { label: string; type: string; width: number }
  >

  return Object.entries(columns)
    .filter(([key]) => {
      const lower = key.toLowerCase()
      return !SKIP_COLUMNS.some(skip => lower === skip || lower.endsWith(skip))
    })
    .map(([key, config], index) => ({
      id: key,
      label: config.label,
      type: config.type as ColumnDef['type'],
      width: config.width,
      sortable: true,
      filterable: true,
      visible: true,
      order: index + 1,
      isNameColumn: index === 0,
    }))
}