import { z } from 'zod'
import { SUGGESTED_CATEGORIES } from '@/lib/categories'

const dateRegex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/

function isValidDate(s: string): boolean {
  if (!dateRegex.test(s)) return false
  const [y, m, d] = s.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
}

export const cardCreateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  issuer: z.string().min(1, 'Issuer is required'),
  last4: z.string().length(4, 'Must be exactly 4 characters'),
  statementCloseDay: z.number().int().min(1).max(31),
})

export const cardUpdateSchema = cardCreateSchema.partial()

export const transactionCreateSchema = z.object({
  cardId: z.string().min(1),
  date: z.string().refine(isValidDate, 'Invalid date (YYYY-MM-DD)'),
  merchant: z.string().min(1, 'Merchant is required'),
  amountCents: z.number().int(),
  category: z.string().min(1, 'Category is required'),
  notes: z.string().optional().nullable(),
})

export const transactionUpdateSchema = transactionCreateSchema.partial()

export const transactionFilterSchema = z.object({
  cardId: z.string().optional(),
  cycle: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Cycle must be YYYY-MM').optional(),
  category: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
  offset: z.coerce.number().int().min(0).optional(),
  sort: z.enum(['date_asc', 'date_desc', 'amount_asc', 'amount_desc']).optional(),
})
