# Tabbed Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a tabbed shell layout with navbar, tab bar, collapsible sidebar, and dashboard/new-tab content areas with browser history support.

**Architecture:** Zustand store manages tabs array and active tab. React Router syncs URL with active tab for browser back/forward. Components render based on active tab type.

**Tech Stack:** React 19, Zustand 5, React Router 7, Tailwind CSS 4, Radix UI primitives

---

## File Structure

```
src/
├── store/
│   ├── ui-store.ts              (existing - no changes)
│   └── tab-store.ts              (new - tab state management)
├── components/
│   ├── layout/
│   │   ├── MainWindow.tsx        (modify - add BrowserRouter)
│   │   ├── MainWindowContent.tsx (modify - add routing)
│   │   ├── LeftSideBar.tsx       (modify - collapse/expand)
│   │   ├── Navbar.tsx            (new)
│   │   └── TabBar.tsx            (new)
│   └── tabs/
│       ├── DashboardContent.tsx   (new)
│       ├── NewTabContent.tsx      (new)
│       └── index.ts
├── lib/
│   └── utils.ts                  (modify - add cn helper)
```

---

## Task 1: Install react-router-dom

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install react-router-dom**

Run: `cd /mnt/C/Ma5zon-SaaS && pnpm add react-router-dom`

Expected: Adds react-router-dom to dependencies

- [ ] **Step 2: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "feat: add react-router-dom for tab routing"
```

---

## Task 2: Create Tab Store

**Files:**
- Create: `src/store/tab-store.ts`
- Test: `src/store/tab-store.test.ts`

- [ ] **Step 1: Create tab types in lib/utils.ts**

Add `Tab` and `TabType` to the utility file for type reuse:

```typescript
// Add after existing exports in lib/utils.ts
export type TabType = 'dashboard' | 'new-tab' | 'sales-invoice' | 'purchase-invoice'

export interface Tab {
  id: string
  title: string
  type: TabType
  closable: boolean
}
```

- [ ] **Step 2: Create the tab store**

Create `src/store/tab-store.ts`:

```typescript
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { cn } from '@/lib/utils'

const DEFAULT_DASHBOARD_TAB = {
  id: 'dashboard',
  title: 'Dashboard',
  type: 'dashboard' as const,
  closable: false,
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}

interface TabState {
  tabs: Tab[]
  activeTabId: string

  addTab: (tab: Omit<Tab, 'id'>) => string
  removeTab: (tabId: string) => void
  setActiveTab: (tabId: string) => void
  getActiveTab: () => Tab | undefined
  getTabByType: (type: TabType) => Tab | undefined
}

export const useTabStore = create<TabState>()(
  devtools(
    (set, get) => ({
      tabs: [DEFAULT_DASHBOARD_TAB],
      activeTabId: 'dashboard',

      addTab: (tabData) => {
        const newTab: Tab = {
          ...tabData,
          id: generateId(),
        }
        set(state => ({
          tabs: [...state.tabs, newTab],
          activeTabId: newTab.id,
        }))
        return newTab.id
      },

      removeTab: (tabId) => {
        const { tabs, activeTabId } = get()
        const tab = tabs.find(t => t.id === tabId)
        if (!tab || !tab.closable) return

        const newTabs = tabs.filter(t => t.id !== tabId)

        // Enforce dashboard at index 0
        const dashboardTab = newTabs.find(t => t.type === 'dashboard')
        const otherTabs = newTabs.filter(t => t.type !== 'dashboard')
        const reorderedTabs = dashboardTab ? [dashboardTab, ...otherTabs] : newTabs

        let newActiveId = activeTabId
        if (activeTabId === tabId) {
          const closedIndex = tabs.findIndex(t => t.id === tabId)
          newActiveId = reorderedTabs[Math.min(closedIndex, reorderedTabs.length - 1)]?.id || 'dashboard'
        }

        set({ tabs: reorderedTabs, activeTabId: newActiveId })
      },

      setActiveTab: (tabId) => {
        set({ activeTabId: tabId })
      },

      getActiveTab: () => {
        const { tabs, activeTabId } = get()
        return tabs.find(t => t.id === activeTabId)
      },

      getTabByType: (type) => {
        const { tabs } = get()
        return tabs.find(t => t.type === type)
      },
    }),
    { name: 'tab-store' }
  )
)
```

- [ ] **Step 3: Create tests**

Create `src/store/tab-store.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { useTabStore } from './tab-store'

describe('useTabStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useTabStore.setState({
      tabs: [{
        id: 'dashboard',
        title: 'Dashboard',
        type: 'dashboard',
        closable: false,
      }],
      activeTabId: 'dashboard',
    })
  })

  it('should have dashboard as initial tab', () => {
    const { tabs, activeTabId } = useTabStore.getState()
    expect(tabs).toHaveLength(1)
    expect(tabs[0].type).toBe('dashboard')
    expect(tabs[0].closable).toBe(false)
    expect(activeTabId).toBe('dashboard')
  })

  it('should add a new tab', () => {
    const { addTab } = useTabStore.getState()
    const newId = addTab({ title: 'New Tab', type: 'new-tab', closable: true })

    const { tabs, activeTabId } = useTabStore.getState()
    expect(tabs).toHaveLength(2)
    expect(activeTabId).toBe(newId)
    expect(tabs[1].title).toBe('New Tab')
  })

  it('should remove a closable tab', () => {
    const { addTab, removeTab } = useTabStore.getState()
    const newId = addTab({ title: 'Test', type: 'new-tab', closable: true })
    removeTab(newId)

    const { tabs } = useTabStore.getState()
    expect(tabs).toHaveLength(1)
    expect(tabs[0].type).toBe('dashboard')
  })

  it('should not remove non-closable tab', () => {
    const { removeTab } = useTabStore.getState()
    removeTab('dashboard')

    const { tabs } = useTabStore.getState()
    expect(tabs).toHaveLength(1)
    expect(tabs[0].type).toBe('dashboard')
  })

  it('should switch active tab', () => {
    const { addTab, setActiveTab } = useTabStore.getState()
    const newId = addTab({ title: 'Test', type: 'new-tab', closable: true })
    setActiveTab('dashboard')

    const { activeTabId } = useTabStore.getState()
    expect(activeTabId).toBe('dashboard')
  })
})
```

- [ ] **Step 4: Run tests**

Run: `cd /mnt/C/Ma5zon-SaaS && pnpm test src/store/tab-store.test.ts`

Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add src/store/tab-store.ts src/store/tab-store.test.ts src/lib/utils.ts
git commit -m "feat: add tab store with dashboard invariant"
```

---

## Task 3: Create Navbar Component

**Files:**
- Create: `src/components/layout/Navbar.tsx`
- Modify: `src/components/layout/MainWindow.tsx` (import Navbar)

- [ ] **Step 1: Create Navbar component**

Create `src/components/layout/Navbar.tsx`:

```typescript
import { cn } from '@/lib/utils'
import { useUIStore } from '@/store/ui-store'

export function Navbar() {
  const leftSidebarVisible = useUIStore(state => state.leftSidebarVisible)

  return (
    <header className="flex items-center h-16 px-gutter bg-surface-container-low border-b border-outline-variant shrink-0">
      {/* Left: Logo */}
      <div className="flex items-center gap-compact-gap">
        <img
          alt="Ma5zon Logo"
          className="w-8 h-8 shrink-0"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuBiZVh33XK4sg0Cf0Pm2N5FrKbpAMT8lNGK97INqjoemoBZsqlzyY7NiAgGS3jiGjEPzRX6s5XJyPyyEixFtC4Vj_hvysR6CBiupoA-ceSylGa8Dy44bMRlPcrGzA1WYFEJT-HR4cXIEJ2PUFTlS2QdTf5AjhxMrOmkibHJVWkrHMx6bzFoXPqCkiP2vlxvuyDbwHrlWKWaYlW8EV3M6ocVQ5ds4g6WyTZnIWhEHMvf2OV0ztC5yFT_0sF1Q4d-rcpdwYtHWMm6Azo"
        />
        <div className="flex flex-col">
          <span className="font-headline-sm text-headline-sm font-bold text-on-surface">
            Ma5zon
          </span>
          <span className="font-label-caps text-[9px] text-on-surface-variant">
            Enterprise Finance
          </span>
        </div>
      </div>

      {/* Center: Global Search */}
      <div className="flex-1 flex items-center max-w-xl mx-8">
        <div className="relative w-full">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
            search
          </span>
          <input
            className="bg-surface-container-high border border-outline-variant/30 rounded-lg pl-10 pr-4 py-2 text-body-sm font-body-sm text-on-surface focus:ring-1 focus:ring-primary w-full transition-all"
            placeholder="Global Search (Records, Invoices, Customers)..."
            type="text"
          />
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-cozy-gap">
        <button className="bg-secondary text-on-secondary px-4 py-2 rounded-lg flex items-center gap-2 font-label-caps text-label-caps font-bold hover:opacity-90 transition-all">
          <span className="material-symbols-outlined text-[18px]">add</span>
          Quick Add
        </button>
        <div className="flex items-center gap-2 border-l border-outline-variant pl-cozy-gap">
          <button className="p-2 text-on-surface-variant hover:bg-surface-container-high rounded-full relative">
            <span className="material-symbols-outlined">notifications</span>
            <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full border-2 border-surface-container-low" />
          </button>
          <button className="p-2 text-on-surface-variant hover:bg-surface-container-high rounded-full">
            <span className="material-symbols-outlined">settings</span>
          </button>
          <div className="flex items-center gap-compact-gap cursor-pointer hover:bg-surface-container-high p-1 pr-3 rounded-full transition-colors ml-2">
            <img
              alt="User Profile"
              className="w-8 h-8 rounded-full border border-secondary"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAUBAQM9pd0d2Y8CyJX6QTiPWqXNZTzy2Dvsz_OYI_RhgqqQBO7jfH7iXr3tiD5m58oLfeYLboKxEeJ6qRvPmL8wgFw2mJV51DGt9FMuZQ0dntsReqcm4VhWQPJwNU8efHXGmD-wxzLibbyzc2khT29AKRbbhOivAOxGwe6H69jXIJIHK5699KvwRPkaSdrstAeU3WY2_A9cWK1lGotJwgcZtxQwXxWXeUt-9iDBQH5Udos-CZmoHXZIZLI-cP9eXuaw6LFlHbu96k"
            />
            <div className="hidden lg:block leading-tight">
              <p className="font-body-sm text-body-sm font-bold text-primary">
                Alex Sterling
              </p>
              <p className="font-label-caps text-[9px] text-on-surface-variant uppercase">
                Senior Analyst
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
```

- [ ] **Step 2: Update MainWindow to include Navbar**

Modify `src/components/layout/MainWindow.tsx` to add Navbar:

```typescript
// Add import at top
import { Navbar } from './Navbar'

// Replace TitleBar with Navbar in the JSX
// Change:
<TitleBar />
// To:
<Navbar />
```

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/Navbar.tsx src/components/layout/MainWindow.tsx
git commit -m "feat: add Navbar component with logo, search, profile"
```

---

## Task 4: Create TabBar Component

**Files:**
- Create: `src/components/layout/TabBar.tsx`
- Modify: `src/components/layout/MainWindow.tsx` (add TabBar below Navbar)

- [ ] **Step 1: Create TabBar component**

Create `src/components/layout/TabBar.tsx`:

```typescript
import { useNavigate, useLocation } from 'react-router-dom'
import { useTabStore } from '@/store/tab-store'
import { cn } from '@/lib/utils'

export function TabBar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { tabs, activeTabId, setActiveTab, addTab, removeTab } = useTabStore()

  const handleTabClick = (tabId: string, tabType: string) => {
    setActiveTab(tabId)
    navigate(`/${tabType}`)
  }

  const handleAddTab = () => {
    const newId = addTab({
      title: 'New Tab',
      type: 'new-tab',
      closable: true,
    })
    const newTab = useTabStore.getState().tabs.find(t => t.id === newId)
    if (newTab) {
      navigate(`/new-tab`)
    }
  }

  const handleCloseTab = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation()
    removeTab(tabId)
  }

  return (
    <div className="flex items-center h-10 px-gutter bg-surface-container-lowest gap-1 overflow-x-auto no-scrollbar border-t border-outline-variant/30">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId
        return (
          <div
            key={tab.id}
            onClick={() => handleTabClick(tab.id, tab.type)}
            className={cn(
              'flex items-center px-4 h-full text-[11px] font-label-caps font-medium cursor-pointer shrink-0 border-b-2 transition-colors',
              isActive
                ? 'bg-secondary/20 border-secondary text-secondary'
                : 'text-on-surface-variant hover:bg-surface-container-high border-transparent'
            )}
          >
            {tab.title}
            {tab.closable && (
              <span
                onClick={(e) => handleCloseTab(e, tab.id)}
                className="material-symbols-outlined text-[14px] ml-2 hover:text-error"
              >
                close
              </span>
            )}
          </div>
        )
      })}

      {/* Add Tab Button */}
      <div
        onClick={handleAddTab}
        className="flex items-center px-4 h-full text-on-surface-variant hover:bg-surface-container-high cursor-pointer"
      >
        <span className="material-symbols-outlined text-[18px]">add</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Update MainWindow to add TabBar**

Modify `src/components/layout/MainWindow.tsx`:

```typescript
// Add import
import { TabBar } from './TabBar'

// Add TabBar after Navbar in JSX (inside the header div, after Navbar component)
```

Note: TabBar should be inside the header, below Navbar.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/TabBar.tsx src/components/layout/MainWindow.tsx
git commit -m "feat: add TabBar component with add/close functionality"
```

---

## Task 5: Update LeftSideBar with Collapse/Expand

**Files:**
- Modify: `src/components/layout/LeftSideBar.tsx`

- [ ] **Step 1: Update LeftSideBar with collapse logic**

Replace `src/components/layout/LeftSideBar.tsx` content:

```typescript
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
              alt="Ma5zon Logo"
              className="w-8 h-8 shrink-0"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBiZVh33XK4sg0Cf0Pm2N5FrKbpAMT8lNGK97INqjoemoBZsqlzyY7NiAgGS3jiGjEPzRX6s5XJyPyyEixFtC4Vj_hvysR6CBiupoA-ceSylGa8Dy44bMRlPcrGzA1WYFEJT-HR4cXIEJ2PUFTlS2QdTf5AjhxMrOmkibHJVWkrHMx6bzFoXPqCkiP2vlxvuyDbwHrlWKWaYlW8EV3M6ocVQ5ds4g6WyTZnIWhEHMvf2OV0ztC5yFT_0sF1Q4d-rcpdwYtHWMm6Azo"
            />
            <div className="flex flex-col">
              <span className="font-headline-sm text-headline-sm font-bold text-on-surface">
                Ma5zon
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/layout/LeftSideBar.tsx
git commit -m "feat: enhance LeftSideBar with collapse/expand functionality"
```

---

## Task 6: Create Tab Content Components

**Files:**
- Create: `src/components/tabs/DashboardContent.tsx`
- Create: `src/components/tabs/NewTabContent.tsx`
- Create: `src/components/tabs/index.ts`

- [ ] **Step 1: Create DashboardContent component**

Create `src/components/tabs/DashboardContent.tsx`:

```typescript
export function DashboardContent() {
  return (
    <div className="px-margin-edge py-6">
      <nav className="flex text-on-surface-variant text-[11px] font-label-caps uppercase tracking-wider mb-6">
        <a className="hover:text-primary" href="#">Finance</a>
        <span className="mx-2">/</span>
        <span className="text-on-surface font-bold">Executive Overview</span>
      </nav>

      <div className="max-w-[1440px] mx-auto space-y-gutter">
        {/* KPI Cards */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">
          <KpiCard
            label="Gross Revenue (MTD)"
            value="$2,842,910"
            trend="+12.4%"
            trendType="positive"
          />
          <KpiCard
            label="Total Expenses"
            value="$1,120,405"
            trend="+4.2%"
            trendType="negative"
          />
          <KpiCard
            label="Net Profit"
            value="$1,722,505"
            trend="+18.1%"
            trendType="positive"
          />
          <KpiCard
            label="Cash Position"
            value="$4,290,112"
            trend="Stable"
            trendType="neutral"
          />
        </section>

        {/* Charts */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-gutter">
          {/* Cash Flow Trends */}
          <div className="bg-surface-container border border-outline-variant rounded p-cozy-padding min-h-[400px] flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-headline-sm text-on-surface">Cash Flow Trends</h3>
              <button className="text-secondary text-label-caps font-label-caps hover:underline">
                Download Report
              </button>
            </div>
            <div className="flex-1 bg-surface-container-low/50 rounded border border-outline-variant/20 flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 opacity-20 flex items-end">
                <div
                  className="w-full h-1/2 bg-secondary"
                  style={{
                    clipPath: 'polygon(0 80%, 15% 40%, 30% 60%, 45% 20%, 60% 50%, 75% 30%, 90% 45%, 100% 10%, 100% 100%, 0% 100%)',
                  }}
                />
              </div>
              <p className="text-on-surface-variant font-label-caps uppercase tracking-widest z-10">
                Cash In vs. Cash Out
              </p>
            </div>
          </div>

          {/* Revenue by Category */}
          <div className="bg-surface-container border border-outline-variant rounded p-cozy-padding min-h-[400px] flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-headline-sm text-on-surface">Revenue by Category</h3>
              <div className="flex gap-2">
                <span className="w-3 h-3 bg-secondary rounded-full" />
                <span className="w-3 h-3 bg-primary rounded-full" />
              </div>
            </div>
            <div className="flex-1 flex flex-col justify-end gap-4 px-4">
              <div className="flex items-end gap-gutter h-full">
                <Bar height="85%" label="Consulting" />
                <Bar height="60%" />
                <Bar height="45%" />
                <Bar height="75%" />
                <Bar height="95%" />
                <Bar height="30%" />
              </div>
              <div className="border-t border-outline-variant pt-2 flex justify-between text-[9px] font-label-caps text-on-surface-variant uppercase">
                <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

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
    <div className="bg-surface-container p-cozy-padding border border-outline-variant rounded hover:border-secondary/30 transition-all flex flex-col justify-between h-36">
      <div className="flex justify-between items-start">
        <span className="text-label-caps font-label-caps text-on-surface-variant">{label}</span>
        <span className={`text-body-sm font-data-tabular ${trendColors[trendType]}`}>{trend}</span>
      </div>
      <div>
        <p className="text-headline-lg font-headline-lg text-on-surface">{value}</p>
        <p className="text-on-surface-variant text-[12px] font-data-tabular uppercase">USD</p>
      </div>
    </div>
  )
}

function Bar({ height, label }: { height: string; label?: string }) {
  return (
    <div className="flex-1 bg-secondary rounded-t-sm group relative" style={{ height }}>
      {label && (
        <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-label-caps text-on-surface opacity-0 group-hover:opacity-100 transition-opacity">
          {label}
        </span>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create NewTabContent component**

Create `src/components/tabs/NewTabContent.tsx`:

```typescript
import { useNavigate } from 'react-router-dom'
import { useTabStore } from '@/store/tab-store'

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
  const { addTab, setActiveTab } = useTabStore()

  const handleActionClick = (type: string, title: string) => {
    const newId = addTab({
      title,
      type: type as any,
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
        {/* KPI Cards - same as Dashboard */}
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

        {/* Action Buttons that create new tabs */}
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
```

- [ ] **Step 3: Create index.ts**

Create `src/components/tabs/index.ts`:

```typescript
export { DashboardContent } from './DashboardContent'
export { NewTabContent } from './NewTabContent'
```

- [ ] **Step 4: Commit**

```bash
git add src/components/tabs/DashboardContent.tsx src/components/tabs/NewTabContent.tsx src/components/tabs/index.ts
git commit -m "feat: add DashboardContent and NewTabContent components"
```

---

## Task 7: Update MainWindow with Routing

**Files:**
- Modify: `src/main.tsx` (add BrowserRouter)
- Modify: `src/components/layout/MainWindowContent.tsx` (add Routes)

- [ ] **Step 1: Wrap App with BrowserRouter**

Modify `src/main.tsx`:

```typescript
import ReactDOM from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { BrowserRouter } from 'react-router-dom'
import './i18n'
import App from './App'
import { queryClient } from './lib/query-client'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <App />
    </BrowserRouter>
    <ReactQueryDevtools initialIsOpen={false} />
  </QueryClientProvider>
)
```

- [ ] **Step 2: Update MainWindowContent with Routes**

Modify `src/components/layout/MainWindowContent.tsx`:

```typescript
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { useTabStore } from '@/store/tab-store'
import { DashboardContent, NewTabContent } from '@/components/tabs'
import { cn } from '@/lib/utils'

export function MainWindowContent() {
  const navigate = useNavigate()
  const location = useLocation()
  const { tabs, activeTabId, setActiveTab } = useTabStore()

  // Sync URL → active tab on mount/route change
  useEffect(() => {
    const path = location.pathname.replace('/', '') || 'dashboard'
    const matchingTab = tabs.find(t => t.type === path)
    if (matchingTab && matchingTab.id !== activeTabId) {
      setActiveTab(matchingTab.id)
    }
  }, [location.pathname])

  // Sync active tab → URL on change
  useEffect(() => {
    const activeTab = tabs.find(t => t.id === activeTabId)
    if (activeTab && location.pathname !== `/${activeTab.type}`) {
      navigate(`/${activeTab.type}`, { replace: true })
    }
  }, [activeTabId])

  return (
    <div className="flex h-full flex-col bg-background">
      <Routes>
        <Route path="/dashboard" element={<DashboardContent />} />
        <Route path="/new-tab" element={<NewTabContent />} />
        <Route path="/sales-invoice" element={<NewTabContent />} />
        <Route path="/purchase-invoice" element={<NewTabContent />} />
        <Route path="*" element={<DashboardContent />} />
      </Routes>
    </div>
  )
}
```

- [ ] **Step 3: Update MainWindow to use new structure**

Modify `src/components/layout/MainWindow.tsx`:

```typescript
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable'
import { LeftSideBar } from './LeftSideBar'
import { RightSideBar } from './RightSideBar'
import { MainWindowContent } from './MainWindowContent'
import { CommandPalette } from '@/components/command-palette/CommandPalette'
import { PreferencesDialog } from '@/components/preferences/PreferencesDialog'
import { Toaster } from 'sonner'
import { useTheme } from '@/hooks/use-theme'
import { useUIStore } from '@/store/ui-store'
import { useMainWindowEventListeners } from '@/hooks/useMainWindowEventListeners'
import { cn } from '@/lib/utils'
import { Navbar } from './Navbar'
import { TabBar } from './TabBar'

const LAYOUT = {
  leftSidebar: { default: 20, min: 15, max: 40 },
  rightSidebar: { default: 20, min: 15, max: 40 },
  main: { min: 30 },
} as const

const MAIN_CONTENT_DEFAULT =
  100 - LAYOUT.leftSidebar.default - LAYOUT.rightSidebar.default

export function MainWindow() {
  const { theme } = useTheme()
  const leftSidebarVisible = useUIStore(state => state.leftSidebarVisible)
  const rightSidebarVisible = useUIStore(state => state.rightSidebarVisible)

  useMainWindowEventListeners()

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden rounded-[var(--app-corner-radius)] bg-background">
      <header className="flex flex-col shrink-0 z-40">
        <Navbar />
        <TabBar />
      </header>

      <div className="flex flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel
            defaultSize={LAYOUT.leftSidebar.default}
            minSize={LAYOUT.leftSidebar.min}
            maxSize={LAYOUT.leftSidebar.max}
            className={cn(!leftSidebarVisible && 'hidden')}
          >
            <LeftSideBar />
          </ResizablePanel>

          <ResizableHandle className={cn(!leftSidebarVisible && 'hidden')} />

          <ResizablePanel defaultSize={MAIN_CONTENT_DEFAULT} minSize={LAYOUT.main.min}>
            <MainWindowContent />
          </ResizablePanel>

          <ResizableHandle className={cn(!rightSidebarVisible && 'hidden')} />

          <ResizablePanel
            defaultSize={LAYOUT.rightSidebar.default}
            minSize={LAYOUT.rightSidebar.min}
            maxSize={LAYOUT.rightSidebar.max}
            className={cn(!rightSidebarVisible && 'hidden')}
          >
            <RightSideBar />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      <CommandPalette />
      <PreferencesDialog />
      <Toaster
        position="bottom-right"
        theme={theme === 'dark' ? 'dark' : theme === 'light' ? 'light' : 'system'}
        className="toaster group"
        toastOptions={{
          classNames: {
            toast: 'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
            description: 'group-[.toast]:text-muted-foreground',
            actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
            cancelButton: 'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
          },
        }}
      />
    </div>
  )
}
```

- [ ] **Step 4: Remove TitleBar import and component from MainWindow**

The Navbar replaces TitleBar, so we don't need it in MainWindow anymore.

- [ ] **Step 5: Commit**

```bash
git add src/main.tsx src/components/layout/MainWindow.tsx src/components/layout/MainWindowContent.tsx
git commit -m "feat: integrate routing with tab system"
```

---

## Task 8: Verify and Run Tests

**Files:**
- Run: `pnpm typecheck && pnpm test:run && pnpm lint`

- [ ] **Step 1: Run typecheck**

Run: `cd /mnt/C/Ma5zon-SaaS && pnpm typecheck`

Expected: No TypeScript errors

- [ ] **Step 2: Run all tests**

Run: `cd /mnt/C/Ma5zon-SaaS && pnpm test:run`

Expected: All tests pass

- [ ] **Step 3: Run lint**

Run: `cd /mnt/C/Ma5zon-SaaS && pnpm lint`

Expected: No lint errors (or only pre-existing warnings)

- [ ] **Step 4: Run check:all**

Run: `cd /mnt/C/Ma5zon-SaaS && pnpm check:all`

Expected: All checks pass

- [ ] **Step 5: Final commit if needed**

If any fixes were made, commit them.

---

## Task 9: Create Implementation Summary

**Files:**
- Create: `docs/superpowers/plans/2026-05-24-tabbed-shell-implementation.md` (this file)

---

## Implementation Order

1. **Task 1**: Install react-router-dom
2. **Task 2**: Create Tab Store
3. **Task 3**: Create Navbar Component
4. **Task 4**: Create TabBar Component
5. **Task 5**: Update LeftSideBar with Collapse/Expand
6. **Task 6**: Create Tab Content Components
7. **Task 7**: Update MainWindow with Routing
8. **Task 8**: Verify and Run Tests
9. **Task 9**: Create Implementation Summary

---

## Notes

- The sidebar collapse state is local to LeftSideBar component (not in global store)
- Dashboard tab is always enforced at index 0 with closable: false
- Browser back/forward works via React Router URL synchronization
- Action buttons in NewTabContent create new tabs but all route to same content for now (future iteration will have specific content)