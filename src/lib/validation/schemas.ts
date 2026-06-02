import { z } from 'zod'

const NONEMPTY_MSG = 'This field is required'
const MAX_CHARS_MSG = (max: number) => `Must be ${max} characters or less`

export const createProductSchema = z.object({
  company: z.string().min(1, NONEMPTY_MSG).max(100, MAX_CHARS_MSG(100)),
  name: z.string().min(1, NONEMPTY_MSG).max(200, MAX_CHARS_MSG(200)),
  category: z.string().min(1, NONEMPTY_MSG).max(100, MAX_CHARS_MSG(100)),
})

export const updateProductSchema = createProductSchema.partial()

export const createVariantSchema = z.object({
  sku: z
    .string()
    .min(1, NONEMPTY_MSG)
    .max(50, MAX_CHARS_MSG(50))
    .regex(/^[a-zA-Z0-9-]+$/, 'Must be alphanumeric with dashes only'),
  variant_name: z.string().min(1, NONEMPTY_MSG).max(200, MAX_CHARS_MSG(200)),
  uom_id: z.string().max(50, MAX_CHARS_MSG(50)).optional(),
  retail_price: z
    .number()
    .min(0, 'Must be 0 or greater')
    .max(999999999, 'Too large')
    .optional(),
  wholesale_price: z
    .number()
    .min(0, 'Must be 0 or greater')
    .max(999999999, 'Too large')
    .optional(),
  distribution_price: z
    .number()
    .min(0, 'Must be 0 or greater')
    .max(999999999, 'Too large')
    .optional(),
})

export const updateVariantSchema = createVariantSchema.partial()

export const createWarehouseSchema = z.object({
  name: z.string().min(1, NONEMPTY_MSG).max(100, MAX_CHARS_MSG(100)),
  location: z.string().min(1, NONEMPTY_MSG).max(200, MAX_CHARS_MSG(200)),
})

export const updateWarehouseSchema = createWarehouseSchema.partial()
