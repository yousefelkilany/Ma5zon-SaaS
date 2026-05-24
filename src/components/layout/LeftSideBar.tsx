import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

interface LeftSideBarProps {
  children?: React.ReactNode
  className?: string
}

interface NavItemProps {
  icon: string
  label: string
  href?: string
  active?: boolean
  collapsed: boolean
}

function NavItem({
  icon,
  label,
  href = '#',
  active = false,
  collapsed,
}: NavItemProps) {
  return (
    <a
      className={cn(
        'flex items-center gap-compact-gap pe-4 ps-1 py-2 rounded transition-all duration-300',
        active
          ? 'text-secondary bg-surface-container-high'
          : 'text-on-surface-variant hover:bg-surface-container-high'
      )}
      href={href}
    >
      <span className="material-symbols-outlined text-[20px] shrink-0">
        {icon}
      </span>
      <span
        className={cn(
          'font-body-sm text-body-sm whitespace-nowrap transition-all duration-300 origin-inline-start overflow-hidden',
          active && 'font-semibold',
          collapsed
            ? 'max-w-0 opacity-0 scale-x-0 rtl:origin-inline-end'
            : 'max-w-50 opacity-100 scale-x-100'
        )}
      >
        {label}
      </span>
    </a>
  )
}

interface NavSectionProps {
  title: string
  items: readonly {
    icon: string
    label: string
    href?: string
    active?: boolean
  }[]
  collapsed: boolean
  isLast?: boolean
}

function NavSection({
  title,
  items,
  collapsed,
  isLast = false,
}: NavSectionProps) {
  return (
    <div className={cn('relative', collapsed)}>
      <p
        className={cn(
          'px-4 text-[10px] font-label-caps text-on-surface-variant uppercase transition-all duration-300 origin-inline-start',
          collapsed
            ? 'scale-y-0 opacity-0 rtl:origin-inline-end'
            : 'scale-y-100 opacity-60'
        )}
      >
        {title}
      </p>
      <NavItemsList items={items} collapsed={collapsed} />
      {collapsed && !isLast && (
        <div className="absolute top-2 inset-inline-start-0 inset-inline-end-0 border-t border-amber-50 transition-all duration-300" />
      )}
    </div>
  )
}

function NavItemsList({
  items,
  collapsed,
}: {
  items: NavSectionProps['items']
  collapsed: boolean
}) {
  return (
    <div className="space-y-1">
      {items.map(item => (
        <NavItem key={item.label} {...item} collapsed={collapsed} />
      ))}
    </div>
  )
}

export function LeftSideBar({ className }: LeftSideBarProps) {
  const { t } = useTranslation()
  const [collapsed, setCollapsed] = useState(false)

  const NAV_SECTIONS = [
    {
      title: t('sidebar.nav.sales'),
      items: [
        { icon: 'receipt', label: t('sidebar.nav.invoices') },
        { icon: 'groups', label: t('sidebar.nav.customers') },
      ],
    },
    {
      title: t('sidebar.nav.purchases'),
      items: [
        { icon: 'shopping_cart', label: t('sidebar.nav.bills') },
        { icon: 'store', label: t('sidebar.nav.vendors') },
      ],
    },
    {
      title: t('sidebar.nav.inventory'),
      items: [
        { icon: 'inventory_2', label: t('sidebar.nav.stock') },
        { icon: 'warehouse', label: t('sidebar.nav.warehouses') },
      ],
    },
    {
      title: t('sidebar.nav.finance'),
      items: [
        { icon: 'account_balance_wallet', label: t('sidebar.nav.ledgers'), active: true },
        { icon: 'analytics', label: t('sidebar.nav.plReport') },
      ],
    },
    {
      title: t('sidebar.nav.system'),
      items: [
        { icon: 'bar_chart', label: t('sidebar.nav.reports') },
        { icon: 'settings', label: t('sidebar.nav.settings') },
      ],
    },
  ] as const

  return (
    <div
      className={cn(
        'flex flex-col h-full bg-surface-container border-inline-end border-outline-variant transition-all duration-300 relative z-50',
        collapsed ? 'w-16' : 'w-48',
        className
      )}
    >
      {/* Header with toggle */}
      <div className="px-gutter pt-cozy-padding flex items-center justify-end">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 hover:bg-surface-container-high rounded text-on-surface-variant focus-visible:ring-2 focus-visible:ring-primary"
          aria-label={collapsed ? t('titlebar.expandSidebar') : t('titlebar.collapseSidebar')}
        >
          <span className="material-symbols-outlined text-[20px]">
            {collapsed ? 'menu' : 'menu_open'}
          </span>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-4 py-2 space-y-4 no-scrollbar justify-start">
        {NAV_SECTIONS.map((section, index) => (
          <NavSection
            key={section.title}
            {...section}
            collapsed={collapsed}
            isLast={index === NAV_SECTIONS.length - 1}
          />
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 pb-6 mt-auto">
        <div className="border-t border-outline-variant mb-4" />
        <NavItem icon="logout" label={t('sidebar.actions.logout')} collapsed={collapsed} />
      </div>
    </div>
  )
}