import { useState } from 'react'
import { cn } from '@/lib/utils'

interface LeftSideBarProps {
  children?: React.ReactNode
  className?: string
}

export function LeftSideBar({ children, className }: LeftSideBarProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div
      className={cn(
        'flex flex-col h-full bg-surface-container border-r border-outline-variant transition-all duration-300 relative z-50',
        collapsed ? 'w-16' : 'w-64',
        className
      )}
    >
      {/* Header with toggle */}
      <div className="px-gutter py-cozy-padding flex items-center justify-between">
        {!collapsed && (
          <div className="flex items-center gap-compact-gap">
            <img
              alt="AccuLedger Logo"
              className="w-8 h-8 shrink-0"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBiZVh33XK4sg0Cf0Pm2N5FrKbpAMT8lNGK97INqjoemoBZsqlzyY7NiAgGS3jiGjEPzRX6s5XJyPyyEixFtC4Vj_hvysR6CBiupoA-ceSylGa8Dy44bMRlPcrGzA1WYFEJT-HR4cXIEJ2PUFTlS2QdTf5AjhxMrOmkibHJVWkrHMx6bzFoXPqCkiP2vlxvuyDbwHrlWKWaYlW8EV3M6ocVQ5ds4g6WyTZnIWhEHMvf2OV0ztC5yFT_0sF1Q4d-rcpdwYtHWMm6Azo"
            />
            <div className="flex flex-col">
              <span className="font-headline-sm text-headline-sm font-bold text-on-surface">
                AccuLedger
              </span>
              <span className="font-label-caps text-[9px] text-on-surface-variant">
                Enterprise Finance
              </span>
            </div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 hover:bg-surface-container-high rounded text-on-surface-variant"
        >
          <span className="material-symbols-outlined text-[20px]">
            {collapsed ? 'menu' : 'menu_open'}
          </span>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-4 no-scrollbar">
        {/* Sales */}
        <div>
          {!collapsed && (
            <p className="px-4 text-[10px] font-label-caps text-on-surface-variant mb-2 uppercase opacity-60">
              Sales
            </p>
          )}
          <div className="space-y-1">
            <a className="sidebar-item text-on-surface-variant flex items-center gap-compact-gap px-4 py-2 hover:bg-surface-container-high rounded transition-all" href="#">
              <span className="material-symbols-outlined text-[20px]">receipt</span>
              {!collapsed && <span className="sidebar-text font-body-sm text-body-sm">Invoices</span>}
            </a>
            <a className="sidebar-item text-on-surface-variant flex items-center gap-compact-gap px-4 py-2 hover:bg-surface-container-high rounded transition-all" href="#">
              <span className="material-symbols-outlined text-[20px]">groups</span>
              {!collapsed && <span className="sidebar-text font-body-sm text-body-sm">Customers</span>}
            </a>
          </div>
        </div>

        {/* Purchases */}
        <div>
          {!collapsed && (
            <p className="px-4 text-[10px] font-label-caps text-on-surface-variant mb-2 uppercase opacity-60">
              Purchases
            </p>
          )}
          <div className="space-y-1">
            <a className="sidebar-item text-on-surface-variant flex items-center gap-compact-gap px-4 py-2 hover:bg-surface-container-high rounded transition-all" href="#">
              <span className="material-symbols-outlined text-[20px]">shopping_cart</span>
              {!collapsed && <span className="sidebar-text font-body-sm text-body-sm">Bills</span>}
            </a>
            <a className="sidebar-item text-on-surface-variant flex items-center gap-compact-gap px-4 py-2 hover:bg-surface-container-high rounded transition-all" href="#">
              <span className="material-symbols-outlined text-[20px]">store</span>
              {!collapsed && <span className="sidebar-text font-body-sm text-body-sm">Vendors</span>}
            </a>
          </div>
        </div>

        {/* Inventory */}
        <div>
          {!collapsed && (
            <p className="px-4 text-[10px] font-label-caps text-on-surface-variant mb-2 uppercase opacity-60">
              Inventory
            </p>
          )}
          <div className="space-y-1">
            <a className="sidebar-item text-on-surface-variant flex items-center gap-compact-gap px-4 py-2 hover:bg-surface-container-high rounded transition-all" href="#">
              <span className="material-symbols-outlined text-[20px]">inventory_2</span>
              {!collapsed && <span className="sidebar-text font-body-sm text-body-sm">Stock</span>}
            </a>
            <a className="sidebar-item text-on-surface-variant flex items-center gap-compact-gap px-4 py-2 hover:bg-surface-container-high rounded transition-all" href="#">
              <span className="material-symbols-outlined text-[20px]">warehouse</span>
              {!collapsed && <span className="sidebar-text font-body-sm text-body-sm">Warehouses</span>}
            </a>
          </div>
        </div>

        {/* Finance */}
        <div>
          {!collapsed && (
            <p className="px-4 text-[10px] font-label-caps text-on-surface-variant mb-2 uppercase opacity-60">
              Finance
            </p>
          )}
          <div className="space-y-1">
            <a className="sidebar-item text-secondary flex items-center gap-compact-gap px-4 py-2 bg-surface-container-high rounded transition-all" href="#">
              <span className="material-symbols-outlined text-[20px]">account_balance_wallet</span>
              {!collapsed && <span className="sidebar-text font-body-sm text-body-sm font-semibold">Ledgers</span>}
            </a>
            <a className="sidebar-item text-on-surface-variant flex items-center gap-compact-gap px-4 py-2 hover:bg-surface-container-high rounded transition-all" href="#">
              <span className="material-symbols-outlined text-[20px]">analytics</span>
              {!collapsed && <span className="sidebar-text font-body-sm text-body-sm">P&L Report</span>}
            </a>
          </div>
        </div>

        {/* System */}
        <div>
          {!collapsed && (
            <p className="px-4 text-[10px] font-label-caps text-on-surface-variant mb-2 uppercase opacity-60">
              System
            </p>
          )}
          <div className="space-y-1">
            <a className="sidebar-item text-on-surface-variant flex items-center gap-compact-gap px-4 py-2 hover:bg-surface-container-high rounded transition-all" href="#">
              <span className="material-symbols-outlined text-[20px]">bar_chart</span>
              {!collapsed && <span className="sidebar-text font-body-sm text-body-sm">Reports</span>}
            </a>
            <a className="sidebar-item text-on-surface-variant flex items-center gap-compact-gap px-4 py-2 hover:bg-surface-container-high rounded transition-all" href="#">
              <span className="material-symbols-outlined text-[20px]">settings</span>
              {!collapsed && <span className="sidebar-text font-body-sm text-body-sm">Settings</span>}
            </a>
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="px-3 pb-6 mt-auto">
        <div className="border-t border-outline-variant mb-4" />
        <a className="sidebar-item text-on-surface-variant flex items-center gap-compact-gap px-4 py-2 hover:bg-surface-container-high rounded transition-all" href="#">
          <span className="material-symbols-outlined text-[20px]">logout</span>
          {!collapsed && <span className="sidebar-text font-body-sm text-body-sm">Logout</span>}
        </a>
      </div>
    </div>
  )
}