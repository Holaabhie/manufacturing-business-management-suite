import { z } from "zod";

export const bankAccountTypeSchema = z.enum([
  "Current",
  "Savings",
  "OD",
  "CC",
  "Other",
]);

export const bankAccountStatusSchema = z.enum(["Active", "Closed"]);

export const amountModeSchema = z.enum(["separate", "signed", "indicator"]);

export const dateFormatSchema = z.enum([
  "DD/MM/YYYY",
  "DD/MM/YY",
  "DD-MM-YYYY",
  "DD-MMM-YYYY",
  "YYYY-MM-DD",
]);

export const csvMappingSchema = z.object({
  header_row_index: z.coerce.number().int().min(0).default(0),
  date_column: z.string().trim().min(1, "Date column is required"),
  narration_column: z.string().trim().min(1, "Narration column is required"),
  bank_ref_column: z.string().trim().optional().nullable(),
  cheque_no_column: z.string().trim().optional().nullable(),
  balance_column: z.string().trim().optional().nullable(),
  amount_mode: amountModeSchema,
  debit_column: z.string().trim().optional().nullable(),
  credit_column: z.string().trim().optional().nullable(),
  amount_column: z.string().trim().optional().nullable(),
  indicator_column: z.string().trim().optional().nullable(),
  date_format: dateFormatSchema,
});

export const createBankAccountSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Account name is required")
    .max(100, "Account name too long"),
  bank_name: z
    .string()
    .trim()
    .min(1, "Bank name is required")
    .max(100, "Bank name too long"),
  account_last4: z
    .string()
    .trim()
    .regex(/^\d{4}$/, "Must be exactly 4 digits"),
  ifsc: z
    .string()
    .trim()
    .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC code (e.g. HDFC0001234)")
    .optional()
    .nullable()
    .or(z.literal("")),
  account_type: bankAccountTypeSchema,
  opening_balance_paise: z.number().int().optional().nullable(),
  opening_balance_date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")
    .optional()
    .nullable()
    .or(z.literal("")),
});

export const updateBankAccountSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  ifsc: z
    .string()
    .trim()
    .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC code")
    .optional()
    .nullable()
    .or(z.literal("")),
  account_type: bankAccountTypeSchema.optional(),
  opening_balance_paise: z.number().int().optional().nullable(),
  opening_balance_date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable()
    .or(z.literal("")),
  status: bankAccountStatusSchema.optional(),
  mapping_profile: csvMappingSchema.optional().nullable(),
});

export const revertImportSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, "Revert reason is required")
    .max(500, "Revert reason cannot exceed 500 characters"),
});

export const matchLinkItemSchema = z.object({
  entity_type: z.enum(["payment", "vendor_bill_payment"]),
  entity_id: z.string().trim().min(1, "entity_id is required"),
});

export const createLinksSchema = z.object({
  links: z.array(matchLinkItemSchema).min(1, "At least one link is required"),
});

export const unlinkSchema = z.object({
  reason: z.string().trim().max(500, "Reason cannot exceed 500 characters").optional().nullable(),
});

export const excludeTransactionSchema = z.object({
  reason: z.enum(["Bank charges", "Interest", "Internal transfer", "Other"]),
  note: z.string().trim().max(500, "Note cannot exceed 500 characters").optional().nullable(),
});

export const acceptVarianceSchema = z.object({
  reason: z.enum(["TDS", "Bank charges", "Rounding", "Other"]),
});

export const candidateFilterSchema = z.object({
  direction: z.enum(["credit", "debit"]).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  min: z.coerce.number().optional(),
  max: z.coerce.number().optional(),
  q: z.string().optional(),
});

export type CreateBankAccountInput = z.infer<typeof createBankAccountSchema>;
export type UpdateBankAccountInput = z.infer<typeof updateBankAccountSchema>;
export type CsvMappingInput = z.infer<typeof csvMappingSchema>;
export type RevertImportInput = z.infer<typeof revertImportSchema>;
export type MatchLinkItemInput = z.infer<typeof matchLinkItemSchema>;
export type CreateLinksInput = z.infer<typeof createLinksSchema>;
export type UnlinkInput = z.infer<typeof unlinkSchema>;
export type ExcludeTransactionInput = z.infer<typeof excludeTransactionSchema>;
export type AcceptVarianceInput = z.infer<typeof acceptVarianceSchema>;
export type CandidateFilterInput = z.infer<typeof candidateFilterSchema>;

