# Entity Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement entity workspace as default screen when clicking sidebar entity links. Each entity has a workspace with header (immediate render), toolbar/content/footer (skeleton until data arrives).

**Architecture:** Hybrid approach - URL is source of truth for deep linking (e.g., `/entity/customers`), tab store caches entity tabs for fast switching. Clicking sidebar entity link checks if tab exists → activates or creates new tab.

**Tech Stack:** React Router, Zustand tab store, existing Skeleton component, Tailwind CSS

---

## File Structure

**New Files:**

- `src/components/entity/EntityWorkspace.tsx` - Entity workspace with skeleton layout

**Modified Files:**

- `src/lib/utils.ts` - Extend TabType to include 'entity', add entityType to Tab interface
- `src/store/tab-store.ts` - Add getTabByEntityType helper, update addTab to handle entityType
- `src/components/layout/MainWindowContent.tsx` - Add `/entity/:entityType` route
- `src/components/layout/SideBar.tsx` - Add onClick handlers for entity navigation

---

## Task 1: Extend Tab Type and Interface

**Files:**

- Modify: `src/lib/utils.ts`

- [ ] **Step 1: Update TabType and Tab interface**

```typescript
// src/lib/utils.ts (lines 8-15)
export type TabType =
  | 'dashboard'
  | 'new-tab'
  | 'sales-invoice'
  | 'purchase-invoice'
  | 'entity'

export interface Tab {
  id: string
  title: string
  type: TabType
  closable: boolean
  entityType?: string // "customers", "vendors", etc.
}
```

- [ ] **Step 2: Run lint to verify no issues**

Run: `pnpm run lint`
Expected: No errors related to our changes

- [ ] **Step 3: Commit**

```bash
git add src/lib/utils.ts
git commit -m "feat: extend TabType to include 'entity' and add entityType field"
```

---

## Task 2: Add getTabByEntityType Helper to Tab Store

**Files:**

- Modify: `src/store/tab-store.ts`

- [ ] **Step 1: Add getTabByEntityType method to TabState interface (line 16-25)**

Add after `getTabByType`:

```typescript
getTabByEntityType: (entityType: string) => Tab | undefined
```

- [ ] **Step 2: Implement getTabByEntityType method (after getTabByType, around line 77)**

```typescript
getTabByEntityType: (entityType) => {
  const { tabs } = get()
  return tabs.find(t => t.entityType === entityType)
},
```

- [ ] **Step 3: Run lint to verify no issues**

Run: `pnpm run lint`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/store/tab-store.ts
git commit -m "feat: add getTabByEntityType helper to tab store"
```

---

## Task 3: Create EntityWorkspace Component with Skeleton

**Files:**

- Create: `src/components/entity/EntityWorkspace.tsx`
- Test: Visual verification in browser after integration

- [ ] **Step 1: Create EntityWorkspace.tsx**

```tsx
import { useParams } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

interface EntityWorkspaceProps {
  entityType: string
}

function EntityHeader({ entityType }: { entityType: string }) {
  // Map entity type to display name and section
  const entityNames: Record<string, { label: string; section: string }> = {
    invoices: { label: 'Invoices', section: 'SALES' },
    customers: { label: 'Customers', section: 'PARTNERS' },
    bills: { label: 'Bills', section: 'PURCHASES' },
    vendors: { label: 'Vendors', section: 'PARTNERS' },
    stock: { label: 'Stock', section: 'INVENTORY' },
    warehouses: { label: 'Warehouses', section: 'INVENTORY' },
    reports: { label: 'Reports', section: 'SYSTEM' },
    settings: { label: 'Settings', section: 'SYSTEM' },
  }

  const { label, section } = entityNames[entityType] || {
    label: entityType,
    section: '',
  }

  return (
    <header className="flex flex-col gap-2 px-6 pt-6 pb-4 bg-surface shadow-sm shrink-0">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <nav className="flex items-center space-x-2 text-on-surface-variant mb-1">
            <span className="font-label-caps text-label-caps">{section}</span>
            <span className="material-symbols-outlined text-sm">
              chevron_right
            </span>
            <span className="font-label-caps text-label-caps text-on-surface">
              {label}
            </span>
          </nav>
          <h1 className="font-headline-md text-headline-md text-on-surface">
            {label}
          </h1>
        </div>
        <button className="bg-secondary text-on-secondary px-4 py-2 rounded shadow-sm hover:opacity-90 active:scale-95 transition-all font-label-caps text-label-caps flex items-center gap-2">
          <span className="material-symbols-outlined">add</span>
          ADD NEW {label.toUpperCase().replace('S', '')}
        </button>
      </div>
    </header>
  )
}

function ToolbarSkeleton() {
  return (
    <section className="px-6 py-3 border-y border-outline-variant bg-surface-container-low flex items-center justify-between shrink-0">
      <div className="flex items-center gap-4 flex-1">
        <Skeleton className="h-8 w-full max-w-sm rounded" />
        <Skeleton className="h-8 w-24 rounded" />
        <Skeleton className="h-8 w-24 rounded" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-8 rounded" />
        <Skeleton className="h-8 w-8 rounded" />
      </div>
    </section>
  )
}

function ContentSkeleton() {
  // 8 columns matching future data table
  const columns = [
    'checkbox',
    'entity',
    'doc',
    'date',
    'status',
    'qty',
    'price',
    'total',
    'actions',
  ]

  return (
    <main className="flex-1 overflow-auto custom-scrollbar bg-surface-container-lowest">
      <table className="w-full text-left border-collapse">
        <thead className="sticky top-0 bg-surface-container-high z-10 border-b border-outline">
          <tr className="font-label-caps text-label-caps text-on-surface-variant">
            {columns.map(col => (
              <th
                key={col}
                className="px-3 py-3 font-medium border-r border-outline-variant"
              >
                {col.toUpperCase()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="font-body-sm text-body-sm">
          {Array.from({ length: 8 }).map((_, rowIndex) => (
            <tr key={rowIndex} className="border-b border-outline-variant/30">
              {columns.map(col => (
                <td key={col} className="px-3 py-2">
                  <Skeleton className="h-5 w-full" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  )
}

function FooterSkeleton() {
  return (
    <footer className="h-12 bg-surface-container-low border-t border-outline-variant px-6 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-6 w-12" />
        </div>
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="flex items-center gap-1">
        <Skeleton className="h-6 w-6 rounded" />
        <Skeleton className="h-6 w-6 rounded" />
        <Skeleton className="h-6 w-12 mx-2" />
        <Skeleton className="h-6 w-6 rounded" />
        <Skeleton className="h-6 w-6 rounded" />
      </div>
    </footer>
  )
}

export function EntityWorkspace({ entityType }: EntityWorkspaceProps) {
  return (
    <div className="flex flex-col h-full bg-background">
      <EntityHeader entityType={entityType} />
      <ToolbarSkeleton />
      <ContentSkeleton />
      <FooterSkeleton />
    </div>
  )
}
```

- [ ] **Step 2: Create index file for entity components**

Create: `src/components/entity/index.ts`

```typescript
export { EntityWorkspace } from './EntityWorkspace'
```

- [ ] **Step 3: Run lint to verify no issues**

Run: `pnpm run lint`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/components/entity/EntityWorkspace.tsx src/components/entity/index.ts
git commit -m "feat: add EntityWorkspace component with skeleton layout"
```

---

## Task 4: Add Entity Route to MainWindowContent

**Files:**

- Modify: `src/components/layout/MainWindowContent.tsx`

- [ ] **Step 1: Import EntityWorkspace**

Add import (around line 5):

```typescript
import { EntityWorkspace } from '@/components/entity'
```

- [ ] **Step 2: Add entity route (after sales-invoice route, around line 36)**

Add route:

```typescript
<Route path="/entity/:entityType" element={<EntityWorkspace />} />
```

- [ ] **Step 3: Run lint to verify no issues**

Run: `pnpm run lint`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/MainWindowContent.tsx
git commit -m "feat: add entity route to MainWindowContent"
```

---

## Task 5: Update SideBar with Entity Navigation Handler

**Files:**

- Modify: `src/components/layout/SideBar.tsx`

- [ ] **Step 1: Add imports for navigation and tab store**

Add after existing imports (line 1-4):

```typescript
import { useNavigate } from 'react-router-dom'
import { useTabStore } from '@/store/tab-store'
```

- [ ] **Step 2: Add navigate and tab store to SideBar component (around line 108)**

Add inside SideBar function:

```typescript
const navigate = useNavigate()
const { addTab, tabs, activeTabId, setActiveTab } = useTabStore()
```

- [ ] **Step 3: Add handleEntityClick function (after useTabStore call)**

```typescript
const handleEntityClick = (entityType: string, title: string) => {
  // Check if entity tab already exists
  const existingTab = tabs.find(t => t.entityType === entityType)

  if (existingTab) {
    // Activate existing tab
    setActiveTab(existingTab.id)
  } else {
    // Create new closable tab
    const newTabId = addTab({
      title,
      type: 'entity',
      closable: true,
      entityType,
    })
    // Tab store already sets activeTabId in addTab, but ensure sync
    setActiveTab(newTabId)
  }

  // Navigate to entity URL
  navigate(`/entity/${entityType}`)
}
```

- [ ] **Step 4: Update NavItemProps to include onClick (line 10-16)**

Change interface:

```typescript
interface NavItemProps {
  icon: string
  label: string
  href?: string
  active?: boolean
  collapsed: boolean
  onClick?: () => void
}
```

- [ ] **Step 5: Update NavItem function signature (line 18-24)**

Change to:

```typescript
function NavItem({
  icon,
  label,
  href = '#',
  active = false,
  collapsed,
  onClick,
}: NavItemProps) {
```

- [ ] **Step 6: Update NavItem to use onClick instead of href (line 25-49)**

Change `<a>` to:

```typescript
<a
  className={cn(
    'flex items-center gap-compact-gap pe-4 ps-1 py-2 rounded transition-all duration-300',
    active
      ? 'text-secondary bg-surface-container-high'
      : 'text-on-surface-variant hover:bg-surface-container-high'
  )}
  href={href}
  onClick={onClick}
>
```

- [ ] **Step 7: Update NavItemsList to pass onClick (line 100-101)**

Change to:

```typescript
<NavItem key={item.label} {...item} collapsed={collapsed} onClick={item.onClick} />
```

- [ ] **Step 8: Update NAV_SECTIONS items to include onClick handlers and entityType mapping (line 111-147)**

Replace the useMemo with mapped sections that include onClick. Note: We need to build items with onClick and entityType, so the structure changes. The simplest approach is to add onClick to items and compute entityType from label:

```typescript
const NAV_SECTIONS = useMemo(
  () =>
    [
      {
        title: t('sidebar.nav.sales'),
        items: [
          {
            icon: 'receipt',
            label: t('sidebar.nav.invoices'),
            entityType: 'invoices',
            onClick: () =>
              handleEntityClick('invoices', t('sidebar.nav.invoices')),
          },
          {
            icon: 'groups',
            label: t('sidebar.nav.customers'),
            entityType: 'customers',
            onClick: () =>
              handleEntityClick('customers', t('sidebar.nav.customers')),
          },
        ],
      },
      {
        title: t('sidebar.nav.purchases'),
        items: [
          {
            icon: 'shopping_cart',
            label: t('sidebar.nav.bills'),
            entityType: 'bills',
            onClick: () => handleEntityClick('bills', t('sidebar.nav.bills')),
          },
          {
            icon: 'store',
            label: t('sidebar.nav.vendors'),
            entityType: 'vendors',
            onClick: () =>
              handleEntityClick('vendors', t('sidebar.nav.vendors')),
          },
        ],
      },
      {
        title: t('sidebar.nav.inventory'),
        items: [
          {
            icon: 'inventory_2',
            label: t('sidebar.nav.stock'),
            entityType: 'stock',
            onClick: () => handleEntityClick('stock', t('sidebar.nav.stock')),
          },
          {
            icon: 'warehouse',
            label: t('sidebar.nav.warehouses'),
            entityType: 'warehouses',
            onClick: () =>
              handleEntityClick('warehouses', t('sidebar.nav.warehouses')),
          },
        ],
      },
      {
        title: t('sidebar.nav.system'),
        items: [
          {
            icon: 'bar_chart',
            label: t('sidebar.nav.reports'),
            entityType: 'reports',
            onClick: () =>
              handleEntityClick('reports', t('sidebar.nav.reports')),
          },
          {
            icon: 'settings',
            label: t('sidebar.nav.settings'),
            entityType: 'settings',
            onClick: () =>
              handleEntityClick('settings', t('sidebar.nav.settings')),
          },
        ],
      },
    ] as const,
  [t, handleEntityClick]
)
```

- [ ] **Step 9: Run lint to verify no issues**

Run: `pnpm run lint`
Expected: No errors

- [ ] **Step 10: Commit**

```bash
git add src/components/layout/SideBar.tsx
git commit -m "feat: update SideBar with entity navigation handlers"
```

---

## Task 6: Verify Integration

**Files:**

- Modify: `src/components/layout/MainWindowContent.tsx` (update sync logic for entity routes)

- [ ] **Step 1: Update URL sync logic to handle entity routes**

The current sync logic in MainWindowContent uses `activeTab.type` for URL mapping. For entity tabs, we need to use `entityType` instead. Update the useEffect around lines 14-28:

```typescript
useEffect(() => {
  if (isNavigatingRef.current) return

  const activeTab = tabs.find(t => t.id === activeTabId)

  // Active tab changed → update URL to match
  if (activeTab) {
    let targetPath = ''
    if (activeTab.type === 'entity' && activeTab.entityType) {
      targetPath = `/entity/${activeTab.entityType}`
    } else {
      targetPath = `/${activeTab.type}`
    }

    if (location.pathname !== targetPath) {
      isNavigatingRef.current = true
      try {
        flushSync(() => navigate(targetPath, { replace: true }))
      } finally {
        isNavigatingRef.current = false
      }
    }
  }
}, [location.pathname, activeTabId, tabs, navigate])
```

- [ ] **Step 2: Run lint to verify no issues**

Run: `pnpm run lint`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/MainWindowContent.tsx
git commit -m "feat: update URL sync logic for entity routes"
```

---

## Verification

After all tasks complete:

1. **Run dev server**: `pnpm run dev` in frontend directory
2. **Test sidebar clicks**: Click "Customers" in sidebar → should open new "Customers" tab with skeleton workspace
3. **Test tab switching**: Click "Customers" again → should activate existing tab (not create duplicate)
4. **Test URL**: Navigate to `/entity/customers` → should show Customers workspace
5. **Test skeleton**: Verify toolbar, content, footer show skeleton loading, header renders immediately with correct title

---

## Summary

| Task | Description                                         |
| ---- | --------------------------------------------------- |
| 1    | Extend TabType and Tab interface for entity support |
| 2    | Add getTabByEntityType helper to tab store          |
| 3    | Create EntityWorkspace component with skeleton      |
| 4    | Add entity route to MainWindowContent               |
| 5    | Update SideBar with entity navigation handlers      |
| 6    | Update URL sync logic for entity routes             |

**Plan complete and saved to `docs/superpowers/plans/2026-05-25-entity-workspace-implementation.md`.**
