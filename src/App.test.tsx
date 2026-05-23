import { render, screen } from '@/test/test-utils'
import { describe, it, expect } from 'vitest'
import App from './App'

// Tauri bindings are mocked globally in src/test/setup.ts

describe('App', () => {
  it('renders main window layout', () => {
    render(<App />)
    expect(
      screen.getByRole('heading', { name: /AccuLedger/i })
    ).toBeInTheDocument()
  })

  it('renders sidebar navigation', () => {
    render(<App />)
    // Should have navigation links in the sidebar
    expect(screen.getByText(/Invoices/)).toBeInTheDocument()
    expect(screen.getByText(/Customers/)).toBeInTheDocument()
  })
})
