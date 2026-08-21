"use server";

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { GenerateRecipesInput, GeneratedRecipe } from "@/src/lib/types";

const SYSTEM_PROMPT = `You are a Michelin-trained chef with 20 years of experience. Generate restaurant-quality recipes that:
1. Use ONLY the provided ingredients
2. Stay within the target food cost
3. Match the specified cuisine and style
4. Are feasible in a busy kitchen

Format as valid JSON array of recipe objects.`;

const MODEL = "claude-3-5-haiku-20241022";

const RecipeIngredientSchema = z.object({
  itemName: z.string(),
  quantity: z.number(),
  unit: z.enum(["lb", "oz", "cup", "tbsp", "tsp", "pinch"]),
  costPerUnit: z.number(),
  trimLoss: z.number(),
});

const GeneratedRecipeSchema = z.object({
  name: z.string(),
  ingredients: z.array(RecipeIngredientSchema),
  instructions: z.string(),
  cookingTime: z.number(),
  difficulty: z.enum(["easy", "medium", "hard"]),
  whyTheseIngredients: z.string(),
  platingSuggestions: z.string(),
});

const GeneratedRecipesSchema = z.object({
  recipes: z.array(GeneratedRecipeSchema).min(3).max(5),
});

function buildUserPrompt(input: GenerateRecipesInput): string {
  return `Generate 3 to 5 recipes using this brief:
- Available ingredients: ${input.availableIngredients.join(", ")}
- Target food cost per portion: $${input.targetCost}
- Cuisine: ${input.cuisine}
- Dish type: ${input.dishType}
- Style: ${input.style}`;
}

export async function generateRecipes(
  input: GenerateRecipesInput,
): Promise<GeneratedRecipe[]> {
  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) {
    console.error("generateRecipes: CLAUDE_API_KEY is not set.");
    return [];
  }

  try {
    const client = new Anthropic({ apiKey });

    // Generating 3-5 detailed recipes can take a while on this model — stream instead
    // of a plain non-streaming request so a slow generation doesn't risk hitting an
    // HTTP request timeout. output_config.format still yields a parsed final message.
    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserPrompt(input) }],
      output_config: {
        format: zodOutputFormat(GeneratedRecipesSchema),
      },
    });
    const response = await stream.finalMessage();

    if (!response.parsed_output) {
      console.error("generateRecipes: Claude response failed schema validation.");
      return [];
    }

    return response.parsed_output.recipes;
  } catch (error) {
    console.error("generateRecipes: failed to generate recipes:", error);
    return [];
  }
}
