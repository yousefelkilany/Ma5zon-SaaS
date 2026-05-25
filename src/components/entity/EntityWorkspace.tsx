import { useTranslation } from 'react-i18next'
import type { EntityWorkspaceProps } from '@/lib/types/entity'
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
  }

  const section = sections[entityType] ?? ''
  const label = t(`sidebar.nav.${entityType}`, { defaultValue: entityType })
  const addNewLabel = t('entity.workspace.addNew', { entity: label })

  return (
    <header className="flex flex-col gap-2 px-6 pt-6 pb-4 bg-surface shadow-sm shrink-0">
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

const mockColumns = [
  { id: 'entity', label: 'Entity', type: 'text' as const, width: 180, sortable: true, filterable: true, visible: true, order: 1 },
  { id: 'doc', label: 'Document #', type: 'text' as const, width: 140, sortable: true, filterable: true, visible: true, order: 2 },
  { id: 'qty', label: 'Quantity', type: 'number' as const, width: 100, sortable: true, filterable: false, visible: true, order: 3 },
  { id: 'price', label: 'Unit Price', type: 'currency' as const, width: 100, sortable: true, filterable: false, visible: true, order: 4 },
  { id: 'total', label: 'Total Amount', type: 'currency' as const, width: 120, sortable: true, filterable: false, visible: true, order: 5 },
  { id: 'status', label: 'Status', type: 'status' as const, width: 100, sortable: true, filterable: true, visible: true, order: 6 },
]

const mockEntityRows = [
  { id: '1', entity: 'Technovate Systems Inc.', doc: 'INV-2024-00124', qty: 1250, price: 45, total: 56250, status: 'Paid' },
  { id: '2', entity: 'Global Logistics Corp', doc: 'INV-2024-00132', qty: 480, price: 120, total: 57600, status: 'Overdue' },
  { id: '3', entity: 'Apex Manufacturing', doc: 'PO-88219-B', qty: 22000, price: 1.15, total: 25300, status: 'Draft' },
  { id: '4', entity: 'Zync Media Partners', doc: 'INV-2024-00145', qty: 1, price: 12400, total: 12400, status: 'Paid' },
  { id: '5', entity: 'Skyline Prop', doc: 'INV-2024-1000', qty: 1379, price: 8.16, total: 65633, status: 'Overdue' },
]

const mockPagination = {
  page: 1,
  pageSize: 50,
  totalRows: 5,
  totalPages: 1,
}

export function EntityWorkspace({ entityType }: EntityWorkspaceProps) {
  return (
    <div className="flex flex-col h-full bg-background">
      <EntityHeader entityType={entityType} />
      <DataTableShell
        entityType={entityType}
        columns={mockColumns}
        data={mockEntityRows}
        pagination={mockPagination}
        isLoading={false}
        onSaveColumnPrefs={() => {}}
        onFiltersApply={() => {}}
        onExport={() => {}}
      />
    </div>
  )
}