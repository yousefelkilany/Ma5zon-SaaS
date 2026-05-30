import type { ColumnDef } from './types/entity'
import type { TFunction } from 'i18next'
import { entityLayoutConfig } from './entity-layout-config'

const SKIP_COLUMNS = ['id', '_id', 'pk', 'fk_']

export function getEntityLayout(entityType: string, t: TFunction): ColumnDef[] {
  const entityConfig =
    entityLayoutConfig[entityType as keyof typeof entityLayoutConfig]

  if (!entityConfig) {
    console.warn(`[entity-layout] No layout found for entity: ${entityType}`)
    return []
  }

  return Object.entries(entityConfig.columns)
    .filter(([key]) => {
      const lower = key.toLowerCase()
      return !SKIP_COLUMNS.some(skip => lower === skip || lower.endsWith(skip))
    })
    .map(([key, config], index) => ({
      id: key,
      label: t(config.labelKey),
      type: config.type as ColumnDef['type'],
      typeLabel: t(`common.types.${config.type}`),
      width: config.width,
      sortable: true,
      filterable: true,
      visible: true,
      order: index + 1,
      isNameColumn: index === 0,
    }))
}
