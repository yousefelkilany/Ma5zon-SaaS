import { Field as UIField, FieldLabel, FieldError } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useForm } from '@tanstack/react-form'

interface NumberFieldProps {
  name: string
  label: string
  placeholder?: string
  disabled?: boolean
  min?: number
  max?: number
  step?: number
  precision?: number
  form: ReturnType<typeof useForm>
}

export function NumberField({
  name,
  label,
  placeholder,
  disabled,
  min = 0,
  max,
  step = 1,
  precision,
  form,
}: NumberFieldProps) {
  return (
    <form.Field name={name}>
      {field => (
        <UIField>
          <FieldLabel>{label}</FieldLabel>
          <Input
            type="number"
            value={field.state.value ?? ''}
            onChange={e => {
              const val = e.target.value
              field.handleChange(val === '' ? undefined : parseFloat(val))
            }}
            onBlur={field.handleBlur}
            placeholder={placeholder}
            disabled={disabled}
            min={min}
            max={max}
            step={precision !== undefined ? Math.pow(10, -precision) : step}
            aria-invalid={!!field.state.meta.errors.length}
          />
          {field.state.meta.errors[0] && (
            <FieldError>{field.state.meta.errors[0]}</FieldError>
          )}
        </UIField>
      )}
    </form.Field>
  )
}