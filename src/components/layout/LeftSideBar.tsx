import { useState } from 'react'
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

const NAV_SECTIONS = [
  {
    title: 'Sales',
    items: [
      { icon: 'receipt', label: 'Invoices' },
      { icon: 'groups', label: 'Customers' },
    ],
  },
  {
    title: 'Purchases',
    items: [
      { icon: 'shopping_cart', label: 'Bills' },
      { icon: 'store', label: 'Vendors' },
    ],
  },
  {
    title: 'Inventory',
    items: [
      { icon: 'inventory_2', label: 'Stock' },
      { icon: 'warehouse', label: 'Warehouses' },
    ],
  },
  {
    title: 'Finance',
    items: [
      { icon: 'account_balance_wallet', label: 'Ledgers', active: true },
      { icon: 'analytics', label: 'P&L Report' },
    ],
  },
  {
    title: 'System',
    items: [
      { icon: 'bar_chart', label: 'Reports' },
      { icon: 'settings', label: 'Settings' },
    ],
  },
] as const

export function LeftSideBar({ className }: LeftSideBarProps) {
  const [collapsed, setCollapsed] = useState(false)

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
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
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
        <NavItem icon="logout" label="Logout" collapsed={collapsed} />
      </div>
    </div>
  )
}
