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