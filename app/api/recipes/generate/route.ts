import Anthropic from "@anthropic-ai/sdk";
import { generateRecipesStream } from "@/lib/claude";
import { GenerateRecipeParamsSchema } from "@/lib/recipeSchema";
import { verifyFirebaseIdToken } from "@/lib/verifyIdToken";

// Node.js runtime is the default in Next.js 16 (the 'edge' runtime is
// deprecated), so no `export const runtime` override is needed here.

function mapClaudeError(err: unknown): string {
  if (err instanceof Anthropic.RateLimitError) {
    return "Recipe generation is rate-limited. Please try again shortly.";
  }
  if (err instanceof Anthropic.AuthenticationError) {
    return "Recipe generation is misconfigured.";
  }
  if (err instanceof Anthropic.APIError) {
    return err.message;
  }
  return "Recipe generation failed.";
}

function unauthorized(): Response {
  return new Response(
    JSON.stringify({ type: "error", message: "Unauthorized." }),
    { status: 401, headers: { "Content-Type": "application/json" } }
  );
}

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  const idToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;
  if (!idToken) {
    return unauthorized();
  }
  try {
    await verifyFirebaseIdToken(idToken);
  } catch {
    return unauthorized();
  }

  const body = await req.json().catch(() => null);
  const parsed = GenerateRecipeParamsSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ type: "error", message: "Invalid request." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      };
      try {
        const claudeStream = generateRecipesStream(parsed.data);
        for await (const event of claudeStream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            send({ type: "text", text: event.delta.text });
          }
        }
        send({ type: "done" });
      } catch (err) {
        send({ type: "error", message: mapClaudeError(err) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
