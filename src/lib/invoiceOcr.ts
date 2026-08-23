import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { InvoiceParseResultSchema, type InvoiceMimeType } from "@/lib/invoiceSchema";

const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });

const SYSTEM_PROMPT = `You are an expert at reading restaurant supplier invoices \
(from suppliers like Sysco, US Foods, local produce/butcher/dairy vendors). \
Extract every line item exactly as printed. For each line item, record itemName, \
quantity, unit (e.g. lb, case, each, gal), unitPrice, and lineCost. If a printed \
lineCost doesn't equal quantity * unitPrice, trust the printed lineCost and note \
the discrepancy in parsedErrors rather than silently correcting it. Also record \
the supplier name, invoice date (ISO yyyy-mm-dd), and invoice total if legible — \
use null for any of those three you cannot confidently read. Put a full verbatim \
transcription of all invoice text in rawText. List anything you were unsure about, \
couldn't read, or had to guess at in parsedErrors as short human-readable strings.`;

export type InvoiceVisionInput = {
  base64Data: string;
  mimeType: InvoiceMimeType;
};

/**
 * Calls Claude Vision to extract structured line items from an invoice
 * image or PDF. Non-streaming — a single invoice's line items are a small,
 * bounded response, unlike the multi-recipe generation that needs
 * streaming to avoid a Vercel idle-connection timeout.
 *
 * Returns the raw text response; the caller (the route handler) is
 * responsible for JSON.parse + InvoiceParseResultSchema.parse — never trust
 * the structured-output constraint alone.
 */
export async function parseInvoiceWithClaudeVision(
  input: InvoiceVisionInput
): Promise<string> {
  const contentBlock =
    input.mimeType === "application/pdf"
      ? ({
          type: "document" as const,
          source: {
            type: "base64" as const,
            media_type: "application/pdf" as const,
            data: input.base64Data,
          },
        } satisfies Anthropic.DocumentBlockParam)
      : ({
          type: "image" as const,
          source: {
            type: "base64" as const,
            media_type: input.mimeType,
            data: input.base64Data,
          },
        } satisfies Anthropic.ImageBlockParam);

  const message = await client.messages.create({
    model: "claude-opus-5",
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    output_config: { format: zodOutputFormat(InvoiceParseResultSchema) },
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          contentBlock,
          { type: "text", text: "Extract every line item from this invoice." },
        ],
      },
    ],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude returned no text content.");
  }
  return textBlock.text;
}
