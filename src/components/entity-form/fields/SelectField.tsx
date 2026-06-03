import { Field as UIField, FieldLabel, FieldError } from '@/components/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useForm } from '@tanstack/react-form'

interface SelectFieldProps {
  name: string
  label: string
  options: { value: string; label: string }[]
  placeholder?: string
  disabled?: boolean
  form: ReturnType<typeof useForm>
}

export function SelectField({ name, label, options, placeholder, disabled, form }: SelectFieldProps) {
  return (
    <form.Field name={name}>
      {field => (
        <UIField>
          <FieldLabel>{label}</FieldLabel>
          <Select
            value={field.state.value}
            onValueChange={field.handleChange}
            disabled={disabled}
          >
            <SelectTrigger aria-invalid={!!field.state.meta.errors.length}>
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {field.state.meta.errors[0] && (
            <FieldError>{field.state.meta.errors[0]}</FieldError>
          )}
        </UIField>
      )}
    </form.Field>
  )
}