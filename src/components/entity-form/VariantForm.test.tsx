import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { VariantForm } from './VariantForm'

describe('VariantForm', () => {
  it('renders all variant fields', () => {
    render(<VariantForm onSubmit={vi.fn()} />)

    expect(screen.getByText(/كود الصنف/i)).toBeInTheDocument()
    expect(screen.getByText(/اسم الصنف/i)).toBeInTheDocument()
    expect(screen.getByText(/الوحدة/i)).toBeInTheDocument()
    expect(screen.getByText(/المفرد/i)).toBeInTheDocument()
    expect(screen.getByText(/الجملة/i)).toBeInTheDocument()
    expect(screen.getByText(/التوزيع/i)).toBeInTheDocument()
  })
})
