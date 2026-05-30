# Entity Data Table Design Specification

## 1. Overview

The Entity Data Table replaces the skeleton placeholder UI in `EntityWorkspace` with a production-ready, database-connected table component. Each entity type (invoices, customers, bills, vendors, stock, etc.) has its own column configuration, user preferences, and data. The component uses tanstack-table as the core table engine with all heavy operations (sorting, filtering, pagination) handled server-side via Tauri commands.

## 2. Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                             │
│  ┌─────────────────┐    ┌─────────────────┐    ┌────────────────┐   │
│  │ EntityWorkspace │    │  TanStack Query │    │   DataTable    │   │
│  │                 │───▶│  Manages fetch  │───▶│  Pure Display  │   │
│  │                 │    │    + Caching    │    │                │   │
│  └─────────────────┘    └─────────────────┘    └────────────────┘   │
│         │                       │                       │           │
│         │              ┌────────┴────────┐              │           │
│         │              │ Column Prefs    │              │           │
│         │              │ (localStorage)  │              │           │
│         │              └─────────────────┘              │           │
└─────────┼───────────────────────┼───────────────────────┼───────────┘
          │                       │                       │
          ▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    BRIDGE (tauri-specta)                            │
│          Type-safe commands auto-generated from Rust                │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    BACKEND (Rust + SQLite)                          │
│           Commands handle all data operations                       │
└─────────────────────────────────────────────────────────────────────┘
```

## 3. Component Architecture

```
EntityWorkspace
├── EntityHeader (existing - breadcrumb + title + Add New button)
├── DataTableShell
│   ├── Toolbar
│   │   ├── SearchInput (global text filter)
│   │   ├── FiltersButton → opens FilterDialog
│   │   ├── ColumnsButton → opens ColumnVisibilityDialog
│   │   ├── Spacer
│   │   ├── BulkActionsButton (visible when rows selected)
│   │   └── ExportButton
│   ├── DataTable (tanstack-table)
│   │   ├── TableHeader (sortable columns with sort indicators)
│   │   ├── TableBody (rows with hover-reveal actions)
│   │   │   ├── CheckboxCell
│   │   │   ├── DataCell (typed by column.type)
│   │   │   ├── StatusBadge (for status type columns)
│   │   │   └── ActionsCell (edit/delete/export - hover visible)
│   │   └── TableFooter (contextual info bar)
│   └── PaginationFooter
│       ├── PageSizeSelector (25, 50, 100)
│       ├── ShowingRange Text ("Showing 1-50 of 1,234")
│       ├── FirstButton
│       ├── PrevButton
│       ├── PageNumberInput
│       ├── NextButton
│       ├── LastButton
│       └── TotalPagesText ("of 25")
├── EntityDetailModal (skeleton - opens on row click)
│   ├── Tabs: Details | Insights | Audits
│   └── Tab panels with skeleton content
└── FilterDialog (skeleton - per-column filter inputs)
```

## 4. Interface Definitions

### 4.1 Props Interfaces

```typescript
// src/lib/types/entity.ts

export interface EntityWorkspaceProps {
  entityType: string
}

export interface ColumnDef {
  id: string
  label: string
  type: 'text' | 'currency' | 'number' | 'date' | 'status' | 'actions'
  width: number
  sortable: boolean
  filterable: boolean
  visible: boolean
  order: number
}

export interface EntityRow {
  id: string
  [key: string]: unknown
}

export interface PaginationState {
  page: number
  pageSize: number
  totalRows: number
  totalPages: number
}

export interface SortState {
  columnId: string
  direction: 'asc' | 'desc'
}

export interface FilterState {
  columnId: string
  operator: 'eq' | 'neq' | 'contains' | 'gt' | 'lt' | 'gte' | 'lte' | 'between'
  value: string | number | [number, number]
}

export interface DataTableProps {
  entityType: string
  columns: ColumnDef[]
  data: EntityRow[]
  pagination: PaginationState
  sort: SortState | null
  filters: FilterState[]
  isLoading: boolean
  selectedIds: Set<string>
  onSort: (sort: SortState | null) => void
  onFilter: (filters: FilterState[]) => void
  onPageChange: (page: number, pageSize: number) => void
  onRowSelect: (ids: Set<string>) => void
  onRowClick: (id: string, row: EntityRow) => void
  onSaveColumnPrefs: (columns: ColumnDef[]) => void
}

export interface PaginationFooterProps {
  pagination: PaginationState
  onPageChange: (page: number, pageSize: number) => void
  isLoading: boolean
}

export interface ToolbarProps {
  searchValue: string
  onSearchChange: (value: string) => void
  activeFilterCount: number
  onFiltersClick: () => void
  onColumnsClick: () => void
  hasSelection: boolean
  selectedCount: number
  onBulkAction: (action: string) => void
  onExport: () => void
}
```

### 4.2 Command Interfaces (Rust)

These interfaces define the command signatures to be implemented in Rust:

```typescript
// Fetch column definitions for an entity
interface GetEntityColumnsCommand {
  entityType: string
}
// Returns: ColumnDef[]

// Fetch paginated entity data
interface GetEntityDataCommand {
  entityType: string
  columns: string[] // visible column IDs
  page: number
  pageSize: number
  sort?: { column: string; direction: 'asc' | 'desc' }
  filters?: FilterState[]
}
// Returns: { rows: EntityRow[], totalRows: number, totalPages: number }

// Fetch single entity full data for modal
interface GetEntityByIdCommand {
  entityType: string
  id: string
}
// Returns: EntityDetail

// Load user column preferences
interface LoadUserColumnPrefsCommand {
  userId: string
  entityType: string
}
// Returns: ColumnDef[] | null

// Save user column preferences
interface SaveUserColumnPrefsCommand {
  userId: string
  entityType: string
  columns: ColumnDef[]
}
// Returns: void
```

## 5. TanStack Query Integration

### 5.1 Query Keys Structure

```typescript
const queryKeys = {
  entityColumns: (entityType: string) => ['entity', entityType, 'columns'],
  userColumnPrefs: (entityType: string, userId: string) => [
    'entity',
    entityType,
    'prefs',
    userId,
  ],
  entityData: (
    entityType: string,
    columns: string[],
    page: number,
    pageSize: number,
    sort?: SortState,
    filters?: FilterState[]
  ) => [
    'entity',
    entityType,
    'data',
    { columns, page, pageSize, sort, filters },
  ],
  entityById: (entityType: string, id: string) => [
    'entity',
    entityType,
    'item',
    id,
  ],
}
```

### 5.2 Query Configuration

```typescript
// Column definitions - rarely change, cache permanently
const { data: columnDefs } = useQuery({
  queryKey: queryKeys.entityColumns(entityType),
  queryFn: () => commands.getEntityColumns(entityType),
  staleTime: Infinity,
  gcTime: Infinity,
})

// User preferences
const { data: userPrefs } = useQuery({
  queryKey: queryKeys.userColumnPrefs(entityType, currentUserId),
  queryFn: () => commands.loadUserColumnPrefs(currentUserId, entityType),
})

// Entity data - refetch on filter/sort/page changes
const { data, isLoading } = useQuery({
  queryKey: queryKeys.entityData(
    entityType,
    visibleColumnIds,
    page,
    pageSize,
    sort,
    filters
  ),
  queryFn: () =>
    commands.getEntityData({
      entityType,
      columns: visibleColumnIds,
      page,
      pageSize,
      sort,
      filters,
    }),
})
```

### 5.3 Column Preferences Merging

```typescript
function mergeColumnDefsWithPrefs(
  defaults: ColumnDef[],
  userPrefs: ColumnDef[] | null
): ColumnDef[] {
  if (!userPrefs) return defaults

  const prefsMap = new Map(userPrefs.map(p => [p.id, p]))

  return defaults
    .map(col => {
      const pref = prefsMap.get(col.id)
      if (!pref) return col
      return {
        ...col,
        width: pref.width ?? col.width,
        visible: pref.visible ?? col.visible,
        order: pref.order ?? col.order,
      }
    })
    .sort((a, b) => a.order - b.order)
}
```

## 6. User Preferences Storage

### 6.1 Storage Key Format

```
user_prefs_{userId}_{entityType}
```

Example: `user_prefs_anonymous_customers`

### 6.2 Persisted Format

```typescript
interface PersistedUserPrefs {
  version: 1
  columns: Array<{
    id: string
    width: number
    visible: boolean
    order: number
  }>
}
```

### 6.3 Save Strategy

1. **Immediate**: Save to localStorage for instant persistence
2. **Background**: Queue sync to server when `userId` is authenticated
3. **Hybrid API**: `onSaveColumnPrefs` callback accepts `ColumnDef[]`, component doesn't care about storage backend

## 7. Feature Behaviors

### 7.1 Toolbar Actions

| Action           | Behavior                                    |
| ---------------- | ------------------------------------------- |
| **New Entry**    | Opens empty form modal/panel                |
| **Filters**      | Opens filter dialog with per-column inputs  |
| **Columns**      | Opens column visibility/reorder dialog      |
| **Bulk Actions** | Appears when rows selected, shows batch ops |
| **Export**       | Exports visible/filtered data to CSV        |

### 7.2 Table Interactions

| Interaction           | Behavior                                   |
| --------------------- | ------------------------------------------ |
| **Row checkbox**      | Toggle selection, multi-select enabled     |
| **Header cell click** | Toggle sort (asc → desc → none)            |
| **Row click**         | Open EntityDetailModal with 3 tabs         |
| **Row hover**         | Reveal action buttons (edit/delete/export) |
| **Column resize**     | Drag handle to resize, persists to prefs   |

### 7.3 Row Actions (hover-visible)

| Action     | Behavior                                  |
| ---------- | ----------------------------------------- |
| **Edit**   | Open entity form with row data pre-filled |
| **Delete** | Confirmation dialog, then delete command  |
| **Export** | Export single row to CSV                  |

### 7.4 Pagination Controls

- Page size selector: options `[25, 50, 100]`
- First page button (`<<`)
- Previous page button (`chevron_left`)
- Page number input (editable, validates on blur)
- Next page button (`chevron_right`)
- Last page button (`>>`)
- Total pages display: "of X"
- Rows per page display: "Showing X-Y of Z"

## 8. Modal Specification

### 8.1 Entity Detail Modal

Opens on row click. Three tabs with skeleton content:

**Tab 1: Details**

- Full entity data in read-only or edit mode
- All columns displayed

**Tab 2: Insights**

- Skeleton: chart placeholder, summary stats

**Tab 3: Audits**

- Skeleton: timeline list of changes

### 8.2 Modal Behavior

- Opened via command triggered by row click
- Fetches full entity data via `commands.getEntityById(entityType, id)`
- Loading state shows skeleton
- Close via X button or Escape key

## 9. Filter Dialog (Skeleton)

### 9.1 Structure

Per-column filter inputs:

- Text columns: text input with contains/equals operators
- Number columns: min/max inputs
- Date columns: date range picker
- Status columns: multi-select checkboxes

### 9.2 Filter Actions

| Action        | Behavior                                           |
| ------------- | -------------------------------------------------- |
| **Apply**     | Execute filter command, close dialog, update table |
| **Clear All** | Reset all filters, refetch                         |
| **Cancel**    | Discard changes, close dialog                      |

## 10. Visual Design

### 10.1 Color Tokens Used

| Token                         | Usage                      |
| ----------------------------- | -------------------------- |
| `bg-surface-container`        | Toolbar background         |
| `bg-surface-container-low`    | Table alternate rows       |
| `bg-surface-container-lowest` | Table container background |
| `bg-surface-container-high`   | Table header, hover state  |
| `border-outline-variant`      | Table border, dividers     |
| `text-on-surface`             | Primary text               |
| `text-on-surface-variant`     | Secondary text             |
| `hover:bg-surface-bright`     | Button hover states        |

### 10.2 Typography

- Header cells: `font-label-caps text-label-caps text-on-surface`
- Body cells: `font-body-sm text-body-sm`
- Data cells: `font-data-tabular tabular-nums`
- Badges: `text-[11px] font-bold`

### 10.3 Spacing

- Table cell padding: `px-compact-padding py-2`
- Toolbar gap: `gap-compact-gap`
- Toolbar padding: `p-3`

### 10.4 Status Badges

| Status  | Classes                                  |
| ------- | ---------------------------------------- |
| Paid    | `bg-secondary/15 text-secondary`         |
| Overdue | `bg-error/15 text-error`                 |
| Draft   | `bg-tertiary-fixed-dim/15 text-tertiary` |

## 11. Error Handling

| Scenario                    | Behavior                                             |
| --------------------------- | ---------------------------------------------------- |
| **Data fetch fails**        | Show error toast, retain previous data, retry button |
| **Command not implemented** | Show "Feature coming soon" placeholder               |
| **Invalid filter**          | Inline validation error, prevent submit              |
| **Pagination out of range** | Clamp to valid range                                 |

## 12. Files to Create/Modify

### New Files

| File                                               | Purpose                                  |
| -------------------------------------------------- | ---------------------------------------- |
| `src/components/entity/DataTable.tsx`              | Main table component with tanstack-table |
| `src/components/entity/DataTableShell.tsx`         | Wrapper with toolbar, table, pagination  |
| `src/components/entity/Toolbar.tsx`                | Action buttons bar                       |
| `src/components/entity/PaginationFooter.tsx`       | Pagination controls                      |
| `src/components/entity/ColumnVisibilityDialog.tsx` | Column toggle/reorder                    |
| `src/components/entity/FilterDialog.tsx`           | Filter inputs (skeleton)                 |
| `src/components/entity/EntityDetailModal.tsx`      | Row detail modal (skeleton)              |
| `src/lib/types/entity.ts`                          | Adding interface definitions             |

### Modified Files

| File                                        | Change                               |
| ------------------------------------------- | ------------------------------------ |
| `src/components/entity/EntityWorkspace.tsx` | Replace skeleton with DataTableShell |
| `src/lib/types/entity.ts`                   | Add new interface definitions        |
| `src/lib/tauri-bindings.ts`                 | Export new command types (future)    |

## 13. Implementation Phases

### Phase 1: Skeleton Foundation

- Replace skeleton placeholders with `DataTableShell`
- Implement `Toolbar` with buttons (show modals)
- Implement `PaginationFooter` with controls
- Implement `EntityDetailModal` (3-tab skeleton)

### Phase 2: TanStack Table Core

- Integrate tanstack-table
- Implement `DataTable` with column config
- Sort client-side first, move to server later
- Row selection checkboxes

### Phase 3: Server Integration (Mock)

- Implement mock commands returning static data
- Implement command interfaces in Rust (stub)
- Connect TanStack Query to commands

### Phase 4: User Preferences

- Implement localStorage persistence
- Column visibility toggle
- Column order persistence

### Phase 5: Polish

- Row click modal with real data
- Filter dialog implementation
- Export functionality

## 14. Reference

- **Visual Reference**: `stitch-screens/entity-data-table.html`
- **Existing Spec**: `docs/superpowers/specs/2026-05-25-entity-workspace-design.md`
- **TanStack Table**: Uses @tanstack/react-table v5
- **Theme**: Tailwind CSS v4 with design tokens from `theme-variables.css`
