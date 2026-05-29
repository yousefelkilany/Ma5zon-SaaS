# Entity Detail Modal — CRUD Implementation Design

**Date:** 2026-05-29
**Status:** Approved

## Overview

Replace the skeleton `EntityDetailModal` with typed, self-contained modals per entity type. Each modal owns its data fetching, inline editing, and delete flow via existing Rust CRUD commands.

## File Structure

```
src/components/entity/
├── ConfirmationDialog.tsx       # Shared delete confirmation
├── ProductDetailModal.tsx       # Typed product modal
├── WarehouseDetailModal.tsx     # Typed warehouse modal
├── VariantDetailModal.tsx       # Typed variant modal
└── index.ts                     # Re-exports
```

`DataTable.tsx` is modified to open modals on row click.

## Data Flow

```
DataTable row click → opens modal with entityId
                        ↓
              Modal calls typed Rust command:
              - products::get_by_id(id)  → Product
              - warehouses::get_by_id(id) → Warehouse
              - variants::get_by_id(id)  → Variant
                        ↓
              Renders skeleton until data loads
```

## Component Structure (per modal)

```
Modal
├── Tab Bar (Details | Insights | Audits)
├── Tab Panels
│   ├── Details Tab
│   │   ├── View Mode: field label + value pairs (grid)
│   │   └── Edit Mode: field label + input pairs (same grid)
│   ├── Insights Tab (skeleton initially, future)
│   └── Audits Tab   (skeleton initially, future)
├── Footer Actions
│   ├── Edit Button (View mode) → toggles edit mode
│   ├── Save Button (Edit mode) → calls update command
│   ├── Cancel Button (Edit mode) → reverts changes
│   └── Delete Button → opens ConfirmationDialog
└── ConfirmationDialog (shared)
    ├── Title: "Delete {entityName}?"
    ├── Message: "This action cannot be undone."
    └── Confirm (danger) / Cancel
```

## Error Handling

```
Delete Confirm → API call
    ├── Success → Close modal + notify parent to refresh table
    └── Error   → Show error in ConfirmationDialog (retry option)

Loading states:
- Initial load: skeleton placeholders in details grid
- Saving: disable Save button + show spinner
- Deleting: disable Confirm button + show spinner

Post-delete: Modal closes and onOpenChange(false) is called.
Parent (DataTable) handles refresh via TanStack Query invalidation.

Error display: Toast notification for save/update errors.
Inline error message in delete confirmation if it fails.
```

## Implementation Notes

- Each modal uses `commands::products::get_by_id`, `warehouses::get_by_id`, `variants::get_by_id` to fetch
- Edit uses `commands::products::update`, `warehouses::update`, `variants::update`
- Delete uses `commands::products::delete`, `warehouses::delete`, `variants::delete`
- ConfirmationDialog is a reusable shared component
- Modals are self-contained — no external data passing beyond entityId prop
