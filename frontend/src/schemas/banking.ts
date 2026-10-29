import { z } from 'zod';

// Define the TransactionSchema based on the backend's Python schema
export const TransactionSchema = z.object({
  id: z.string().uuid(),
  connected_account_id: z.string().uuid(),
  provider_transaction_id: z.string().optional(),
  transaction_timestamp: z.string(),
  amount: z.number(),
  transaction_type: z.string(),
  narration: z.string().optional(),
  transaction_mode: z.string().optional(),
  balance_after_transaction: z.number().nullable().optional(),
  category: z.string().optional(),
  classification: z.string().optional(),
  classification_status: z.string(),
  confidence: z.number().optional(),
  classification_source: z.string().optional(),
  merchant_name: z.string().optional(),
  source: z.string(),
  reference_number: z.string().optional(),
  user_classification: z.string().optional(),
  transfer_reference_id: z.string().optional()
});

// Type for the schema
export type TransactionSchemaType = z.infer<typeof TransactionSchema>;
