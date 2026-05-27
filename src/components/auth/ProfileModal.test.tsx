import { render, screen } from '@/test/test-utils'
import { describe, it, expect } from 'vitest'
import { ProfileModal } from './ProfileModal'

describe('ProfileModal', () => {
  it('renders without crashing', () => {
    render(
      <ProfileModal
        open={true}
        onOpenChange={() => {}}
      />
    )
    expect(screen.getByText(/User Profile/)).toBeInTheDocument()
  })

  it('renders account tab by default', () => {
    render(
      <ProfileModal
        open={true}
        onOpenChange={() => {}}
      />
    )
    expect(screen.getByRole('tab', { name: /Account/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Security/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Activity Logs/ })).toBeInTheDocument()
  })

  it('renders form fields', () => {
    render(
      <ProfileModal
        open={true}
        onOpenChange={() => {}}
      />
    )
    expect(screen.getByLabelText(/Full Name/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Email/)).toBeInTheDocument()
  })

  it('contains save button', () => {
    render(
      <ProfileModal
        open={true}
        onOpenChange={() => {}}
      />
    )
    expect(screen.getByRole('button', { name: /Save Changes/ })).toBeInTheDocument()
  })

  it('shows system status in footer', () => {
    render(
      <ProfileModal
        open={true}
        onOpenChange={() => {}}
      />
    )
    expect(screen.getByText(/System Online/)).toBeInTheDocument()
    expect(screen.getByText(/UTC/)).toBeInTheDocument()
  })
})