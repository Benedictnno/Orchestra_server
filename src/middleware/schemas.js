/**
 * Zod validation schemas for all request bodies.
 * Import the schema you need into the relevant route file and wrap with validate().
 */
import { z } from 'zod'

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const registerSchema = z.object({
  name:         z.string().min(2, 'Name must be at least 2 characters'),
  email:        z.string().email('Invalid email address'),
  password:     z.string().min(8, 'Password must be at least 8 characters'),
  role:         z.enum(['individual', 'business']).default('individual'),
  businessName: z.string().optional(),
}).refine(
  data => data.role !== 'business' || !!data.businessName,
  { message: 'businessName is required for business accounts', path: ['businessName'] }
)

export const loginSchema = z.object({
  email:    z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

// ─── Cards ────────────────────────────────────────────────────────────────────

export const addCardSchema = z.object({
  pan:         z.string().min(13).max(19),
  expiryDate:  z.string().regex(/^\d{4}$/, 'expiryDate must be YYMM e.g. 2612'),
  issuerNr:    z.string().min(1),
  firstName:   z.string().optional(),
  lastName:    z.string().optional(),
  nameOnCard:  z.string().optional(),
  cardProgram: z.enum(['VERVE', 'VISA', 'MASTERCARD']).optional(),
  customerId:  z.string().optional(),
  cardStatus:  z.enum(['0', '1', '2']).default('1'),
  seqNr:       z.string().optional(),
  cardType:    z.enum(['debit', 'prepaid']),
  label:       z.string().optional(),
  bank:        z.string().optional(),
  color:       z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'color must be a hex code').optional(),
  isDefault:   z.boolean().default(false),
  spendLimit:  z.number().int().positive().optional(),
})

export const updateCardSchema = addCardSchema.partial()

// ─── Routing ──────────────────────────────────────────────────────────────────

export const upsertRoutingSchema = z.object({
  mode:          z.enum(['primary', 'balanced', 'auto-split']),
  primaryCardId: z.string().optional(),
  cardOrder:     z.array(z.string()).optional(),
})

export const simulateRoutingSchema = z.object({
  amount:   z.number().int().positive('amount must be a positive integer in kobo'),
  merchant: z.string().optional(),
  category: z.enum(['food', 'transport', 'subscriptions', 'utilities',
                    'entertainment', 'shopping', 'other']).optional(),
  save:     z.boolean().default(false),
})

// ─── Transactions ─────────────────────────────────────────────────────────────

export const createTransactionSchema = z.object({
  amount:          z.number().int().positive('amount must be positive kobo'),
  merchant:        z.string().optional(),
  merchantCategory: z.string().optional(),
  category:        z.enum(['food', 'transport', 'subscriptions', 'utilities',
                            'entertainment', 'shopping', 'other']).optional(),
  narration:       z.string().optional(),
  transactionDate: z.string().datetime().optional(),
  // Optional override — if omitted, routing engine picks the card
  cardId:          z.string().optional(),
})

// ─── Virtual Cards ────────────────────────────────────────────────────────────

export const createVirtualCardSchema = z.object({
  parentCardId: z.string().min(1),
  label:        z.string().min(1),
  merchant:     z.string().optional(),
  spendLimit:   z.number().int().positive('spendLimit must be positive kobo'),
  autoRenew:    z.boolean().default(true),
})

// ─── Business ─────────────────────────────────────────────────────────────────

export const createBusinessCardSchema = z.object({
  assignedTo:         z.string().optional(),
  purpose:            z.string().optional(),
  budget:             z.number().int().positive('budget must be positive kobo'),
  merchantCategories: z.array(z.string()).optional(),
  expiresAt:          z.string().datetime().optional(),
  approvalThreshold:  z.number().int().positive().optional(),
})

// ─── Report ───────────────────────────────────────────────────────────────────

export const reportSchema = z.object({
  from:   z.string().datetime('from must be an ISO date string'),
  to:     z.string().datetime('to must be an ISO date string'),
  format: z.enum(['json', 'csv', 'pdf']).default('json'),
})

// ─── Business ─────────────────────────────────────────────────────────────────

export const approvalSchema = z.object({
  requestId: z.string().min(1, 'requestId is required'),
  action:    z.enum(['approve', 'reject']),
  note:      z.string().optional(),
})
