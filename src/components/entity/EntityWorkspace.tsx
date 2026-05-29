import { useState, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { invoke } from '@tauri-apps/api/core'
import { useQuery } from '@tanstack/react-query'
import { commands } from '@/lib/tauri-bindings'
import { getEntityLayout } from '@/lib/entity-layout'
import type {
  EntityWorkspaceProps,
  ColumnDef,
  VariantRow,
} from '@/lib/types/entity'
import { DataTableShell } from './DataTableShell'
import { cn } from '@/lib/utils'

function EntityHeader({ entityType }: { entityType: string }) {
  const { t } = useTranslation()

  const sections: Record<string, string> = {
    products: t('entity.workspace.section.inventory'),
    warehouses: t('entity.workspace.section.warehouses'),
    invoices: t('entity.workspace.section.sales'),
    customers: t('entity.workspace.section.partners'),
    bills: t('entity.workspace.section.purchases'),
    vendors: t('entity.workspace.section.partners'),
  }

  const section = sections[entityType] ?? ''
  const label = t(`sidebar.nav.${entityType}`, { defaultValue: entityType })
  const singularLabel = t(`sidebar.nav.singular.${entityType}`, {
    defaultValue: label,
  })
  const addNewLabel = t('entity.workspace.addNew', { entity: singularLabel })

  return (
    <header className="flex flex-col gap-2 px-margin-edge pb-6 bg-surface shadow-sm shrink-0">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <nav className="flex items-center space-x-2 text-on-surface-variant mb-1">
            <span className="font-label-caps text-label-caps">{section}</span>
            <span
              className={cn(
                'material-symbols-outlined text-sm',
                document.documentElement.getAttribute('dir') == 'rtl' &&
                  'rotate-180'
              )}
            >
              chevron_right
            </span>
            <span className="font-label-caps text-label-caps text-on-surface">
              {label}
            </span>
          </nav>
          <h1 className="font-headline-md text-headline-md text-on-surface">
            {label}
          </h1>
        </div>
        <button className="bg-secondary text-on-secondary px-4 py-2 rounded shadow-sm hover:opacity-90 active:scale-95 transition-all font-label-caps text-label-caps flex items-center gap-2">
          <span className="material-symbols-outlined">add</span>
          {addNewLabel.toUpperCase()}
        </button>
      </div>
    </header>
  )
}

async function exportToCSV(
  columns: ColumnDef[],
  data: Record<string, unknown>[]
) {
  const headers = columns
    .filter(c => c.visible)
    .map(c => c.label)
    .join(',')
  const rows = data.map(row =>
    columns
      .filter(c => c.visible)
      .map(c => {
        const value = row[c.id]
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value}"`
        }
        return String(value ?? '')
      })
      .join(',')
  )

  const csvFile = '\ufeff' + [headers, ...rows].join('\n')
  const filePath = `ma5zon-export-${Date.now()}.csv`

  try {
    await invoke('export_file', {
      filePath,
      content: csvFile,
    })
    console.error(`rust invoke export success!`)
  } catch (err) {
    console.error(`rust invoke export err: ${err}`)
  }
}

export function EntityWorkspace({ entityType }: EntityWorkspaceProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [variantsCache, setVariantsCache] = useState<Map<string, VariantRow[]>>(
    new Map()
  )
  const [loadingVariants, setLoadingVariants] = useState<Set<string>>(new Set())

  const handleRowToggleExpand = useCallback(
    async (id: string) => {
      const newExpanded = new Set(expandedIds)
      if (newExpanded.has(id)) {
        newExpanded.delete(id)
      } else {
        newExpanded.add(id)
        if (!variantsCache.has(id)) {
          setLoadingVariants(prev => new Set(prev).add(id))
          try {
            const result = await commands.variantsGetByProduct(id)
            if (result.status === 'ok') {
              const variantRows: VariantRow[] = result.data.map(v => ({
                ...v,
                uom_id: Number(v.uom_id),
              }))
              setVariantsCache(prev => new Map(prev).set(id, variantRows))
            }
          } finally {
            setLoadingVariants(prev => {
              const next = new Set(prev)
              next.delete(id)
              return next
            })
          }
        }
      }
      setExpandedIds(newExpanded)
    },
    [expandedIds, variantsCache]
  )

  const { data: entityData, isLoading } = useQuery({
    queryKey: ['entity', entityType],
    queryFn: async () => {
      switch (entityType) {
        case 'products': {
          const result = await commands.getAll([], [])
          return result.status === 'ok' ? result.data : []
        }
        case 'warehouses': {
          const result = await commands.warehousesGetAll([], [])
          return result.status === 'ok' ? result.data : []
        }
        default:
          return []
      }
    },
  })

  const { t } = useTranslation()

  const columns: ColumnDef[] = useMemo(
    () => getEntityLayout(entityType, t),
    [entityType, t]
  )

  const handleExport = async () => {
    await exportToCSV(columns, entityData ?? [])
  }

  return (
    <div className="px-margin-edge flex flex-col h-full bg-background py-6">
      <EntityHeader entityType={entityType} />
      <DataTableShell
        entityType={entityType}
        columns={columns}
        data={entityData ?? []}
        pagination={{
          page: 1,
          pageSize: 10,
          totalRows: (entityData ?? []).length,
          totalPages: 1,
        }}
        isLoading={isLoading}
        onSaveColumnPrefs={x => x}
        onFiltersApply={x => x}
        onExport={handleExport}
        expandedRowIds={expandedIds}
        variantsCache={variantsCache}
        onRowToggleExpand={handleRowToggleExpand}
        isLoadingVariants={id => loadingVariants.has(id)}
      />
    </div>
  )
}
