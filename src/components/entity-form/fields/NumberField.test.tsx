import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NumberField } from './NumberField'
import { useForm } from '@tanstack/react-form'

describe('NumberField', () => {
  it('renders label', () => {
    const FormContainer = () => {
      const form = useForm({ defaultValues: { price: 0 } })
      return (
        <form.Field name="price">
          {_field => (
            <NumberField name="price" label="Price" form={form as ReturnType<typeof useForm>} />
          )}
        </form.Field>
      )
    }
    render(<FormContainer />)
    expect(screen.getByText('Price')).toBeInTheDocument()
  })

  it('accepts numeric constraints', () => {
    const FormContainer = () => {
      const form = useForm({ defaultValues: { price: 0 } })
      return (
        <form.Field name="price">
          {_field => (
            <NumberField name="price" label="Price" min={0} max={999} step={0.01} precision={2} form={form as ReturnType<typeof useForm>} />
          )}
        </form.Field>
      )
    }
    render(<FormContainer />)
    const input = screen.getByRole('spinbutton')
    expect(input).toHaveAttribute('min', '0')
    expect(input).toHaveAttribute('max', '999')
    expect(input).toHaveAttribute('step', '0.01')
  })
})