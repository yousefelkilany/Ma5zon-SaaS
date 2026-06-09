import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { FilterDialog } from '../FilterDialog'
import type { ColumnDef } from '@/lib/types/entity'

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
  {
    id: 'amount',
    label: 'Amount',
    type: 'number',
    visible: true,
    filterable: true,
    order: 1,
    typeLabel: 'Number',
    width: 100,
    sortable: true,
    isDataCol: true,
  },
]

function renderDialog(
  props: Partial<React.ComponentProps<typeof FilterDialog>> = {}
) {
  const onOpenChange = vi.fn()
  const onApply = vi.fn()
  const utils = render(
    <FilterDialog
      open={true}
      onOpenChange={onOpenChange}
      columns={columns}
      filters={[]}
      onApply={onApply}
      {...props}
    />
  )
  return { ...utils, onOpenChange, onApply }
}

describe('FilterDialog', () => {
  it('closing without changes calls onOpenChange(false) directly', async () => {
    const user = userEvent.setup()
    const { onOpenChange } = renderDialog()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('closing with staged changes opens the confirm popover', async () => {
    const user = userEvent.setup()
    const { onOpenChange } = renderDialog()
    await user.type(screen.getByLabelText('Filter Name'), 'foo')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onOpenChange).not.toHaveBeenCalled()
    expect(screen.getByText('Keep editing')).toBeInTheDocument()
    expect(screen.getByText('Discard')).toBeInTheDocument()
  })

  it('discarding calls onOpenChange(false)', async () => {
    const user = userEvent.setup()
    const { onOpenChange } = renderDialog()
    await user.type(screen.getByLabelText('Filter Name'), 'foo')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await user.click(screen.getByText('Discard'))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('"Keep editing" closes the prompt without calling onOpenChange', async () => {
    const user = userEvent.setup()
    const { onOpenChange } = renderDialog()
    await user.type(screen.getByLabelText('Filter Name'), 'foo')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await user.click(screen.getByText('Keep editing'))
    expect(onOpenChange).not.toHaveBeenCalled()
    expect(screen.queryByText('Keep editing')).not.toBeInTheDocument()
  })
})
