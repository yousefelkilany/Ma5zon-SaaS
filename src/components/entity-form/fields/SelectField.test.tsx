import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SelectField } from './SelectField'
import { useForm } from '@tanstack/react-form'

describe('SelectField', () => {
  it('renders label', () => {
    const FormContainer = () => {
      const form = useForm({ defaultValues: { warehouse: '' } })
      return (
        <form.Field name="warehouse">
          {_field => (
            <SelectField name="warehouse" label="Warehouse" form={form as ReturnType<typeof useForm>} options={[
              { value: 'wh1', label: 'Warehouse 1' },
              { value: 'wh2', label: 'Warehouse 2' },
            ]} />
          )}
        </form.Field>
      )
    }
    render(<FormContainer />)
    expect(screen.getByText('Warehouse')).toBeInTheDocument()
  })

  it('renders select trigger', () => {
    const FormContainer = () => {
      const form = useForm({ defaultValues: { warehouse: '' } })
      return (
        <form.Field name="warehouse">
          {_field => (
            <SelectField name="warehouse" label="Warehouse" form={form as ReturnType<typeof useForm>} options={[
              { value: 'wh1', label: 'Warehouse 1' },
              { value: 'wh2', label: 'Warehouse 2' },
            ]} />
          )}
        </form.Field>
      )
    }
    render(<FormContainer />)
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })
})