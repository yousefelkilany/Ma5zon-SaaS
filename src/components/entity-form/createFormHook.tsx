/* eslint-disable react-refresh/only-export-components */
import { createFormHook, createFormHookContexts } from '@tanstack/react-form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Field as UIField, FieldLabel, FieldError } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

const { fieldContext, useFieldContext, formContext } = createFormHookContexts()

interface TextFieldProps {
  label: string
  placeholder?: string
  disabled?: boolean
}

function TextFieldComponent({ label, placeholder, disabled }: TextFieldProps) {
  const field = useFieldContext<string>()

  return (
    <UIField>
      <FieldLabel>{label}</FieldLabel>
      <Input
        value={field.state.value ?? ''}
        onChange={e => field.handleChange(e.target.value)}
        onBlur={field.handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={!!field.state.meta.errors.length}
      />
      {field.state.meta.errors[0] && (
        <FieldError>{String(field.state.meta.errors[0])}</FieldError>
      )}
    </UIField>
  )
}

interface NumberFieldProps {
  label: string
  placeholder?: string
  disabled?: boolean
  min?: number
  max?: number
  step?: number
  precision?: number
}

function NumberFieldComponent({
  label,
  placeholder,
  disabled,
  min = 0,
  max,
  step = 1,
  precision,
}: NumberFieldProps) {
  const field = useFieldContext<number>()

  return (
    <UIField>
      <FieldLabel>{label}</FieldLabel>
      <Input
        type="number"
        value={field.state.value !== undefined ? field.state.value : ''}
        onChange={e => {
          const val = e.target.value
          field.handleChange(
            val === '' ? ('' as unknown as number) : parseFloat(val)
          )
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
        <FieldError>{String(field.state.meta.errors[0])}</FieldError>
      )}
    </UIField>
  )
}

interface SelectFieldProps {
  label: string
  options: { value: string; label: string }[]
  placeholder?: string
  disabled?: boolean
  onChange?: (val: string) => void
}

function SelectFieldComponent({
  label,
  options,
  placeholder,
  disabled,
  onChange,
}: SelectFieldProps) {
  const field = useFieldContext<string>()

  return (
    <UIField>
      <FieldLabel>{label}</FieldLabel>
      <Select
        value={field.state.value ?? ''}
        onValueChange={val => {
          field.handleChange(val)
          onChange?.(val)
        }}
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
        <FieldError>{String(field.state.meta.errors[0])}</FieldError>
      )}
    </UIField>
  )
}

export const { useAppForm, withForm } = createFormHook({
  fieldComponents: {
    TextField: TextFieldComponent,
    NumberField: NumberFieldComponent,
    SelectField: SelectFieldComponent,
  },
  formComponents: {},
  fieldContext,
  formContext,
})

export { useFieldContext }
