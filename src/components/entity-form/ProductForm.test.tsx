import { render, screen } from '@testing-library/react'
import { ProductForm } from './ProductForm'
import { userEvent } from '@testing-library/user-event'

describe('ProductForm', () => {
  it('renders all fields', async () => {
    const handleSubmit = vi.fn()
    render(<ProductForm onSubmit={handleSubmit} />)

    const textboxes = screen.getAllByRole('textbox')
    expect(textboxes).toHaveLength(3)
  })

  it('calls onSubmit with valid data', async () => {
    const user = userEvent.setup()
    const handleSubmit = vi.fn()
    render(<ProductForm onSubmit={handleSubmit} />)

    const textboxes = screen.getAllByRole('textbox')
    await user.type(textboxes[0], 'Acme Corp')
    await user.type(textboxes[1], 'Widget Pro')
    await user.type(textboxes[2], 'Electronics')

    await user.click(screen.getByRole('button', { type: 'submit' }))

    expect(handleSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        company: expect.any(String),
        name: expect.any(String),
        category: expect.any(String),
      })
    )
  })
})