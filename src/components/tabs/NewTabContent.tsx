import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useTabStore } from '@/store/tab-store'
import type { TabType } from '@/lib/utils'

function KpiCard({
  label,
  value,
  trend,
  trendType,
}: {
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
        <span className="text-label-caps font-label-caps text-on-surface-variant">
          {label}
        </span>
        <span
          className={`text-body-sm font-data-tabular ${trendColors[trendType]}`}
        >
          {trend}
        </span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-headline-md font-headline-md text-on-surface">
          {value}
        </span>
        <span className="text-on-surface-variant text-[12px] font-data-tabular">
          USD
        </span>
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
  stats?: {
    label: string
    value: string | number
    type?: 'default' | 'warning'
  }[]
}

function WorkflowPanel({
  title,
  badge,
  badgeType = 'active',
  actions,
  stats,
}: WorkflowPanelProps) {
  const badgeStyles = {
    active:
      'bg-secondary-container/20 text-secondary border border-secondary/20',
    paused:
      'bg-surface-container-highest text-on-surface-variant border border-outline-variant',
    crit: 'bg-tertiary-container text-tertiary border border-tertiary/20',
    online:
      'bg-secondary-container/20 text-secondary border border-secondary/20',
  }

  return (
    <div className="bg-surface-container-high border border-outline-variant rounded overflow-hidden">
      <div className="bg-surface-container-highest px-compact-padding py-3 flex justify-between items-center">
        <h3 className="text-label-caps font-label-caps text-secondary">
          {title}
        </h3>
        {badge && (
          <span
            className={`${badgeStyles[badgeType]} text-[10px] px-2 py-0.5 rounded`}
          >
            {badge}
          </span>
        )}
      </div>
      <div className="p-compact-padding space-y-2">
        {actions.map((action, i) => (
          <ActionButton key={i} {...action} />
        ))}
        {stats && (
          <div className="mt-4 pt-4 border-t border-outline-variant/30 flex justify-between">
            {stats.map((stat, i) => (
              <div
                key={i}
                className={`text-center flex-1 ${i > 0 ? '' : 'border-r border-outline-variant/30'}`}
              >
                <p className="text-[10px] text-on-surface-variant label-caps uppercase mb-1">
                  {stat.label}
                </p>
                <p
                  className={`text-body-md font-data-tabular ${stat.type === 'warning' ? 'text-on-tertiary-container' : ''}`}
                >
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
  const { t } = useTranslation()
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
        <a className="hover:text-primary" href="#">
          {t('nav.appName')}
        </a>
      </nav>

      <div className="max-w-360 mx-auto space-y-gutter">
        {/* KPI Cards */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-gutter">
          <KpiCard
            label={t('dashboard.kpi.grossRevenue')}
            value="$2,842,910"
            trend="+12.4%"
            trendType="positive"
          />
          <KpiCard
            label={t('dashboard.kpi.totalExpenses')}
            value="$1,120,405"
            trend="+4.2%"
            trendType="negative"
          />
          <KpiCard
            label={t('dashboard.kpi.netProfit')}
            value="$1,722,505"
            trend="+18.1%"
            trendType="positive"
          />
          <KpiCard
            label={t('dashboard.kpi.cashPosition')}
            value="$4,290,112"
            trend="Stable"
            trendType="neutral"
          />
        </section>

        {/* Workflow Panels */}
        <section className="grid grid-cols-1 lg:grid-cols-4 gap-gutter">
          <WorkflowPanel
            title={t('dashboard.workflow.salesWorkflow')}
            badge="5 Active"
            actions={[
              { label: t('dashboard.workflow.createNewInvoice') },
              { label: t('dashboard.workflow.convertDraftQuotes'), badge: 12 },
              { label: t('dashboard.workflow.recurringBillings') },
            ]}
            stats={[
              { label: t('dashboard.status.awaiting'), value: 24 },
              {
                label: t('dashboard.status.overdue'),
                value: 8,
                type: 'warning',
              },
            ]}
          />

          <WorkflowPanel
            title={t('dashboard.workflow.purchaseOrder')}
            badge="Paused: 2"
            badgeType="paused"
            actions={[
              { label: t('dashboard.workflow.processBatchBills') },
              { label: t('dashboard.workflow.approvePOs'), badge: 4 },
              { label: t('dashboard.workflow.vendorManagement') },
            ]}
            stats={[
              { label: t('dashboard.status.open'), value: 15 },
              { label: t('dashboard.status.upcoming'), value: 12 },
            ]}
          />

          <WorkflowPanel
            title={t('dashboard.workflow.inventoryControl')}
            badge="Crit: 1"
            badgeType="crit"
            actions={[
              { label: t('dashboard.workflow.stockReconciliation') },
              { label: t('dashboard.workflow.priceAdjustmentLog') },
              { label: t('dashboard.workflow.replenishmentAudit') },
            ]}
            stats={[
              {
                label: t('dashboard.status.outStock'),
                value: 3,
                type: 'warning',
              },
              { label: t('dashboard.status.valuation'), value: '$1.2M' },
            ]}
          />

          <WorkflowPanel
            title={t('dashboard.workflow.treasuryOps')}
            badge="Online"
            badgeType="online"
            actions={[
              { label: t('dashboard.workflow.reconcileBankFeed'), badge: 114 },
              { label: t('dashboard.workflow.interAccountTransfer') },
              { label: t('dashboard.workflow.forexExposureReport') },
            ]}
            stats={[
              { label: t('dashboard.status.balances'), value: 6 },
              { label: t('dashboard.status.lastSync'), value: '2m ago' },
            ]}
          />
        </section>

        {/* Action Buttons */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-gutter">
          <ActionCard
            title={t('dashboard.actions.salesInvoice')}
            description={t('dashboard.actions.salesInvoiceDesc')}
            icon="receipt"
            onClick={() =>
              handleActionClick(
                'sales-invoice',
                t('dashboard.actions.salesInvoice')
              )
            }
          />
          <ActionCard
            title={t('dashboard.actions.purchaseInvoice')}
            description={t('dashboard.actions.purchaseInvoiceDesc')}
            icon="shopping_cart"
            onClick={() =>
              handleActionClick(
                'purchase-invoice',
                t('dashboard.actions.purchaseInvoice')
              )
            }
          />
        </section>
      </div>
    </div>
  )
}

function ActionCard({
  title,
  description,
  icon,
  onClick,
}: {
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
      <span className="material-symbols-outlined text-[32px] text-secondary">
        {icon}
      </span>
      <div>
        <h4 className="text-body-md font-body-md font-medium text-on-surface">
          {title}
        </h4>
        <p className="text-body-sm text-on-surface-variant">{description}</p>
      </div>
    </button>
  )
}
