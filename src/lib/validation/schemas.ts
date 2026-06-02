import { z } from 'zod'

const NONEMPTY_MSG = 'This field is required'
const NONNEGATIVE_MSG = 'Must be 0 or greater'
const BIG_NUMBER_MSG = 'Too large'
const MAX_CHARS_MSG = (max: number) => `Must be ${max} characters or less`

const FILTER_OPERATORS = [
  'eq',
  'neq',
  'contains',
  'gt',
  'lt',
  'gte',
  'lte',
  'between',
] as const
export const filterOperatorSchema = z.enum(FILTER_OPERATORS)
type FilterOperator = z.infer<typeof filterOperatorSchema>

const SORT_DIRECTION = ['asc', 'desc'] as const
export const sortDirectionSchema = z.enum(SORT_DIRECTION)
type SortDirection = z.infer<typeof sortDirectionSchema>

const TAB_TYPE = [
  'dashboard',
  'new-tab',
  'sales-invoice',
  'purchase-invoice',
  'entity',
] as const
export const tabTypeSchema = z.enum(TAB_TYPE)
type TabType = z.infer<typeof tabTypeSchema>

const THEME = ['light', 'dark', 'system'] as const
export const themeSchema = z.enum(THEME)
type Theme = z.infer<typeof themeSchema>

const LANGUAGE = ['ar', 'en'] as const
export const languageSchema = z.enum(LANGUAGE)
type Language = z.infer<typeof languageSchema>

export const filterValueSchema = z.union([
  z.string(),
  z.number(),
  z.tuple([z.number(), z.number()]),
])

export const filterStateSchema = z.object({
  column_id: z.string().min(1),
  operator: filterOperatorSchema,
  value: filterValueSchema,
})

export const sortStateSchema = z.object({
  column_id: z.string().min(1),
  direction: sortDirectionSchema,
})

export function paginatedResponseSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    data: z.array(dataSchema),
    totalCount: z.number().int().min(0),
    totalPages: z.number().int().min(1),
  })
}

export const tabSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  type: tabTypeSchema,
  closable: z.boolean(),
  entityType: z.string().optional(),
})

export const userPreferencesSchema = z.object({
  language: languageSchema,
  theme: themeSchema.optional(),
  dateFormat: z.string().optional(),
})

export const appPreferencesSchema = z.object({
  theme: z.string().min(1),
  quick_pane_shortcut: z.string().nullable(),
  language: z.string().nullable(),
})

export const userSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  email: z.email(),
  role: z.string().min(1),
  avatar_url: z.string().nullable(),
})

export const stockLevelSchema = z.object({
  variant_id: z.string().min(1),
  warehouse_id: z.string().min(1),
  quantity: z.number().int().min(0),
})

export const stockMovementSchema = z.object({
  id: z.string().min(1),
  variant_id: z.string().min(1),
  from_warehouse_id: z.string().nullable(),
  to_warehouse_id: z.string().nullable(),
  quantity: z.number().int(),
  movement_type: z.string().min(1),
  created_at: z.string().min(1),
})

export const columnInfoSchema = z.object({
  cid: z.number().int(),
  name: z.string().min(1),
  col_type: z.string().min(1),
  notnull: z.boolean(),
  dflt_value: z.string().nullable(),
  pk: z.boolean(),
})

export const tableInfoSchema = z.object({
  table_name: z.string().min(1),
  columns: z.array(columnInfoSchema),
})

export const recoveryErrorSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('FileNotFound') }),
  z.object({ type: z.literal('ValidationError'), message: z.string() }),
  z.object({ type: z.literal('DataTooLarge'), max_bytes: z.number().int() }),
  z.object({ type: z.literal('IoError'), message: z.string() }),
  z.object({ type: z.literal('ParseError'), message: z.string() }),
])

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
    .min(0, NONNEGATIVE_MSG)
    .max(999999, BIG_NUMBER_MSG)
    .optional(),
  wholesale_price: z
    .number()
    .min(0, NONNEGATIVE_MSG)
    .max(999999, BIG_NUMBER_MSG)
    .optional(),
  distribution_price: z
    .number()
    .min(0, NONNEGATIVE_MSG)
    .max(999999, BIG_NUMBER_MSG)
    .optional(),
})

export const updateVariantSchema = createVariantSchema.partial()

export const createWarehouseSchema = z.object({
  name: z.string().min(1, NONEMPTY_MSG).max(100, MAX_CHARS_MSG(100)),
  location: z.string().min(1, NONEMPTY_MSG).max(200, MAX_CHARS_MSG(200)),
})

export const updateWarehouseSchema = createWarehouseSchema.partial()
