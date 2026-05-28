import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { invoke } from '@tauri-apps/api/core'
import { useQuery } from '@tanstack/react-query'
import { commands, unwrapResult } from '@/lib/tauri-bindings'
import type { EntityWorkspaceProps, ColumnDef, VariantRow } from '@/lib/types/entity'
import { DataTableShell } from './DataTableShell'

function EntityHeader({ entityType }: { entityType: string }) {
  const { t } = useTranslation()

  const sections: Record<string, string> = {
    invoices: t('entity.workspace.section.sales'),
    customers: t('entity.workspace.section.partners'),
    bills: t('entity.workspace.section.purchases'),
    vendors: t('entity.workspace.section.partners'),
    stock: t('entity.workspace.section.inventory'),
    warehouses: t('entity.workspace.section.inventory'),
    reports: t('entity.workspace.section.system'),
    settings: t('entity.workspace.section.system'),
    products: t('entity.workspace.section.inventory'),
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
            <span className="material-symbols-outlined text-sm icon-directional">
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

async function exportToCSV(columns: ColumnDef[], data: Record<string, unknown>[]) {
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



function convertTableLayout(layout: { table_name: string; columns: Array<{ id: string; name: string; col_type: string; width: number }> }): ColumnDef[] {
  return layout.columns.map((col, index) => ({
    id: col.id,
    label: col.name,
    type: col.col_type as ColumnDef['type'],
    width: col.width,
    sortable: true,
    filterable: true,
    visible: true,
    order: index + 1,
    isNameColumn: index === 1,
  }))
}

export function EntityWorkspace({ entityType }: EntityWorkspaceProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [variantsCache, setVariantsCache] = useState<Map<string, VariantRow[]>>(new Map())
  const [loadingVariants, setLoadingVariants] = useState<Set<string>>(new Set())

  const handleRowToggleExpand = useCallback(async (id: string) => {
    const newExpanded = new Set(expandedIds)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
      if (!variantsCache.has(id)) {
        setLoadingVariants(prev => new Set(prev).add(id))
        try {
          const result = await commands.variants.get_by_product(parseInt(id))
          if (result.status === 'ok') {
            setVariantsCache(prev => new Map(prev).set(id, result.data))
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
  }, [expandedIds, variantsCache])

  const { data: products, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => commands.products.getAll(),
  })

  const { data: tableLayout } = useQuery({
    queryKey: ['tableLayout', entityType],
    queryFn: () => unwrapResult(commands.getTableLayout(entityType)),
  })

  const productColumns: ColumnDef[] = tableLayout 
    ? convertTableLayout(tableLayout)
    : [
        { id: 'id', label: 'ID', type: 'number', width: 80, sortable: true, filterable: true, visible: true, order: 1 },
        { id: 'name', label: 'Product Name', type: 'text', width: 200, sortable: true, filterable: true, visible: true, order: 2, isNameColumn: true },
      ]

  const handleExport = async () => {
    await exportToCSV(productColumns, products ?? [])
  }

  return (
    <div className="px-margin-edge flex flex-col h-full bg-background py-6">
      <EntityHeader entityType={entityType} />
      <DataTableShell
        entityType="products"
        columns={productColumns}
        data={products ?? []}
        pagination={{ page: 1, pageSize: 50, totalRows: (products ?? []).length, totalPages: 1 }}
        isLoading={isLoading}
        onSaveColumnPrefs={x => x}
        onFiltersApply={x => x}
        onExport={handleExport}
        expandedRowIds={expandedIds}
        variantsCache={variantsCache}
        onRowToggleExpand={handleRowToggleExpand}
        isLoadingVariants={(id) => loadingVariants.has(id)}
      />
    </div>
  )
}