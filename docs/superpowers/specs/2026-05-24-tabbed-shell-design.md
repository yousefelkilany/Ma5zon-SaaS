# Tabbed Shell with Collapsible Sidebar - Design Spec

**Date:** 2026-05-24
**Status:** Approved for Implementation

---

## 1. Overview

Implement a tabbed shell layout where:

- **Navbar** (top) contains logo, search bar, quick add button, profile
- **Tab bar** (below navbar) contains open tabs + plus icon for new tabs
- **Collapsible sidebar** (left) contains navigation categories with icons + text
- **Content area** (right) renders based on active tab's type
- **Dashboard** is a permanent, non-closable first tab
- Browser back/forward navigation works across tabs

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────┐
│ NAVBAR: Logo | Search Bar | Quick Add | Profile        │
├─────────────────────────────────────────────────────────┤
│ TAB BAR: [Dashboard] [Tab 2] [Tab 3] [+]               │
├──────────┬────────────────────────────────────────────┤
│          │                                            │
│ SIDEBAR  │           CONTENT AREA                      │
│ (collaps)│     (renders based on activeTab.type)      │
│          │                                            │
└──────────┴────────────────────────────────────────────┘
```

### Data Flow

```
User clicks tab → navigate(path) → React Router updates URL →
useEffect detects URL change → setActiveTab(tabId) →
ContentArea renders new tab content
```

---

## 3. Tab System

### 3.1 Tab Data Model

```typescript
interface Tab {
  id: string
  title: string
  type: 'dashboard' | 'new-tab' | 'sales-invoice' | 'purchase-invoice'
  closable: boolean
}
```

### 3.2 Zustand Store (`tab-store.ts`)

```typescript
interface TabState {
  tabs: Tab[]
  activeTabId: string

  // Actions
  addTab: (tab: Omit<Tab, 'id'>) => string // returns new tab id
  removeTab: (tabId: string) => void
  setActiveTab: (tabId: string) => void
  getActiveTab: () => Tab | undefined

  // Internal enforcement
  _enforceDashboardInvariant: () => void
}
```

**Invariant Rules:**

1. On initialization: Dashboard tab must exist at index 0
2. On every `addTab`/`removeTab`: Dashboard must remain at index 0, be non-closable
3. Closing active tab: activate adjacent tab or Dashboard

### 3.3 React Router Integration

- Route pattern: `/:tabType` (e.g., `/dashboard`, `/sales-invoice`)
- Tab types map to routes: `dashboard` → `/dashboard`, `new-tab` → `/new-tab`
- On tab switch: `navigate(`/${tab.type}`)`
- On browser back: React Router updates URL → effect sets active tab
- On app load: read `useParams()` → match to existing tab or create fallback

---

## 4. Components

### 4.1 Navbar (`Navbar.tsx`)

- **Left:** Ma5zon logo (image) + company name
- **Center:** Global search input with search icon
- **Right:** Quick Add button (green), notifications icon, settings icon, user profile (avatar + name + role)

**Styling:** Uses existing `--color-surface-container-low` background, border-bottom with `--color-outline-variant`

### 4.2 TabBar (`TabBar.tsx`)

- Horizontal scrollable list of tabs
- Each tab shows: title text + close icon (except dashboard)
- Active tab has bottom border (`--color-secondary`) and text color `--color-secondary`
- Plus icon button at end creates new `new-tab` tab
- Tab close: removes tab, switches to adjacent or dashboard

**Styling:** `--color-surface-container-lowest` background, `--color-outline-variant/30` top border

### 4.3 Sidebar (`LeftSideBar.tsx` - existing, enhanced)

- **Header:** Logo + "Ma5zon" text + collapse/expand toggle button
- **Categories:** Sales, Purchases, Inventory, Finance, System
- Each category has label + list of nav items (icon + text)
- Active nav item has `--color-secondary` background and text
- **Collapsed state:** Shows only icons, hides text and category labels
- Transition: 300ms width animation

**Styling:** `--color-surface-container` background, `--color-outline-variant` right border

### 4.4 ContentArea (`ContentArea.tsx`)

- Renders content based on `activeTab.type`
- Uses switch/case or route-based rendering
- Placeholder shown for types without content yet

### 4.5 Dashboard Content (`DashboardContent.tsx`)

Placeholder data for MVP:

**KPI Cards (4-column grid):**

1. Gross Revenue (MTD): $2,842,910 (+12.4%)
2. Total Expenses: $1,120,405 (+4.2%)
3. Net Profit: $1,722,505 (+18.1%)
4. Cash Position: $4,290,112 (Stable)

**Charts (2-column grid):**

1. Cash Flow Trends - area chart placeholder with gradient fill
2. Revenue by Category - bar chart placeholder with 6 bars

**Styling:** Card uses `--color-surface-container` background, `--color-outline-variant` border, hover border `--color-secondary/30`

### 4.6 New Tab Content (`NewTabContent.tsx`)

Action hub with categorized buttons:

**Sales Workflow:**

- Create New Invoice
- Convert Draft Quotes (badge: 12)
- Recurring Billings

**Purchase Order:**

- Process Batch Bills
- Approve POs (badge: 04)
- Vendor Management

**Inventory Control:**

- Stock Reconciliation
- Price Adjustment Log
- Replenishment Audit

**Treasury Ops:**

- Reconcile Bank Feed (badge: 114)
- Inter-Account Transfer
- Forex Exposure Report

**Footer stats:** Awaiting/Overdue counts, Open/Upcoming counts, etc.

**Click behavior:** Each button creates new tab with specific type and navigates to it.

---

## 5. State Management

### 5.1 New Store File

Create `src/store/tab-store.ts`:

```typescript
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid' // or nanoid

const DEFAULT_DASHBOARD_TAB = {
  id: 'dashboard',
  title: 'Dashboard',
  type: 'dashboard' as const,
  closable: false,
}

interface TabState {
  tabs: Tab[]
  activeTabId: string

  addTab: (tab: Omit<Tab, 'id'>) => string
  removeTab: (tabId: string) => void
  setActiveTab: (tabId: string) => void
  getActiveTab: () => Tab | undefined
  _enforceDashboardInvariant: () => void
}

export const useTabStore = create<TabState>()(
  devtools(
    (set, get) => ({
      tabs: [DEFAULT_DASHBOARD_TAB],
      activeTabId: 'dashboard',

      addTab: tabData => {
        const newTab: Tab = {
          ...tabData,
          id: uuidv4(),
        }
        set(state => ({
          tabs: [...state.tabs, newTab],
          activeTabId: newTab.id,
        }))
        return newTab.id
      },

      removeTab: tabId => {
        const { tabs, activeTabId } = get()
        const tab = tabs.find(t => t.id === tabId)
        if (!tab || !tab.closable) return

        const newTabs = tabs.filter(t => t.id !== tabId)
        let newActiveId = activeTabId

        if (activeTabId === tabId) {
          const closedIndex = tabs.findIndex(t => t.id === tabId)
          const newIndex = Math.min(closedIndex, newTabs.length - 1)
          newActiveId = newTabs[newIndex]?.id || ''
        }

        set({ tabs: newTabs, activeTabId: newActiveId })
      },

      setActiveTab: tabId => {
        set({ activeTabId: tabId })
      },

      getActiveTab: () => {
        const { tabs, activeTabId } = get()
        return tabs.find(t => t.id === activeTabId)
      },

      _enforceDashboardInvariant: () => {
        const { tabs } = get()
        const hasDashboard = tabs.some(t => t.type === 'dashboard')

        if (!hasDashboard) {
          set(state => ({
            tabs: [DEFAULT_DASHBOARD_TAB, ...state.tabs],
            activeTabId:
              state.activeTabId === '' ? 'dashboard' : state.activeTabId,
          }))
        } else {
          // Ensure dashboard is at index 0
          const dashboardTab = tabs.find(t => t.type === 'dashboard')
          const otherTabs = tabs.filter(t => t.type !== 'dashboard')
          const reordered = [dashboardTab!, ...otherTabs]
          set({ tabs: reordered })
        }
      },
    }),
    { name: 'tab-store' }
  )
)
```

---

## 6. Routing Setup

### 6.1 Install react-router-dom

```bash
cd frontend && pnpm add react-router-dom
```

### 6.2 Wrap App with Router

In `main.tsx` or `App.tsx`:

```tsx
import { BrowserRouter } from 'react-router-dom'

function App() {
  return (
    <BrowserRouter>
      <MainWindow />
    </BrowserRouter>
  )
}
```

### 6.3 Routes in MainWindowContent

```tsx
import { Routes, Route, useParams, useNavigate } from 'react-router-dom'

function MainWindowContent() {
  const { tabType } = useParams()
  const navigate = useNavigate()
  const { tabs, activeTabId, setActiveTab } = useTabStore()

  // Sync URL → active tab on mount/route change
  useEffect(() => {
    if (tabType) {
      const matchingTab = tabs.find(t => t.type === tabType)
      if (matchingTab) {
        setActiveTab(matchingTab.id)
      }
    }
  }, [tabType])

  // Sync active tab → URL on change
  useEffect(() => {
    const activeTab = tabs.find(t => t.id === activeTabId)
    if (activeTab && location.pathname !== `/${activeTab.type}`) {
      navigate(`/${activeTab.type}`, { replace: true })
    }
  }, [activeTabId])

  return (
    <Routes>
      <Route path="/dashboard" element={<DashboardContent />} />
      <Route path="/new-tab" element={<NewTabContent />} />
      <Route path="/sales-invoice" element={<SalesInvoiceContent />} />
      {/* fallback routes */}
      <Route path="*" element={<DashboardContent />} />
    </Routes>
  )
}
```

---

## 7. File Structure

```
src/
├── store/
│   ├── ui-store.ts        (existing)
│   └── tab-store.ts       (new)
├── components/
│   ├── layout/
│   │   ├── MainWindow.tsx       (existing - minimal changes)
│   │   ├── MainWindowContent.tsx (enhanced - routing)
│   │   ├── LeftSideBar.tsx      (existing - add collapse logic)
│   │   ├── Navbar.tsx           (new)
│   │   └── TabBar.tsx           (new)
│   └── tabs/
│       ├── DashboardContent.tsx    (new - placeholder charts)
│       ├── NewTabContent.tsx        (new - action hub)
│       └── index.ts
```

---

## 8. MVP Scope (This Iteration)

For this iteration, implement:

1. Tab store with dashboard invariant
2. Navbar component
3. TabBar with add/close functionality
4. Sidebar collapse/expand
5. Dashboard content with placeholder charts
6. New Tab content with action buttons
7. Browser history navigation (back/forward)

**Excluded for now:**

- Actual navigation to other tab types (sales invoice, etc.) - only dashboard and new-tab
- Clicking action buttons creates tab but content is same placeholder until future iteration

---

## 9. Acceptance Criteria

1. App loads with Dashboard tab always at position 0
2. Clicking "+" creates new "New Tab" tab and navigates to it
3. Closing non-dashboard tab switches to adjacent tab or Dashboard
4. Dashboard tab cannot be closed
5. Browser back button navigates to previous tab
6. Sidebar collapses to icons only when toggle clicked
7. New Tab shows categorized action buttons
8. KPI cards show placeholder data (revenue, expenses, etc.)
9. Dashboard shows chart placeholders
