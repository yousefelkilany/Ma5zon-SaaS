import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { ColumnVisibilityDialog } from '../ColumnVisibilityDialog'
import type { ColumnDef } from '@/lib/types/entity'

function makeColumn(
  id: string,
  overrides: Partial<ColumnDef> = {}
): ColumnDef {
  return {
    id,
    label: id,
    type: 'text',
    visible: true,
    filterable: true,
    order: 0,
    typeLabel: 'Text',
    width: 100,
    sortable: true,
    isDataCol: true,
    ...overrides,
  }
}

const columns: ColumnDef[] = [
  makeColumn('name', { label: 'Name' }),
  makeColumn('amount', { label: 'Amount', order: 1 }),
]

function renderDialog(
  props: Partial<React.ComponentProps<typeof ColumnVisibilityDialog>> = {}
) {
  const onOpenChange = vi.fn()
  const onSave = vi.fn()
  const utils = render(
    <ColumnVisibilityDialog
      open={true}
      onOpenChange={onOpenChange}
      columns={columns}
      onSave={onSave}
      {...props}
    />
  )
  return { ...utils, onOpenChange, onSave }
}

describe('ColumnVisibilityDialog', () => {
  it('closing without changes calls onOpenChange(false) directly', async () => {
    const user = userEvent.setup()
    const { onOpenChange } = renderDialog()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('closing with staged changes opens the confirm popover', async () => {
    const user = userEvent.setup()
    const { onOpenChange } = renderDialog()
    const checkboxes = screen.getAllByRole('checkbox', {
      name: /Toggle \{column\} visibility/i,
    })
    await user.click(checkboxes[0] as HTMLElement)
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onOpenChange).not.toHaveBeenCalled()
    expect(screen.getByText('Keep editing')).toBeInTheDocument()
    expect(screen.getByText('Discard')).toBeInTheDocument()
  })

  it('discarding calls onOpenChange(false)', async () => {
    const user = userEvent.setup()
    const { onOpenChange } = renderDialog()
    const checkboxes = screen.getAllByRole('checkbox', {
      name: /Toggle \{column\} visibility/i,
    })
    await user.click(checkboxes[0] as HTMLElement)
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await user.click(screen.getByText('Discard'))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('"Keep editing" closes the prompt without calling onOpenChange', async () => {
    const user = userEvent.setup()
    const { onOpenChange } = renderDialog()
    const checkboxes = screen.getAllByRole('checkbox', {
      name: /Toggle \{column\} visibility/i,
    })
    await user.click(checkboxes[0] as HTMLElement)
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await user.click(screen.getByText('Keep editing'))
    expect(onOpenChange).not.toHaveBeenCalled()
    expect(screen.queryByText('Keep editing')).not.toBeInTheDocument()
  })
})
