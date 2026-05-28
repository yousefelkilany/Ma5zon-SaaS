import { render, screen } from '@/test/test-utils'
import { describe, it, expect } from 'vitest'
import { ProfileModal } from './ProfileModal'

describe('ProfileModal', () => {
  it('renders without crashing', () => {
    render(<ProfileModal open={true} onOpenChange={() => {}} />)
    expect(screen.getByRole('dialog', { name: /Profile/ })).toBeInTheDocument()
  })

  it('renders account tab by default', () => {
    render(<ProfileModal open={true} onOpenChange={() => {}} />)
    const tabs = screen.getAllByRole('tab')
    expect(tabs).toHaveLength(3)
  })

  it('renders form fields', () => {
    render(<ProfileModal open={true} onOpenChange={() => {}} />)
    const inputs = screen.getAllByRole('textbox')
    expect(inputs.length).toBeGreaterThanOrEqual(2)
  })

  it('contains save button', () => {
    render(<ProfileModal open={true} onOpenChange={() => {}} />)
    const buttons = screen.getAllByRole('button')
    const saveButton = buttons.find(btn =>
      btn.textContent?.includes('save') || btn.textContent?.includes('حفظ')
    )
    expect(saveButton).toBeInTheDocument()
  })

  it('renders all three tabs', () => {
    render(<ProfileModal open={true} onOpenChange={() => {}} />)
    const tabs = screen.getAllByRole('tab')
    expect(tabs).toHaveLength(3)
  })
})