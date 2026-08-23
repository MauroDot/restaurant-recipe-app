import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { RecipesResponseSchema } from "@/lib/recipeSchema";

const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });

export type GenerateRecipesInput = {
  availableIngredients: { name: string; unit: string }[];
  /** Target food cost PER PORTION, in dollars. */
  targetCost: number;
  /** Fixed portion count — an input, not something the model chooses. */
  servings: number;
  cuisine: string;
  dishType: string;
  style: string;
};

/**
 * Streams a Claude-generated set of exactly 3 recipes constrained to the
 * given ingredient catalog. Cost is never requested from or trusted from the
 * model — only ingredient name/quantity/unit are generated; costing is
 * computed afterward from our own catalog data (see src/lib/pricing.ts).
 */
export function generateRecipesStream(input: GenerateRecipesInput) {
  const ingredientList = input.availableIngredients
    .map((i) => `- ${i.name} (unit: ${i.unit})`)
    .join("\n");

  const system =
    "You are a professional recipe developer for a restaurant kitchen. " +
    "You design dishes strictly from a provided ingredient catalog and never invent ingredients.";

  const totalTarget = input.targetCost * input.servings;
  const userPrompt = `Generate exactly 3 distinct ${input.dishType} recipes.
Cuisine: ${input.cuisine}
Style: ${input.style}

Each recipe must yield EXACTLY ${input.servings} portions. Target ingredient
cost is $${input.targetCost.toFixed(2)} per portion — since this recipe yields
${input.servings} portions, that means total ingredient cost across the whole
recipe (all ${input.servings} portions combined, summing every ingredient
line) should be approximately $${input.targetCost.toFixed(2)} x ${input.servings} =
$${totalTarget.toFixed(2)}. Scale ingredient quantities so the recipe actually
serves ${input.servings} — do not design a single-portion dish and label it
as ${input.servings} servings, and do not design a recipe with total cost
near $${input.targetCost.toFixed(2)} while only yielding one portion. Aim
your ingredient quantities at the ${input.servings}-portion total, not the
per-portion figure.

Choose every ingredient name EXACTLY as written from the list below, and specify
quantity in the unit given for that ingredient — quantities should be the
amount needed for the FULL ${input.servings}-portion recipe, not a single
portion. Do not invent ingredients that are not on this list. Do not include
any cost or price information in your response — only ingredient name,
quantity, and unit.

Available ingredients:
${ingredientList}`;

  return client.messages.stream({
    model: "claude-opus-5",
    max_tokens: 32000,
    thinking: { type: "adaptive" },
    output_config: { format: zodOutputFormat(RecipesResponseSchema) },
    system,
    messages: [{ role: "user", content: userPrompt }],
  });
}
