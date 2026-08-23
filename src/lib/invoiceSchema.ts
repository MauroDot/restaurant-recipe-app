import { z } from "zod";

// Client-safe — no Anthropic SDK import here, so this can be imported from
// both server-only code (src/lib/invoiceOcr.ts) and Client Components.

export const InvoiceLineItemParseSchema = z.object({
  itemName: z.string(),
  quantity: z.number().positive(),
  unit: z.string(),
  unitPrice: z.number().nonnegative(),
  lineCost: z.number().nonnegative(),
  notes: z.string().nullable(),
});

/**
 * Shape Claude Vision must return. `supplier`/`invoiceDate`/`total` are
 * nullable (not optional) — structured-output schemas want every key
 * present, and null means "Claude couldn't confidently read this on the
 * invoice." The review UI requires the chef to fill in any null field
 * before Confirm & Save is enabled.
 */
export const InvoiceParseResultSchema = z.object({
  supplier: z.string().nullable(),
  /** ISO yyyy-mm-dd, or null if unreadable. */
  invoiceDate: z.string().nullable(),
  total: z.number().nullable(),
  lineItems: z.array(InvoiceLineItemParseSchema),
  /** Full verbatim transcription of the invoice text. */
  rawText: z.string(),
  parsedErrors: z.array(z.string()),
});
export type InvoiceParseResult = z.infer<typeof InvoiceParseResultSchema>;

export const ALLOWED_INVOICE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "application/pdf",
] as const;
export type InvoiceMimeType = (typeof ALLOWED_INVOICE_MIME_TYPES)[number];

/** 10MB, matching the original (pre-base64) file size limit. */
export const MAX_INVOICE_FILE_BYTES = 10 * 1024 * 1024;

/** Shared by the client fetch call and the route handler's input validation. */
export const ParseInvoiceRequestSchema = z.object({
  base64Data: z.string().min(1),
  mimeType: z.enum(ALLOWED_INVOICE_MIME_TYPES),
});
export type ParseInvoiceRequest = z.infer<typeof ParseInvoiceRequestSchema>;
