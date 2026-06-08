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
import { langDir } from '@/i18n/config'
import { ibmPlexFont500, ibmPlexFont700 } from '@/lib/fonts/ibmPlexFonts'

interface PrintPreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  columns: ColumnDef[]
  selectedData: EntityRow[]
  entityType: string
  onPrint: () => void
}

export function PrintPreviewDialog({
  open,
  onOpenChange,
  columns,
  selectedData,
  entityType,
  onPrint,
}: PrintPreviewDialogProps) {
  const { t, i18n } = useTranslation()

  const visibleCols = columns.filter(c => c.visible && c.type !== 'actions')
  const direction = langDir(i18n.language)

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
            className="w-full h-full min-h-100 border-0"
            srcDoc={buildPrintHtml(
              visibleCols,
              selectedData,
              entityType,
              t,
              direction
            )}
          />
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('entity.workspace.print.cancelButton')}
          </Button>
          <Button onClick={handlePrintClick}>
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
  t: (key: string, options?: Record<string, unknown>) => string,
  direction: 'ltr' | 'rtl'
): string {
  const headers = columns.map(c => `<th>${c.label}</th>`).join('')
  const rows = data
    .map(
      row =>
        `<tr>${columns.map(c => `<td>${row[c.id] ?? ''}</td>`).join('')}</tr>`
    )
    .join('')

  const textAlign = direction === 'rtl' ? 'right' : 'left'
  const tableTextAlign = direction === 'rtl' ? 'right' : 'left'

  return `<!DOCTYPE html>
<html dir="${direction}">
<head>
  <title>Ma5zon - ${t('sidebar.nav.' + entityType, { defaultValue: entityType })}</title>
  <style>
    @font-face {
      font-family: 'IBM Plex Sans Arabic';
      font-style: normal;
      font-weight: 500;
      font-display: swap;
      src: url('${ibmPlexFont500}') format('woff2');
    }
    @font-face {
      font-family: 'IBM Plex Sans Arabic';
      font-style: normal;
      font-weight: 700;
      font-display: swap;
      src: url('${ibmPlexFont700}') format('woff2');
    }
    body { font-family: 'IBM Plex Sans Arabic', 'Segoe UI', sans-serif; padding: 20px; font-size: 12px; direction: ${direction}; }
    h2 { margin-bottom: 4px; text-align: ${textAlign}; }
    p { color: #666; margin-bottom: 16px; text-align: ${textAlign}; }
    table { width: 100%; border-collapse: collapse; direction: ${direction}; }
    th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: ${tableTextAlign}; vertical-align: middle; line-height: 1.5; }
    th { background: #f5f5f5; font-weight: 600; }
    td { height: 1.5em; }
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
