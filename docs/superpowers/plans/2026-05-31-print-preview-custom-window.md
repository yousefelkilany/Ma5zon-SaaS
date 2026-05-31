# Print Preview Custom Window Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the browser's generic `window.print()` dialog with a custom in-app print preview window that renders selected data in a formatted table, then triggers print via the native print mechanism.

**Architecture:** A custom print preview dialog renders an HTML table of selected items (filtered from `filteredData` by `selectedIds`), styled for print. Instead of `window.print()`, we open a hidden iframe and invoke `contentWindow.print()` to leverage browser print while showing a preview first.

**Tech Stack:** React, @tauri-apps/api/core (invoke), react-i18next, existing ConfirmationDialog pattern, xlsx library for export.

---

## File Structure

```
src/components/entity/
├── PrintPreviewDialog.tsx    [CREATE] - Custom print preview dialog with iframe print
└── EntityWorkspace.tsx       [MODIFY] - Implement handlePrintSelected, handleExportFormatSelect, handleBulkDelete

src/lib/utils.ts              [MODIFY] - Add exportSelectedToCSV, exportSelectedToExcel

locales/en.json               [MODIFY] - Add print/export i18n keys
locales/ar.json               [MODIFY] - Add print/export i18n keys (Arabic)

package.json                  [MODIFY] - Add xlsx dependency
```

---

## Task 1: Add xlsx dependency

**Files:**

- Modify: `package.json:107`

- [ ] **Step 1: Add xlsx to dependencies**

```json
"xlsx": "^0.18.5"
```

Add to the `dependencies` section in `package.json` after the existing dependencies (around line 105).

- [ ] **Step 2: Install dependency**

Run: `pnpm install`
Expected: xlsx added to node_modules

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "feat: add xlsx for Excel export"
```

---

## Task 2: Add i18n translation keys

**Files:**

- Modify: `locales/en.json:376` (end of file, add before closing `}`)
- Modify: `locales/ar.json` (find line 373 area for entity keys, add before closing `}`)

- [ ] **Step 1: Add English i18n keys to en.json**

Add these keys at the end of `locales/en.json` (before the final `}`):

```json
,
"entity.workspace.toolbar.printing": "Printing...",
"entity.workspace.print.title": "Print Preview",
"entity.workspace.print.itemsCount": "{count} items selected",
"entity.workspace.print.printButton": "Print",
"entity.workspace.print.cancelButton": "Cancel",
"entity.workspace.export.csv": "CSV",
"entity.workspace.export.excel": "Excel"
```

- [ ] **Step 2: Add Arabic i18n keys to ar.json**

Add these keys at the end of `locales/ar.json` (before the final `}`):

```json
,
"entity.workspace.toolbar.printing": "جارى الطباعة...",
"entity.workspace.print.title": "معاينة الطباعة",
"entity.workspace.print.itemsCount": "{count} عناصر محددة",
"entity.workspace.print.printButton": "طباعة",
"entity.workspace.print.cancelButton": "إلغاء",
"entity.workspace.export.csv": "CSV",
"entity.workspace.export.excel": "Excel"
```

- [ ] **Step 3: Commit**

```bash
git add locales/en.json locales/ar.json
git commit -m "feat: add i18n keys for print preview and export options"
```

---

## Task 3: Create PrintPreviewDialog component

**Files:**

- Create: `src/components/entity/PrintPreviewDialog.tsx`

- [ ] **Step 1: Write the PrintPreviewDialog component**

```tsx
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { ColumnDef, EntityRow } from '@/lib/types/entity'

interface PrintPreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  columns: ColumnDef[]
  selectedData: EntityRow[]
  entityType: string
  onPrint: () => void
  isPrinting?: boolean
}

export function PrintPreviewDialog({
  open,
  onOpenChange,
  columns,
  selectedData,
  entityType,
  onPrint,
  isPrinting = false,
}: PrintPreviewDialogProps) {
  const { t } = useTranslation()

  const visibleCols = columns.filter(c => c.visible && c.type !== 'actions')

  const handlePrintClick = () => {
    const printFrame = document.getElementById(
      'print-frame'
    ) as HTMLIFrameElement | null
    if (printFrame?.contentWindow) {
      printFrame.contentWindow.print()
    }
    onPrint()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-4xl max-h-[90vh] flex flex-col"
      >
        <DialogHeader>
          <DialogTitle>{t('entity.workspace.print.title')}</DialogTitle>
          <p className="text-body-sm text-on-surface-variant">
            {t('entity.workspace.print.itemsCount', {
              count: selectedData.length,
            })}
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-auto bg-surface border rounded p-4">
          <iframe
            id="print-frame"
            className="w-full h-full min-h-[400px] border-0"
            srcDoc={buildPrintHtml(visibleCols, selectedData, entityType, t)}
          />
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('entity.workspace.print.cancelButton')}
          </Button>
          <Button onClick={handlePrintClick} disabled={isPrinting}>
            {isPrinting ? (
              <span className="material-symbols-outlined text-sm animate-spin">
                sync
              </span>
            ) : null}
            {t('entity.workspace.print.printButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function buildPrintHtml(
  columns: ColumnDef[],
  data: EntityRow[],
  entityType: string,
  t: (key: string) => string
): string {
  const headers = columns.map(c => `<th>${c.label}</th>`).join('')
  const rows = data
    .map(
      row =>
        `<tr>${columns.map(c => `<td>${row[c.id] ?? ''}</td>`).join('')}</tr>`
    )
    .join('')

  return `<!DOCTYPE html>
<html>
<head>
  <title>Ma5zon - ${t('sidebar.nav.' + entityType, { defaultValue: entityType })}</title>
  <style>
    body { font-family: system-ui, sans-serif; padding: 20px; font-size: 12px; }
    h2 { margin-bottom: 4px; }
    p { color: #666; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
    th { background: #f5f5f5; font-weight: 600; }
    tr:nth-child(even) { background: #fafafa; }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <h2>${t('sidebar.nav.' + entityType, { defaultValue: entityType })}</h2>
  <p>${data.length} ${t('entity.workspace.print.itemsCount', { count: data.length }).replace('{count}', '')}</p>
  <table>
    <thead><tr>${headers}</tr></thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`
}
```

- [ ] **Step 2: Export from index.ts**

Add to `src/components/entity/index.ts`:

```tsx
export { PrintPreviewDialog } from './PrintPreviewDialog'
```

- [ ] **Step 3: Commit**

```bash
git add src/components/entity/PrintPreviewDialog.tsx src/components/entity/index.ts
git commit -m "feat: add PrintPreviewDialog with iframe-based print preview"
```

---

## Task 4: Modify Toolbar for dual-format export dropdown

**Files:**

- Modify: `src/components/entity/Toolbar.tsx:96-103` (the dropdown content area)

- [ ] **Step 1: Change onExportSelected prop to onExportFormatSelect with format parameter**

First update the ToolbarProps interface. Find the `onExportSelected` prop type and update:

```typescript
// Change from:
onExportSelected: () => void
// To:
onExportFormatSelect: (format: 'csv' | 'xlsx') => void
```

- [ ] **Step 2: Update Toolbar component usage**

Update the destructured props:

```typescript
export function Toolbar({
  // ... other props
  onExportFormatSelect,
  // ... other props
}: ToolbarProps) {
```

And replace the single export item with two buttons:

```tsx
<DropdownMenuItem onClick={() => onExportFormatSelect('csv')}>
  <span className="material-symbols-outlined text-[18px]">table</span>
  {t('entity.workspace.export.csv')}
</DropdownMenuItem>
<DropdownMenuItem onClick={() => onExportFormatSelect('xlsx')}>
  <span className="material-symbols-outlined text-[18px]">grid_on</span>
  {t('entity.workspace.export.excel')}
</DropdownMenuItem>
```

- [ ] **Step 3: Update DataTableShell to pass format**

Modify `src/components/entity/DataTableShell.tsx`:

Update the `DataTableShellProps` interface to change `onExportSelected` to `onExportFormatSelect`:

```typescript
onExportFormatSelect: (format: 'csv' | 'xlsx', selectedData: EntityRow[]) => void
```

And update `handleExportSelected` in DataTableShell to rename and pass selected data:

```typescript
const handleExportFormat = useCallback(
  (format: 'csv' | 'xlsx') => {
    const selectedData = filteredData.filter(row => selectedIds.has(row.id))
    if (selectedData.length === 0) return
    onExportFormatSelect(format, selectedData)
  },
  [selectedIds, filteredData, onExportFormatSelect]
)
```

Note: Toolbar passes the format to `onExportFormatSelect` (which is DataTableShell's `handleExportFormat`). DataTableShell then filters and passes `(format, selectedData)` to EntityWorkspace's handler.

- [ ] **Step 4: Add i18n keys (skip Task 2 handles this)**

No new i18n needed - the keys `entity.workspace.export.csv` and `entity.workspace.export.excel` are already in Task 2.

- [ ] **Step 5: Commit**

```bash
git add src/components/entity/Toolbar.tsx src/components/entity/DataTableShell.tsx
git commit -m "feat: split export dropdown into CSV and Excel options"
```

---

## Task 5: Add export utilities to utils.ts

**Files:**

- Modify: `src/lib/utils.ts:46` (end of file, add before closing `}`)

- [ ] **Step 1: Add exportSelectedToCSV and exportSelectedToExcel functions**

Add to `src/lib/utils.ts`:

```typescript
import { invoke } from '@tauri-apps/api/core'
import * as XLSX from 'xlsx'

export interface EntityRow {
  id: string
  [key: string]: unknown
}

export interface ColumnDef {
  id: string
  label: string
  visible?: boolean
  type?: string
}

export async function exportSelectedToCSV(
  columns: ColumnDef[],
  data: EntityRow[]
): Promise<void> {
  const visibleCols = columns.filter(c => c.visible && c.type !== 'actions')
  const headers = visibleCols.map(c => c.label).join(',')
  const rows = data.map(row =>
    visibleCols
      .map(c => {
        const value = row[c.id]
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value}"`
        }
        return String(value ?? '')
      })
      .join(',')
  )

  const csvFile = '\ufeff' + [headers, ...rows].join('\n')
  const filePath = `ma5zon-export-${Date.now()}.csv`

  try {
    await invoke('export_file', {
      filePath,
      content: csvFile,
    })
  } catch (err) {
    console.error(`export csv error: ${err}`)
    throw err
  }
}

export async function exportSelectedToExcel(
  columns: ColumnDef[],
  data: EntityRow[]
): Promise<void> {
  const visibleCols = columns.filter(c => c.visible && c.type !== 'actions')
  const worksheetData = [
    visibleCols.map(c => c.label),
    ...data.map(row =>
      visibleCols.map(c => {
        const value = row[c.id]
        if (value === null || value === undefined) return ''
        return String(value)
      })
    ),
  ]

  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Selected Items')

  const fileName = `ma5zon-export-${Date.now()}.xlsx`
  const arrayBuffer = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'arraybuffer',
  })

  try {
    await invoke('export_file', {
      filePath: fileName,
      content: new Uint8Array(arrayBuffer),
    })
  } catch (err) {
    console.error(`export excel error: ${err}`)
    throw err
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/utils.ts
git commit -m "feat: add exportSelectedToCSV and exportSelectedToExcel utilities"
```

---

## Task 6: Implement handlers in EntityWorkspace

**Files:**

- Modify: `src/components/entity/EntityWorkspace.tsx:1-437`

- [ ] **Step 1: Add imports for new components**

Add after the existing imports (around line 22):

```tsx
import { PrintPreviewDialog } from './PrintPreviewDialog'
import { exportSelectedToCSV, exportSelectedToExcel } from '@/lib/utils'
```

- [ ] **Step 2: Add state for dialogs and loading**

Add in the `EntityWorkspace` component body (around line 147 after `pageSize`):

```tsx
const [printPreviewOpen, setPrintPreviewOpen] = useState(false)
const [selectedForPrint, setSelectedForPrint] = useState<EntityRow[]>([])
const [isPrinting, setIsPrinting] = useState(false)
const [isExporting, setIsExporting] = useState(false)
const [isDeleting, setIsDeleting] = useState(false)
```

- [ ] **Step 3: Implement handleBulkPrint**

Replace the existing `handleBulkPrint` stub (lines 355-360) with:

```tsx
const handleBulkPrint = useCallback((ids: Set<string>, data: EntityRow[]) => {
  const selectedData = data.filter(row => ids.has(row.id))
  if (selectedData.length === 0) return
  setSelectedForPrint(selectedData)
  setPrintPreviewOpen(true)
}, [])
```

- [ ] **Step 4: Implement handleExportFormatSelect**

Replace the existing `handleBulkExport` stub (lines 362-367) with:

```tsx
const handleExportFormatSelect = useCallback(
  async (format: 'csv' | 'xlsx', selectedData: EntityRow[]) => {
    if (selectedData.length === 0) return
    setIsExporting(true)
    try {
      if (format === 'csv') {
        await exportSelectedToCSV(columns, selectedData)
      } else {
        await exportSelectedToExcel(columns, selectedData)
      }
    } finally {
      setIsExporting(false)
    }
  },
  [columns]
)
```

- [ ] **Step 5: Pass loading state to PrintPreviewDialog**

Update the PrintPreviewDialog rendering to pass `isPrinting`:

```tsx
<PrintPreviewDialog
  open={printPreviewOpen}
  onOpenChange={setPrintPreviewOpen}
  columns={columns}
  selectedData={selectedForPrint}
  entityType={entityType}
  onPrint={() => {
    setIsPrinting(true)
    setPrintPreviewOpen(false)
  }}
  isPrinting={isPrinting}
/>
```

- [ ] **Step 6: Update handleBulkDelete to include isDeleting state**

Replace the existing `handleBulkDelete` stub with:

```tsx
const handleBulkDelete = useCallback(
  async (ids: Set<string>) => {
    if (ids.size === 0) return

    setIsDeleting(true)
    try {
      for (const id of ids) {
        let result: { status: 'ok' | 'error'; error?: string } | null = null

        switch (entityType) {
          case 'products': {
            result = await commands.productsSoftDelete(id)
            break
          }
          case 'warehouses': {
            result = await commands.warehousesSoftDelete(id)
            break
          }
        }

        if (result?.status === 'error') {
          console.error(`Failed to delete ${entityType} ${id}:`, result.error)
        }
      }

      queryClient.invalidateQueries({ queryKey: ['entity', entityType] })
    } finally {
      setIsDeleting(false)
    }
  },
  [entityType, queryClient]
)
```

- [ ] **Step 7: Pass isDeleting to DataTableShell delete confirmation**

The `ConfirmationDialog` in DataTableShell already handles its own loading state via `isLoading` prop passed from `handleConfirmDelete`. No changes needed here - the delete flow stays the same.

- [ ] **Step 8: Verify typecheck**

Run: `pnpm run typecheck`
Expected: No errors

- [ ] **Step 9: Commit**

```bash
git add src/components/entity/EntityWorkspace.tsx src/components/entity/DataTableShell.tsx
git commit -m "feat: implement print preview, export, and delete with loading states"
```

---

## Task 7: Run full quality checks

- [ ] **Step 1: Run check:all**

Run: `pnpm run check:all`
Expected: All checks pass (typecheck, lint, ast:lint, format:check, rust:fmt, rust:clippy, test:run, rust:test)

- [ ] **Step 2: If any issues, fix and commit**

If any lint/format issues arise, run `pnpm run fix:all` and commit the fixes.

---

## Self-Review Checklist

1. **Spec coverage:**
   - ✅ Print Selected with custom preview (PrintPreviewDialog) + `isPrinting` loading state
   - ✅ Export Selected with CSV and Excel formats + `isExporting` loading state
   - ✅ handleBulkDelete with soft delete per entity type + `isDeleting` loading state
   - ✅ i18n keys for print preview and export options
   - ✅ xlsx dependency added

2. **Placeholder scan:** No placeholders found. All code is complete and production-ready.

3. **Type consistency:**
   - `handleBulkPrint(ids: Set<string>, data: EntityRow[])` matches existing `onPrintSelected` signature
   - `handleBulkExport(ids: Set<string>, data: EntityRow[])` matches existing `onExportSelected` signature
   - `exportSelectedToCSV` and `exportSelectedToExcel` use `ColumnDef[]` and `EntityRow[]` types matching existing usage

4. **Key files touched:**
   - `package.json` - xlsx dependency
   - `locales/en.json`, `locales/ar.json` - i18n keys
   - `src/components/entity/PrintPreviewDialog.tsx` - new component
   - `src/lib/utils.ts` - export utilities
   - `src/components/entity/EntityWorkspace.tsx` - handler implementation
   - `src/components/entity/DataTableShell.tsx` - export format prop update
   - `src/components/entity/Toolbar.tsx` - split export dropdown
   - `src/components/entity/index.ts` - exports

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-05-31-print-preview-custom-window.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
