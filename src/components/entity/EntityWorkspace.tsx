import { Skeleton } from '@/components/ui/skeleton'

interface EntityWorkspaceProps {
  entityType: string
}

function EntityHeader({ entityType }: { entityType: string }) {
  const entityNames: Record<string, { label: string; section: string }> = {
    invoices: { label: 'Invoices', section: 'SALES' },
    customers: { label: 'Customers', section: 'PARTNERS' },
    bills: { label: 'Bills', section: 'PURCHASES' },
    vendors: { label: 'Vendors', section: 'PARTNERS' },
    stock: { label: 'Stock', section: 'INVENTORY' },
    warehouses: { label: 'Warehouses', section: 'INVENTORY' },
    reports: { label: 'Reports', section: 'SYSTEM' },
    settings: { label: 'Settings', section: 'SYSTEM' },
  }

  const { label, section } = entityNames[entityType] || { label: entityType, section: '' }

  return (
    <header className="flex flex-col gap-2 px-6 pt-6 pb-4 bg-surface shadow-sm shrink-0">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <nav className="flex items-center space-x-2 text-on-surface-variant mb-1">
            <span className="font-label-caps text-label-caps">{section}</span>
            <span className="material-symbols-outlined text-sm">chevron_right</span>
            <span className="font-label-caps text-label-caps text-on-surface">{label}</span>
          </nav>
          <h1 className="font-headline-md text-headline-md text-on-surface">{label}</h1>
        </div>
        <button className="bg-secondary text-on-secondary px-4 py-2 rounded shadow-sm hover:opacity-90 active:scale-95 transition-all font-label-caps text-label-caps flex items-center gap-2">
          <span className="material-symbols-outlined">add</span>
          ADD NEW {label.toUpperCase().replace('S', '')}
        </button>
      </div>
    </header>
  )
}

function ToolbarSkeleton() {
  return (
    <section className="px-6 py-3 border-y border-outline-variant bg-surface-container-low flex items-center justify-between shrink-0">
      <div className="flex items-center gap-4 flex-1">
        <Skeleton className="h-8 w-full max-w-sm rounded" />
        <Skeleton className="h-8 w-24 rounded" />
        <Skeleton className="h-8 w-24 rounded" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-8 rounded" />
        <Skeleton className="h-8 w-8 rounded" />
      </div>
    </section>
  )
}

function ContentSkeleton() {
  const columns = ['checkbox', 'entity', 'doc', 'date', 'status', 'qty', 'price', 'total', 'actions']

  return (
    <main className="flex-1 overflow-auto custom-scrollbar bg-surface-container-lowest">
      <table className="w-full text-left border-collapse">
        <thead className="sticky top-0 bg-surface-container-high z-10 border-b border-outline">
          <tr className="font-label-caps text-label-caps text-on-surface-variant">
            {columns.map((col) => (
              <th key={col} className="px-3 py-3 font-medium border-r border-outline-variant">
                {col.toUpperCase()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="font-body-sm text-body-sm">
          {Array.from({ length: 8 }).map((_, rowIndex) => (
            <tr key={rowIndex} className="border-b border-outline-variant/30">
              {columns.map((col) => (
                <td key={col} className="px-3 py-2">
                  <Skeleton className="h-5 w-full" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  )
}

function FooterSkeleton() {
  return (
    <footer className="h-12 bg-surface-container-low border-t border-outline-variant px-6 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-6 w-12" />
        </div>
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="flex items-center gap-1">
        <Skeleton className="h-6 w-6 rounded" />
        <Skeleton className="h-6 w-6 rounded" />
        <Skeleton className="h-6 w-12 mx-2" />
        <Skeleton className="h-6 w-6 rounded" />
        <Skeleton className="h-6 w-6 rounded" />
      </div>
    </footer>
  )
}

export function EntityWorkspace({ entityType }: EntityWorkspaceProps) {
  return (
    <div className="flex flex-col h-full bg-background">
      <EntityHeader entityType={entityType} />
      <ToolbarSkeleton />
      <ContentSkeleton />
      <FooterSkeleton />
    </div>
  )
}