import { useTranslation } from 'react-i18next'
// import { useTabStore } from '@/store/tab-store'
// import { useAuth } from '@/hooks/useAuth'
// import { requestLogin } from '@/hooks/useAuth'
// import type { TabType } from '@/lib/utils'

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
  const { t } = useTranslation()

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
          {t('common.currency')}
        </span>
      </div>
    </div>
  )
}

export function NewTabContent() {
  const { t } = useTranslation()
  // const navigate = useNavigate()
  // const { addTab } = useTabStore()
  // const { isLoggedIn } = useAuth()

  // const handleActionClick = (type: TabType, title: string) => {
  //   if (!isLoggedIn) {
  //     requestLogin()
  //     return
  //   }
  //   addTab({
  //     title,
  //     type,
  //     closable: true,
  //   })
  //   navigate(`/${type}`)
  // }

  return (
    <div className="px-margin-edge py-6">
      {/* KPI Cards */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-gutter">
        <KpiCard
          label={t('dashboard.kpi.grossRevenue')}
          value=""
          trend=""
          trendType="positive"
        />
        <KpiCard
          label={t('dashboard.kpi.totalExpenses')}
          value=""
          trend=""
          trendType="negative"
        />
        <KpiCard
          label={t('dashboard.kpi.netProfit')}
          value=""
          trend=""
          trendType="positive"
        />
        <KpiCard
          label={t('dashboard.kpi.cashPosition')}
          value=""
          trend=""
          trendType="neutral"
        />
      </section>

      {/* Workflow Panels */}
      {/* <section className="grid grid-cols-1 lg:grid-cols-3 gap-gutter py-cozy-padding">
        <WorkflowPanel
          title={t('dashboard.workflow.salesWorkflow')}
          // badge="5 Active"
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
          // badge="Paused: 2"
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
          // badge="Crit: 1"
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
            { label: t('dashboard.status.valuation'), value: '' },
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
      </section> */}

      {/* Action Buttons */}
      {/* <section className="grid grid-cols-1 lg:grid-cols-2 gap-gutter">
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
      </section> */}
    </div>
  )
}

// function ActionCard({
//   title,
//   description,
//   icon,
//   onClick,
// }: {
//   title: string
//   description: string
//   icon: string
//   onClick: () => void
// }) {
//   return (
//     <button
//       onClick={onClick}
//       className="bg-surface-container border border-outline-variant rounded p-cozy-padding flex items-center gap-4 hover:border-secondary/30 transition-all text-left"
//     >
//       <span className="material-symbols-outlined text-[32px] text-secondary">
//         {icon}
//       </span>
//       <div>
//         <h4 className="text-body-md font-body-md font-medium text-on-surface">
//           {title}
//         </h4>
//         <p className="text-body-sm text-on-surface-variant">{description}</p>
//       </div>
//     </button>
//   )
// }
