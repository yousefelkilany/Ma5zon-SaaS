import type { ColumnDef } from './types/entity'
import type { TFunction } from 'i18next'
import { entityLayoutConfig } from './entity-layout-config'

const SKIP_COLUMNS = ['id', '_id', 'pk', 'fk_']

export function getEntityLayout(
  entityType: string,
  t: TFunction,
  columnsSubset?: string[]
): ColumnDef[] {
  const entityConfig =
    entityLayoutConfig[entityType as keyof typeof entityLayoutConfig]

  if (!entityConfig) {
    console.warn(`[entity-layout] No layout found for entity: ${entityType}`)
    return []
  }

  return Object.entries(entityConfig.columns)
    .filter(([key]) => {
      const lower = key.toLowerCase()
      return (
        !SKIP_COLUMNS.some(skip => lower === skip || lower.endsWith(skip)) &&
        (!columnsSubset || columnsSubset.some(col => lower === col))
      )
    })
    .map(([key, config], index) => ({
      id: key,
      label: t(config.labelKey),
      type: config.type as ColumnDef['type'],
      typeLabel: t(`common.types.${config.type}`),
      width: config.width ?? 100,
      sortable: config.sortable ?? true,
      filterable: config.filterable ?? true,
      visible: config.visible ?? true,
      order: index + 1,
      isDataCol: config.isDataCol ?? true,
    }))
}
