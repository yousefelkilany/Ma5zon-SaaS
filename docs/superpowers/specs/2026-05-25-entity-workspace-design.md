# Entity Workspace Design Specification

## 1. Overview

Entity workspaces are the default screen displayed when a user clicks a sidebar entity link (e.g., Customers, Vendors, Invoices). Each entity has its own workspace containing a header, toolbar, data table, and pagination footer. The workspace renders its header immediately but displays skeleton loading states for toolbar, content, and footer until data arrives.

## 2. Routing Architecture

### URL Structure
- `/dashboard` - Dashboard page (standalone, no entity context)
- `/entity/:entityType` - Entity workspace (e.g., `/entity/customers`, `/entity/vendors`)
- Future deep link: `/entity/:entityType/:id` - Specific entity record modal tab

### Route Definitions (MainWindowContent.tsx)
```
/dashboard          → DashboardContent
/entity/:entityType → EntityWorkspace
```

## 3. Tab Store Enhancement

### Updated Interfaces

```typescript
// src/lib/utils.ts
type TabType = 'dashboard' | 'new-tab' | 'sales-invoice' | 'purchase-invoice' | 'entity'

interface Tab {
  id: string
  title: string       // Display name: "Customers", "Vendors", etc.
  type: TabType
  closable: boolean
  entityType?: string // "customers", "vendors", "invoices" - for URL and tab lookup
}
```

### Tab Behavior
- **Dashboard tab**: Not closable, always present as first tab
- **Entity tabs**: Closable, created on demand when clicking sidebar entity links
- **Tab lookup**: When clicking sidebar, check if entity tab already exists → activate it, otherwise create new tab

## 4. Sidebar Navigation Enhancement

### Current Behavior
Sidebar items use plain `<a href="#">` links causing full page reloads.

### New Behavior
Sidebar items use click handlers that:
1. Check tab store for existing entity tab (by `entityType`)
2. If found → activate that tab (set activeTabId)
3. If not found → create new closable tab with entity info, then activate
4. Navigate to `/entity/:entityType`

### Implementation Pattern
```typescript
// SideBar.tsx - NavItem receives onClick handler
<NavItem
  icon="groups"
  label="Customers"
  onClick={() => handleEntityClick('customers', 'Customers')}
/>
```

### Sidebar Sections (unchanged)
- Sales: Invoices, Customers
- Purchases: Bills, Vendors
- Inventory: Stock, Warehouses
- System: Reports, Settings

Note: "Dashboard" is the default first tab, not part of sidebar entity navigation.

## 5. Entity Workspace Component

### Layout Structure
```
┌─────────────────────────────────────────────────────────────┐
│ HEADER (immediate render)                                   │
│ [PARTNERS >] Customers                          [+ ADD NEW] │
├─────────────────────────────────────────────────────────────┤
│ TOOLBAR (skeleton)                                          │
│ [Search...] [STATUS ▼] [CATEGORY ▼]       [Export] [Print]  │
├─────────────────────────────────────────────────────────────┤
│ CONTENT AREA (skeleton - full height, horizontal fill)      │
│                                                             │
│ ████ ████ ████ ████ ████ ████ ████ ████ ████ ████          │
│ ████ ████ ████ ████ ████ ████ ████ ████ ████ ████          │
│ ████ ████ ████ ████ ████ ████ ████ ████ ████ ████          │
│ ████ ████ ████ ████ ████ ████ ████ ████ ████ ████          │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ FOOTER (skeleton)                                           │
│ [50 per page] [Showing 1-50 of X]      [< 1 / 26 >]         │
└─────────────────────────────────────────────────────────────┘
```

### Skeleton Design
- **Toolbar skeleton**: Mimics the toolbar layout - search input, select dropdowns, action buttons
- **Content skeleton**: Full height (flex-1), fills horizontally. Shows 8-10 rows of skeleton cells matching the future table column structure
- **Footer skeleton**: Mimics pagination layout - rows per page selector, showing count, pagination controls

### Skeleton Implementation
Use existing `Skeleton` component from `@/components/ui/skeleton`. Structure skeleton rows to match future table columns (8 columns based on reference design).

## 6. Breadcrumb Behavior

### Dashboard Breadcrumb
```
DASHBOARD / Executive Overview
```

### Entity Workspace Breadcrumb
```
PARTNERS / Customers
```
(Does NOT include Dashboard - entities have their own navigation context)

Note: "PARTNERS" section name is derived from sidebar section grouping (Sales entities under PARTNERS, etc.). This is TBD based on final sidebar section labels.

## 7. Entity Type Mapping

Sidebar links map to entity types:
- Invoices → `invoices`
- Customers → `customers`
- Bills → `bills`
- Vendors → `vendors`
- Stock → `stock`
- Warehouses → `warehouses`
- Reports → `reports`
- Settings → `settings`

Each entityType generates a URL `/entity/:entityType`.

## 8. Implementation Order

1. **Phase 1: Tab Store Enhancement**
   - Extend TabType to include 'entity'
   - Add entityType field to Tab interface
   - Update tab store addTab to accept entityType

2. **Phase 2: Entity Workspace Component**
   - Create `src/components/entity/EntityWorkspace.tsx`
   - Implement skeleton layout matching reference design
   - Header with breadcrumb and title renders immediately
   - Toolbar, content, footer show skeletons until data arrives

3. **Phase 3: Route Integration**
   - Add `/entity/:entityType` route in MainWindowContent.tsx
   - Create EntityWorkspace route component

4. **Phase 4: Sidebar Navigation**
   - Update SideBar.tsx to use click handlers instead of href
   - Add handleEntityClick function for tab creation/activation
   - Connect sidebar sections to entity types

## 9. Files to Create/Modify

### New Files
- `src/components/entity/EntityWorkspace.tsx` - Entity workspace with skeleton
- `src/hooks/use-entity-tabs.ts` - Hook for entity tab management (optional, can be inline)

### Modified Files
- `src/lib/utils.ts` - Extend TabType, Tab interface
- `src/store/tab-store.ts` - Update addTab to handle entity tabs
- `src/components/layout/SideBar.tsx` - Click handlers for entity navigation
- `src/components/layout/MainWindowContent.tsx` - Add entity route

## 10. Design Reference

Reference: `stitch-screens/entity-workspace.html`

The skeleton should visually mirror the final data table structure - the skeleton IS the preview of the table layout before data arrives.

- Header height: ~60px
- Toolbar height: ~52px
- Footer height: 48px
- Content: fills remaining vertical space, horizontal full width