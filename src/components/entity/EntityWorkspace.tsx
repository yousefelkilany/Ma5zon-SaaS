import { useTranslation } from 'react-i18next'
import { invoke } from '@tauri-apps/api/core'
import type { EntityWorkspaceProps, ColumnDef } from '@/lib/types/entity'
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
  const singularLabel = t(`sidebar.nav.singular.${entityType}`, {
    defaultValue: label,
  })
  const addNewLabel = t('entity.workspace.addNew', { entity: singularLabel })

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

const mockEntityRows = [
  {
    id: '1',
    entity: 'Technovate Systems Inc.',
    doc: 'INV-2024-00124',
    qty: 1250,
    price: 45,
    total: 56250,
    status: 'Paid',
  },
  {
    id: '2',
    entity: 'Global Logistics Corp',
    doc: 'INV-2024-00132',
    qty: 480,
    price: 120,
    total: 57600,
    status: 'Overdue',
  },
  {
    id: '3',
    entity: 'Apex Manufacturing',
    doc: 'PO-88219-B',
    qty: 22000,
    price: 1.15,
    total: 25300,
    status: 'Draft',
  },
  {
    id: '4',
    entity: 'Zync Media Partners',
    doc: 'INV-2024-00145',
    qty: 1,
    price: 12400,
    total: 12400,
    status: 'Paid',
  },
  {
    id: '5',
    entity: 'Skyline Prop',
    doc: 'INV-2024-1000',
    qty: 1379,
    price: 8.16,
    total: 65633,
    status: 'Overdue',
  },
  {
    id: '6',
    entity: 'Quantum Innovations Ltd.',
    doc: 'INV-2024-00156',
    qty: 850,
    price: 75,
    total: 63750,
    status: 'Paid',
  },
  {
    id: '7',
    entity: 'Stellar Dynamics LLC',
    doc: 'INV-2024-00178',
    qty: 3200,
    price: 2.5,
    total: 8000,
    status: 'Draft',
  },
  {
    id: '8',
    entity: 'Horizon Tech Solutions',
    doc: 'PO-99341-A',
    qty: 500,
    price: 95,
    total: 47500,
    status: 'Overdue',
  },
  {
    id: '9',
    entity: 'Nexus Digital Services',
    doc: 'INV-2024-00201',
    qty: 1,
    price: 25000,
    total: 25000,
    status: 'Paid',
  },
  {
    id: '10',
    entity: 'Pioneer Systems Group',
    doc: 'INV-2024-00215',
    qty: 7500,
    price: 0.85,
    total: 6375,
    status: 'Overdue',
  },
  {
    id: '11',
    entity: 'Atlas Cloud Services',
    doc: 'INV-2024-00234',
    qty: 200,
    price: 450,
    total: 90000,
    status: 'Paid',
  },
  {
    id: '12',
    entity: 'Vertex Analytics Inc.',
    doc: 'PO-77321-C',
    qty: 10000,
    price: 0.45,
    total: 4500,
    status: 'Draft',
  },
  {
    id: '13',
    entity: 'Cobalt Networks Ltd.',
    doc: 'INV-2024-00267',
    qty: 50,
    price: 1200,
    total: 60000,
    status: 'Paid',
  },
  {
    id: '14',
    entity: 'Fusion Data Systems',
    doc: 'INV-2024-00289',
    qty: 4500,
    price: 3.25,
    total: 14625,
    status: 'Overdue',
  },
  {
    id: '15',
    entity: 'Summit Software Corp',
    doc: 'INV-2024-00312',
    qty: 1,
    price: 45000,
    total: 45000,
    status: 'Paid',
  },
  {
    id: '16',
    entity: 'Prism Hardware Solutions',
    doc: 'PO-66543-B',
    qty: 15000,
    price: 0.65,
    total: 9750,
    status: 'Draft',
  },
  {
    id: '17',
    entity: 'Echo Communications',
    doc: 'INV-2024-00345',
    qty: 300,
    price: 180,
    total: 54000,
    status: 'Paid',
  },
  {
    id: '18',
    entity: 'Nova Tech Ventures',
    doc: 'INV-2024-00378',
    qty: 2500,
    price: 5.5,
    total: 13750,
    status: 'Overdue',
  },
]

const mockPagination = {
  page: 1,
  pageSize: 10,
  totalRows: 18,
  totalPages: 2,
}

function getColumns(t: (key: string) => string): ColumnDef[] {
  return [
    {
      id: 'entity',
      label: t('entity.workspace.columns.entity'),
      type: 'text',
      width: 180,
      sortable: true,
      filterable: true,
      visible: true,
      order: 1,
      isNameColumn: true,
    },
    {
      id: 'doc',
      label: t('entity.workspace.columns.doc'),
      type: 'text',
      width: 140,
      sortable: true,
      filterable: true,
      visible: true,
      order: 2,
    },
    {
      id: 'qty',
      label: t('entity.workspace.columns.qty'),
      type: 'number',
      width: 100,
      sortable: true,
      filterable: false,
      visible: true,
      order: 3,
    },
    {
      id: 'price',
      label: t('entity.workspace.columns.price'),
      type: 'currency',
      width: 100,
      sortable: true,
      filterable: false,
      visible: true,
      order: 4,
    },
    {
      id: 'total',
      label: t('entity.workspace.columns.total'),
      type: 'currency',
      width: 120,
      sortable: true,
      filterable: false,
      visible: true,
      order: 5,
    },
    {
      id: 'status',
      label: t('entity.workspace.columns.status'),
      type: 'status',
      width: 100,
      sortable: true,
      filterable: true,
      visible: true,
      order: 6,
    },
  ]
}

async function exportToCSV(columns: ColumnDef[], data: typeof mockEntityRows) {
  const headers = columns
    .filter(c => c.visible)
    .map(c => c.label)
    .join(',')
  const rows = data.map(row =>
    columns
      .filter(c => c.visible)
      .map(c => {
        const value = (row as Record<string, unknown>)[c.id]
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
  const { t } = useTranslation()
  const columns = getColumns(t)
  const handleExport = async () => {
    await exportToCSV(columns, mockEntityRows)
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <EntityHeader entityType={entityType} />
      <DataTableShell
        entityType={entityType}
        columns={columns}
        data={mockEntityRows}
        pagination={mockPagination}
        isLoading={false}
        onSaveColumnPrefs={x => x}
        onFiltersApply={x => x}
        onExport={handleExport}
      />
    </div>
  )
}
