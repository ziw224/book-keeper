import { z } from 'zod'

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
  type: z.enum(['credit', 'debit']).default('credit'),
  statementCloseDay: z.number().int().min(1).max(31).nullable().optional(),
  paymentDueDay: z.number().int().min(1).max(31).nullable().optional(),
}).superRefine((data, ctx) => {
  if (data.type === 'credit') {
    if (data.statementCloseDay == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Statement close day is required for credit cards (1–31)',
        path: ['statementCloseDay'],
      })
    }
  } else {
    data.statementCloseDay = null
    data.paymentDueDay = null
  }
})

export const cardUpdateSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  issuer: z.string().min(1, 'Issuer is required').optional(),
  last4: z.string().length(4, 'Must be exactly 4 characters').optional(),
  type: z.enum(['credit', 'debit']).optional(),
  statementCloseDay: z.number().int().min(1).max(31).nullable().optional(),
  paymentDueDay: z.number().int().min(1).max(31).nullable().optional(),
}).superRefine((data, ctx) => {
  if (data.type === 'credit' && data.statementCloseDay === null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Statement close day is required for credit cards (1–31)',
      path: ['statementCloseDay'],
    })
  }
  if (data.type === 'debit') {
    data.statementCloseDay = null
  }
})

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
