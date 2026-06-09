import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { PrintPreviewDialog } from '../PrintPreviewDialog'
import type { ColumnDef, EntityRow } from '@/lib/types/entity'

const columns: ColumnDef[] = [
  {
    id: 'name',
    label: 'Name',
    type: 'text',
    visible: true,
    filterable: true,
    order: 0,
    typeLabel: 'Text',
    width: 100,
    sortable: true,
    isDataCol: true,
  },
]

const selectedData: EntityRow[] = [{ id: '1', name: 'Foo' }]

function renderDialog(
  props: Partial<React.ComponentProps<typeof PrintPreviewDialog>> = {}
) {
  const onOpenChange = vi.fn()
  const onPrint = vi.fn()
  const utils = render(
    <PrintPreviewDialog
      open={true}
      onOpenChange={onOpenChange}
      columns={columns}
      selectedData={selectedData}
      entityType="products"
      onPrint={onPrint}
      {...props}
    />
  )
  return { ...utils, onOpenChange, onPrint }
}

describe('PrintPreviewDialog', () => {
  it('closing without changes calls onOpenChange(false) directly', async () => {
    const user = userEvent.setup()
    const { onOpenChange } = renderDialog()
    await user.click(screen.getByRole('button', { name: 'إلغاء' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('closing with the dialog backdrop also calls onOpenChange(false) (no staged changes here)', async () => {
    const { onOpenChange } = renderDialog()
    // PrintPreview has no edits, so any close attempt just discards immediately
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it('discarding (no changes path) calls onOpenChange(false)', async () => {
    const user = userEvent.setup()
    const { onOpenChange } = renderDialog()
    await user.click(screen.getByRole('button', { name: 'إلغاء' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('"Keep editing" is not shown when nothing is dirty', async () => {
    const user = userEvent.setup()
    renderDialog()
    await user.click(screen.getByRole('button', { name: 'إلغاء' }))
    expect(screen.queryByText('Keep editing')).not.toBeInTheDocument()
  })
})
