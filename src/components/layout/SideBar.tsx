import { useState, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { useTabStore } from '@/store/workspace-store'
import { useAuth } from '@/hooks/useAuth'
import { requestLogin } from '@/hooks/useAuth'

interface SideBarProps {
  children?: React.ReactNode
  className?: string
}

interface NavItemProps {
  icon: string
  label: string
  href?: string
  active?: boolean
  collapsed: boolean
  onClick?: () => void
}

function NavItem({
  icon,
  label,
  active = false,
  collapsed,
  onClick,
}: NavItemProps) {
  return (
    <button
      type="button"
      className={cn(
        'flex w-full items-center gap-compact-gap pe-4 ps-1 py-2 rounded transition-all duration-300 text-start',
        active
          ? 'text-secondary bg-surface-container-high'
          : 'text-on-surface-variant hover:bg-surface-container-high'
      )}
      onClick={onClick}
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
    </button>
  )
}

interface NavSectionProps {
  title: string
  items: readonly {
    icon: string
    label: string
    href?: string
    active?: boolean
    onClick?: () => void
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
        <div className="absolute top-2 inset-inline-start-0 inset-inline-end-0 border-t border-outline-variant transition-all duration-300" />
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
        <NavItem
          key={item.label}
          {...item}
          collapsed={collapsed}
          onClick={item.onClick}
        />
      ))}
    </div>
  )
}

export function SideBar({ className }: SideBarProps) {
  const { t } = useTranslation()
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const addTab = useTabStore(state => state.addTab)
  const setActiveTab = useTabStore(state => state.setActiveTab)
  const { isLoggedIn, logout } = useAuth()

  const handleEntityClick = useCallback(
    (entityType: string, title: string) => {
      if (!isLoggedIn) {
        requestLogin()
        return
      }
      const existingTab = useTabStore.getState().getTabByEntityType(entityType)

      if (existingTab) {
        setActiveTab(existingTab.id)
      } else {
        const newTabId = addTab({
          title,
          type: 'entity',
          closable: true,
          entityType,
        })
        setActiveTab(newTabId)
      }

      navigate({ to: '/entity/$entityType', params: { entityType } })
    },
    [addTab, setActiveTab, navigate, isLoggedIn]
  )

  const NAV_SECTIONS = useMemo(
    () =>
      [
        {
          title: t('sidebar.nav.inventory'),
          items: [
            {
              icon: 'inventory_2',
              label: t('sidebar.nav.product'),
              entityType: 'product',
              onClick: () =>
                handleEntityClick('product', t('sidebar.nav.product')),
            },
            {
              icon: 'warehouse',
              label: t('sidebar.nav.warehouse'),
              entityType: 'warehouse',
              onClick: () =>
                handleEntityClick('warehouse', t('sidebar.nav.warehouse')),
            },
          ],
        },
        {
          title: t('sidebar.nav.sales'),
          items: [
            {
              icon: 'receipt',
              label: t('sidebar.nav.invoice'),
              entityType: 'invoice',
              onClick: () =>
                handleEntityClick('invoice', t('sidebar.nav.invoice')),
            },
            {
              icon: 'groups',
              label: t('sidebar.nav.customer'),
              entityType: 'customer',
              onClick: () =>
                handleEntityClick('customer', t('sidebar.nav.customer')),
            },
          ],
        },
        {
          title: t('sidebar.nav.purchases'),
          items: [
            {
              icon: 'shopping_cart',
              label: t('sidebar.nav.bill'),
              entityType: 'bill',
              onClick: () => handleEntityClick('bill', t('sidebar.nav.bill')),
            },
            {
              icon: 'store',
              label: t('sidebar.nav.vendor'),
              entityType: 'vendor',
              onClick: () =>
                handleEntityClick('vendor', t('sidebar.nav.vendor')),
            },
          ],
        },
      ] as const,
    [t, handleEntityClick]
  )

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
          aria-label={
            collapsed
              ? t('titlebar.expandSidebar')
              : t('titlebar.collapseSidebar')
          }
        >
          <span className="material-symbols-outlined text-[20px] icon-directional">
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
        {isLoggedIn && (
          <NavItem
            icon="logout"
            label={t('sidebar.actions.logout')}
            collapsed={collapsed}
            onClick={logout}
          />
        )}
      </div>
    </div>
  )
}
