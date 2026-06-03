import { render, screen } from '@testing-library/react'
import { WarehouseForm } from './WarehouseForm'

describe('WarehouseForm', () => {
  it('renders all fields', () => {
    render(<WarehouseForm onSubmit={vi.fn()} />)

    const textboxes = screen.getAllByRole('textbox')
    expect(textboxes).toHaveLength(2)
  })
})