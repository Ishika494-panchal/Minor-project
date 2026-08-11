import { z } from 'zod';

const challanItemInputSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  quantity: z.number().int().positive('Quantity must be a positive integer'),
});

export const createChallanSchema = z.object({
  customerId: z.string().min(1, 'Customer ID is required'),
  items: z.array(challanItemInputSchema).min(1, 'At least one product line item is required'),
  status: z.enum(['DRAFT', 'CONFIRMED']).default('DRAFT'),
});

export const updateChallanStatusSchema = z.object({
  status: z.enum(['DRAFT', 'CONFIRMED', 'CANCELLED']),
});

export type CreateChallanInput = z.infer<typeof createChallanSchema>;
export type UpdateChallanStatusInput = z.infer<typeof updateChallanStatusSchema>;
