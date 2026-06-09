import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { useUnsavedGuard } from '../use-unsaved-guard'

function Harness({
  isDirty,
  onDiscard,
  onSaveAndClose,
}: {
  isDirty: boolean
  onDiscard: () => void
  onSaveAndClose?: () => Promise<void> | void
}) {
  const guard = useUnsavedGuard({ isDirty, onDiscard, onSaveAndClose })
  return (
    <div>
      <button onClick={guard.requestClose}>close</button>
      <guard.ConfirmDialog />
    </div>
  )
}

describe('useUnsavedGuard', () => {
  it('calls onDiscard immediately when !isDirty (no prompt)', async () => {
    const onDiscard = vi.fn()
    render(<Harness isDirty={false} onDiscard={onDiscard} />)
    fireEvent.click(screen.getByText('close'))
    expect(onDiscard).toHaveBeenCalledTimes(1)
  })

  it('prompts when isDirty and only calls onDiscard after user confirms', async () => {
    const user = userEvent.setup()
    const onDiscard = vi.fn()
    render(<Harness isDirty={true} onDiscard={onDiscard} />)
    fireEvent.click(screen.getByText('close'))
    expect(onDiscard).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await user.click(screen.getByText('Discard'))
    expect(onDiscard).toHaveBeenCalledTimes(1)
  })

  it('Keep editing closes the prompt without calling onDiscard', async () => {
    const user = userEvent.setup()
    const onDiscard = vi.fn()
    render(<Harness isDirty={true} onDiscard={onDiscard} />)
    fireEvent.click(screen.getByText('close'))
    await user.click(screen.getByText('Keep editing'))
    expect(onDiscard).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('two-button variant (no onSaveAndClose) hides the Save & close button', () => {
    render(<Harness isDirty={true} onDiscard={() => {}} />)
    fireEvent.click(screen.getByText('close'))
    expect(screen.queryByText('Save & close')).not.toBeInTheDocument()
    expect(screen.getByText('Discard')).toBeInTheDocument()
    expect(screen.getByText('Keep editing')).toBeInTheDocument()
  })

  it('three-button variant calls onSaveAndClose on Save & close click', async () => {
    const user = userEvent.setup()
    const onDiscard = vi.fn()
    const onSaveAndClose = vi.fn().mockResolvedValue(undefined)
    render(
      <Harness
        isDirty={true}
        onDiscard={onDiscard}
        onSaveAndClose={onSaveAndClose}
      />
    )
    fireEvent.click(screen.getByText('close'))
    await user.click(screen.getByText('Save & close'))
    expect(onSaveAndClose).toHaveBeenCalledTimes(1)
    expect(onDiscard).not.toHaveBeenCalled()
  })
})
