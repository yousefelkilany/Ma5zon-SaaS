import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProductForm } from './ProductForm'

describe('ProductForm', () => {
  it('renders all fields', async () => {
    const handleSubmit = vi.fn()
    render(<ProductForm onSubmit={handleSubmit} />)

    const textboxes = screen.getAllByRole('textbox')
    expect(textboxes).toHaveLength(3)
  })
})
