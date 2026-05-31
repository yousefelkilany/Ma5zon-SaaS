# DataTableShell Bulk Actions - Print & Export Implementation

**Date:** 2026-05-31
**Status:** Draft

## Problem

The bulk actions UI is wired up but the actual Print PDF and Export functionality are placeholders. Need to implement real functionality.

## Requirements

- **Print Selected:** Generate PDF of selected items using browser print dialog
- **Export Selected:** Export selected items to CSV or Excel format
- Both operate on intersection of `selectedIds ∩ filteredData`

## Architecture

```
EntityWorkspace (handlers)
    │
    ├── handlePrintSelected(ids, data)
    │       └── Opens print window with formatted table
    │
    ├── handleExportSelected(ids, data)
    │       └── Shows format choice → CSV or Excel export
    │
    └── handleBulkDelete(ids) → Future: actual delete with query invalidation
```

## Print Selected Implementation

### Approach: Browser Print Dialog

1. User clicks Print → `handlePrintSelected(selectedIds, filteredData)` is called
2. Filter `filteredData` to only selected IDs
3. Generate HTML table with same columns as DataTable
4. Open new window with print-optimized HTML
5. Trigger `window.print()`
6. Window closes after print dialog closes (or after short delay)

### Print HTML Structure

```html
<!DOCTYPE html>
<html>
<head>
  <title>Ma5zon - Print Selected</title>
  <style>
    body { font-family: system-ui, sans-serif; padding: 20px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
    th { background: #f5f5f5; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <h2>Print Selected - {entityType}</h2>
  <p>{count} items selected</p>
  <table>
    <!-- columns from getEntityLayout -->
<thead><tr><th>Name</th><th>...</th></tr></thead>
    <tbody><!-- filtered rows --></tbody>
  </table>
</body>
</html>
```

### i18n for Print

New keys needed:
- `entity.workspace.toolbar.printing` - "Printing..." (loading state)

## Export Selected Implementation

### Approach: Dual Format (CSV + Excel)

1. User clicks Export → `handleExportSelected(selectedIds, filteredData)` is called
2. Filter `filteredData` to only selected IDs
3. Show format choice dialog (ConfirmationDialog or custom)
4. Generate file based on choice:
   - **CSV:** Use existing `exportToCSV` logic, pass selected data only
   - **Excel:** Use `xlsx` library to generate `.xlsx` file

### Dependencies

Add to `package.json`:
```json
"xlsx": "^0.18.5"
```

### Export Flow

```typescript
const handleExportSelected = useCallback(
  async (ids: Set<string>, data: EntityRow[]) => {
    const selectedData = data.filter(row => ids.has(row.id))
    if (selectedData.length === 0) return

    // Show choice dialog (using ConfirmationDialog repurposed or new component)
    const format = await showExportFormatDialog() // returns 'csv' | 'xlsx'

    if (format === 'csv') {
      await exportSelectedToCSV(columns, selectedData)
    } else {
      await exportSelectedToExcel(columns, selectedData)
    }
  },
  [columns]
)
```

### Excel Export Function

```typescript
import * as XLSX from 'xlsx'

async function exportSelectedToExcel(columns: ColumnDef[], data: EntityRow[]) {
  const visibleCols = columns.filter(c => c.visible && c.type !== 'actions')
  const worksheetData = [
    visibleCols.map(c => c.label), // header row
    ...data.map(row => visibleCols.map(c => String(row[c.id] ?? '')))
  ]

  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Selected Items')

  const fileName = `ma5zon-export-${Date.now()}.xlsx`
  const arrayBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'arraybuffer' })

  await commands.exportFile(fileName, new Uint8Array(arrayBuffer))
}
```

### CSV Export (Selected Only)

Existing `exportToCSV` exports all data. Need variant:

```typescript
async function exportSelectedToCSV(columns: ColumnDef[], data: EntityRow[]) {
  const visibleCols = columns.filter(c => c.visible && c.type !== 'actions')
  const headers = visibleCols.map(c => c.label).join(',')
  const rows = data.map(row =>
    visibleCols.map(c => {
      const value = row[c.id]
      if (typeof value === 'string' && value.includes(',')) {
        return `"${value}"`
      }
      return String(value ?? '')
    }).join(',')
  )

  const csvFile = '\ufeff' + [headers, ...rows].join('\n')
  const filePath = `ma5zon-export-${Date.now()}.csv`
  await commands.exportFile(filePath, csvFile)
}
```

## i18n Keys

New keys:
- `entity.workspace.toolbar.printing` - "Printing..."
- `entity.workspace.export.formatTitle` - "Export Format"
- `entity.workspace.export.formatDescription` - "Choose export format"
- `entity.workspace.export.csv` - "CSV"
- `entity.workspace.export.excel` - "Excel"

## Files to Modify

1. `src/components/entity/EntityWorkspace.tsx` - Implement handlers
2. `src/lib/utils.ts` - Add `exportSelectedToCSV`, `exportSelectedToExcel`
3. `locales/en.json`, `locales/ar.json` - Add i18n keys
4. `package.json` - Add `xlsx` dependency

## Out of Scope

- Actual PDF generation (using browser print as proxy)
- Bulk delete actual implementation
- Multi-page selection
