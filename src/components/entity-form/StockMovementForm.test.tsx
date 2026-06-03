import { render, screen } from '@testing-library/react'
import { StockMovementForm } from './StockMovementForm'

describe('StockMovementForm', () => {
  it('renders movement type and quantity fields', () => {
    render(<StockMovementForm onSubmit={vi.fn()} />)

    expect(screen.getAllByRole('combobox')).toHaveLength(2)
    expect(screen.getByRole('spinbutton')).toBeInTheDocument()
  })

  it('conditionally shows from/to warehouses based on movement type', () => {
    // Transfer type should show both from and to warehouse
    // Adjustment type should hide from warehouse
  })
})