import { useNavigate } from 'react-router-dom'
import { useTabStore } from '@/store/tab-store'
import type { TabType } from '@/lib/utils'

function KpiCard({ label, value, trend, trendType }: {
  label: string
  value: string
  trend: string
  trendType: 'positive' | 'negative' | 'neutral'
}) {
  const trendColors = {
    positive: 'text-secondary',
    negative: 'text-on-tertiary-container',
    neutral: 'text-on-surface-variant',
  }

  return (
    <div className="bg-surface-container p-cozy-padding border border-outline-variant rounded hover:border-secondary/30 transition-all flex flex-col justify-between h-32 relative overflow-hidden group">
      <div className="flex justify-between items-start">
        <span className="text-label-caps font-label-caps text-on-surface-variant">{label}</span>
        <span className={`text-body-sm font-data-tabular ${trendColors[trendType]}`}>{trend}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-headline-md font-headline-md text-on-surface">{value}</span>
        <span className="text-on-surface-variant text-[12px] font-data-tabular">USD</span>
      </div>
    </div>
  )
}

interface ActionButtonProps {
  label: string
  badge?: string | number
}

function ActionButton({ label, badge }: ActionButtonProps) {
  return (
    <button className="w-full text-left p-3 hover:bg-surface-container-lowest transition-colors flex items-center justify-between rounded group">
      <span className="text-body-sm font-body-sm">{label}</span>
      <div className="flex items-center gap-2">
        {badge !== undefined && (
          <span className="bg-surface-container-highest text-on-surface-variant text-[10px] px-1.5 py-0.5 rounded">
            {badge}
          </span>
        )}
        <span className="material-symbols-outlined text-on-surface-variant group-hover:text-secondary text-sm">
          chevron_right
        </span>
      </div>
    </button>
  )
}

interface WorkflowPanelProps {
  title: string
  badge?: string
  badgeType?: 'active' | 'paused' | 'crit' | 'online'
  actions: { label: string; badge?: string | number }[]
  stats?: { label: string; value: string | number; type?: 'default' | 'warning' }[]
}

function WorkflowPanel({ title, badge, badgeType = 'active', actions, stats }: WorkflowPanelProps) {
  const badgeStyles = {
    active: 'bg-secondary-container/20 text-secondary border border-secondary/20',
    paused: 'bg-surface-container-highest text-on-surface-variant border border-outline-variant',
    crit: 'bg-tertiary-container text-tertiary border border-tertiary/20',
    online: 'bg-secondary-container/20 text-secondary border border-secondary/20',
  }

  return (
    <div className="bg-surface-container-high border border-outline-variant rounded overflow-hidden">
      <div className="bg-surface-container-highest px-compact-padding py-3 flex justify-between items-center">
        <h3 className="text-label-caps font-label-caps text-secondary">{title}</h3>
        {badge && <span className={`${badgeStyles[badgeType]} text-[10px] px-2 py-0.5 rounded`}>{badge}</span>}
      </div>
      <div className="p-compact-padding space-y-2">
        {actions.map((action, i) => (
          <ActionButton key={i} {...action} />
        ))}
        {stats && (
          <div className="mt-4 pt-4 border-t border-outline-variant/30 flex justify-between">
            {stats.map((stat, i) => (
              <div key={i} className={`text-center flex-1 ${i > 0 ? '' : 'border-r border-outline-variant/30'}`}>
                <p className="text-[10px] text-on-surface-variant label-caps uppercase mb-1">{stat.label}</p>
                <p className={`text-body-md font-data-tabular ${stat.type === 'warning' ? 'text-on-tertiary-container' : ''}`}>
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function NewTabContent() {
  const navigate = useNavigate()
  const { addTab } = useTabStore()

  const handleActionClick = (type: TabType, title: string) => {
    addTab({
      title,
      type,
      closable: true,
    })
    navigate(`/${type}`)
  }

  return (
    <div className="px-margin-edge py-6">
      <nav className="flex text-on-surface-variant text-[11px] font-label-caps uppercase tracking-wider mb-6">
        <a className="hover:text-primary" href="#">Finance</a>
        <span className="mx-2">/</span>
        <span className="text-on-surface font-bold">Executive Overview</span>
      </nav>

      <div className="max-w-[1440px] mx-auto space-y-gutter">
        {/* KPI Cards */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-gutter">
          <KpiCard label="Gross Revenue (MTD)" value="$2,842,910" trend="+12.4%" trendType="positive" />
          <KpiCard label="Total Expenses" value="$1,120,405" trend="+4.2%" trendType="negative" />
          <KpiCard label="Net Profit" value="$1,722,505" trend="+18.1%" trendType="positive" />
          <KpiCard label="Cash Position" value="$4,290,112" trend="Stable" trendType="neutral" />
        </section>

        {/* Workflow Panels */}
        <section className="grid grid-cols-1 lg:grid-cols-4 gap-gutter">
          <WorkflowPanel
            title="Sales Workflow"
            badge="5 Active"
            actions={[
              { label: 'Create New Invoice' },
              { label: 'Convert Draft Quotes', badge: 12 },
              { label: 'Recurring Billings' },
            ]}
            stats={[
              { label: 'Awaiting', value: 24 },
              { label: 'Overdue', value: 8, type: 'warning' },
            ]}
          />

          <WorkflowPanel
            title="Purchase Order"
            badge="Paused: 2"
            badgeType="paused"
            actions={[
              { label: 'Process Batch Bills' },
              { label: 'Approve POs', badge: 4 },
              { label: 'Vendor Management' },
            ]}
            stats={[
              { label: 'Open', value: 15 },
              { label: 'Upcoming', value: 12 },
            ]}
          />

          <WorkflowPanel
            title="Inventory Control"
            badge="Crit: 1"
            badgeType="crit"
            actions={[
              { label: 'Stock Reconciliation' },
              { label: 'Price Adjustment Log' },
              { label: 'Replenishment Audit' },
            ]}
            stats={[
              { label: 'Out Stock', value: 3, type: 'warning' },
              { label: 'Valuation', value: '$1.2M' },
            ]}
          />

          <WorkflowPanel
            title="Treasury Ops"
            badge="Online"
            badgeType="online"
            actions={[
              { label: 'Reconcile Bank Feed', badge: 114 },
              { label: 'Inter-Account Transfer' },
              { label: 'Forex Exposure Report' },
            ]}
            stats={[
              { label: 'Balances', value: 6 },
              { label: 'Last Sync', value: '2m ago' },
            ]}
          />
        </section>

        {/* Action Buttons */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-gutter">
          <ActionCard
            title="Sales Invoice"
            description="Create a new sales invoice"
            icon="receipt"
            onClick={() => handleActionClick('sales-invoice', 'Sales Invoice')}
          />
          <ActionCard
            title="Purchase Invoice"
            description="Create a new purchase invoice"
            icon="shopping_cart"
            onClick={() => handleActionClick('purchase-invoice', 'Purchase Invoice')}
          />
        </section>
      </div>
    </div>
  )
}

function ActionCard({ title, description, icon, onClick }: {
  title: string
  description: string
  icon: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="bg-surface-container border border-outline-variant rounded p-cozy-padding flex items-center gap-4 hover:border-secondary/30 transition-all text-left"
    >
      <span className="material-symbols-outlined text-[32px] text-secondary">{icon}</span>
      <div>
        <h4 className="text-body-md font-body-md font-medium text-on-surface">{title}</h4>
        <p className="text-body-sm text-on-surface-variant">{description}</p>
      </div>
    </button>
  )
}