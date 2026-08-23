import Anthropic from "@anthropic-ai/sdk";
import { parseInvoiceWithClaudeVision } from "@/lib/invoiceOcr";
import {
  InvoiceParseResultSchema,
  ParseInvoiceRequestSchema,
  MAX_INVOICE_FILE_BYTES,
} from "@/lib/invoiceSchema";
import { verifyFirebaseIdToken } from "@/lib/verifyIdToken";

// Cheap insurance against Vercel's default serverless timeout — no NDJSON
// streaming pipeline needed here since a single invoice's response is small
// and bounded, unlike the multi-recipe generation route.
export const maxDuration = 60;

function mapClaudeError(err: unknown): string {
  if (err instanceof Anthropic.RateLimitError) {
    return "Invoice parsing is rate-limited. Please try again shortly.";
  }
  if (err instanceof Anthropic.AuthenticationError) {
    return "Invoice parsing is misconfigured.";
  }
  if (err instanceof Anthropic.APIError) {
    return err.message;
  }
  return "Invoice parsing failed.";
}

function unauthorized(): Response {
  return new Response(
    JSON.stringify({ type: "error", message: "Unauthorized." }),
    { status: 401, headers: { "Content-Type": "application/json" } }
  );
}

function badRequest(message: string): Response {
  return new Response(JSON.stringify({ type: "error", message }), {
    status: 400,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  const idToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;
  if (!idToken) return unauthorized();
  try {
    await verifyFirebaseIdToken(idToken);
  } catch {
    return unauthorized();
  }

  const body = await req.json().catch(() => null);
  const parsed = ParseInvoiceRequestSchema.safeParse(body);
  if (!parsed.success) return badRequest("Invalid request.");

  // Defensive server-side size check — the client enforces this pre-upload,
  // but this route accepts a raw base64 payload from any caller with a
  // valid token, so re-verify here rather than trusting the client alone.
  // Base64 encodes 3 bytes as 4 characters, so decoded size ≈ length * 3/4.
  const approxDecodedBytes = (parsed.data.base64Data.length * 3) / 4;
  if (approxDecodedBytes > MAX_INVOICE_FILE_BYTES) {
    return badRequest("File too large.");
  }

  try {
    const rawText = await parseInvoiceWithClaudeVision(parsed.data);
    const validated = InvoiceParseResultSchema.parse(JSON.parse(rawText));
    return new Response(JSON.stringify({ type: "result", data: validated }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Invoice parse failed:", err);
    const message =
      err instanceof Anthropic.APIError
        ? mapClaudeError(err)
        : "Invoice parsing returned unexpected data.";
    return new Response(JSON.stringify({ type: "error", message }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
}
