import { useTranslation } from 'react-i18next'

export function DashboardContent() {
  const { t } = useTranslation()

  return (
    <div className="px-margin-edge flex flex-col h-full bg-background py-6">
      <nav className="flex text-on-surface-variant text-[11px] font-label-caps uppercase tracking-wider mb-6">
        <a className="hover:text-primary" href="#">
          {t('dashboard.breadcrumb.finance')}
        </a>
        <span className="mx-2">/</span>
        <span className="text-on-surface font-bold">
          {t('dashboard.breadcrumb.executiveOverview')}
        </span>
      </nav>

      <div className="space-y-gutter">
        {/* KPI Cards */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">
          <KpiCard
            label={t('dashboard.kpi.grossRevenue')}
            value=""
            trend=""
            trendType="positive"
            currency={t('common.currency')}
          />
          <KpiCard
            label={t('dashboard.kpi.totalExpenses')}
            value=""
            trend=""
            trendType="negative"
            currency={t('common.currency')}
          />
          <KpiCard
            label={t('dashboard.kpi.netProfit')}
            value=""
            trend=""
            trendType="positive"
            currency={t('common.currency')}
          />
          <KpiCard
            label={t('dashboard.kpi.cashPosition')}
            value=""
            trend=""
            trendType="neutral"
            currency={t('common.currency')}
          />
        </section>

        {/* Charts */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-gutter">
          {/* Cash Flow Trends */}
          <div className="bg-surface-container border border-outline-variant rounded p-cozy-padding min-h-100 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-headline-sm text-on-surface">
                {t('dashboard.chart.cashFlowTrends')}
              </h3>
              <button className="text-secondary text-label-caps font-label-caps hover:underline">
                {t('dashboard.chart.downloadReport')}
              </button>
            </div>
            <div className="flex-1 bg-surface-container-low/50 rounded border border-outline-variant/20 flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 opacity-20 flex items-end">
                <div
                  className="w-full h-1/2 bg-secondary"
                  style={{
                    clipPath:
                      'polygon(0 80%, 15% 40%, 30% 60%, 45% 20%, 60% 50%, 75% 30%, 90% 45%, 100% 10%, 100% 100%, 0% 100%)',
                  }}
                />
              </div>
              <p className="text-on-surface-variant font-label-caps uppercase tracking-widest z-10">
                {t('dashboard.chart.cashInVsCashOut')}
              </p>
            </div>
          </div>

          {/* Revenue by Category */}
          <div className="bg-surface-container border border-outline-variant rounded p-cozy-padding min-h-100 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-headline-sm text-on-surface">
                {t('dashboard.chart.monthlyRevenue')}
              </h3>
              <div className="flex gap-2">
                <span className="w-3 h-3 bg-secondary rounded-full" />
                <span className="w-3 h-3 bg-primary rounded-full" />
              </div>
            </div>
            <div className="flex-1 flex flex-col justify-end gap-4 px-4">
              <div className="flex items-end gap-gutter h-full">
                <Bar height="85%" />
                <Bar height="60%" />
                <Bar height="45%" />
                <Bar height="75%" />
                <Bar height="95%" />
                <Bar height="30%" />
              </div>
              <div className="border-t border-outline-variant pt-2 flex justify-between text-[9px] font-label-caps text-on-surface-variant uppercase">
                <span>{t('dashboard.chart.jan')}</span>
                <span>{t('dashboard.chart.feb')}</span>
                <span>{t('dashboard.chart.mar')}</span>
                <span>{t('dashboard.chart.apr')}</span>
                <span>{t('dashboard.chart.may')}</span>
                <span>{t('dashboard.chart.jun')}</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

function KpiCard({
  label,
  value,
  trend,
  trendType,
  currency,
}: {
  label: string
  value: string
  trend: string
  trendType: 'positive' | 'negative' | 'neutral'
  currency: string
}) {
  const trendColors = {
    positive: 'text-secondary',
    negative: 'text-on-tertiary-container',
    neutral: 'text-on-surface-variant',
  }

  return (
    <div className="bg-surface-container p-cozy-padding border border-outline-variant rounded hover:border-secondary/30 transition-all flex flex-col justify-between h-36">
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
      <div>
        <p className="text-headline-lg font-headline-lg text-on-surface">
          {value}
        </p>
        <p className="text-on-surface-variant text-[12px] font-data-tabular uppercase">
          {currency}
        </p>
      </div>
    </div>
  )
}

function Bar({ height, label }: { height: string; label?: string }) {
  return (
    <div
      className="flex-1 bg-secondary rounded-t-sm group relative"
      style={{ height }}
    >
      {label && (
        <span className="absolute -top-6 inset-s-1/2 -translate-x-1/2 text-[10px] font-label-caps text-on-surface opacity-0 group-hover:opacity-100 transition-opacity">
          {label}
        </span>
      )}
    </div>
  )
}
