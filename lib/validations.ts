import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Email invalide').max(255),
  password: z.string().min(1, 'Mot de passe requis').max(100),
  totpCode: z.union([z.string().length(6), z.literal('')]).optional(),
})

export const assetSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  type: z.enum(['BANK_ACCOUNT', 'SAVINGS', 'REAL_ESTATE', 'STOCK', 'CRYPTO', 'OTHER']),
  institution: z.string().max(100).optional().nullable(),
  value: z.coerce.number().min(0).max(1_000_000_000),
  currency: z.enum(['EUR', 'USD', 'GBP', 'CHF']).default('EUR'),
  notes: z.string().max(500).optional().nullable(),
})

export const goalSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  targetValue: z.coerce.number().min(1).max(1_000_000_000),
  currency: z.enum(['EUR', 'USD', 'GBP', 'CHF']).default('EUR'),
  targetDate: z.string().nullable().optional(),
  notes: z.string().max(500).optional().nullable(),
})

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(8, 'Minimum 8 caractères')
    .regex(/[A-Z]/, 'Doit contenir une majuscule')
    .regex(/[0-9]/, 'Doit contenir un chiffre')
    .max(100),
})

export const totpVerifySchema = z.object({
  code: z.string().length(6, 'Code à 6 chiffres requis'),
})
