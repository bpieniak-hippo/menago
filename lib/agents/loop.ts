import Anthropic from "@anthropic-ai/sdk";
import type { ToolUnion, MessageParam } from "@anthropic-ai/sdk/resources/messages";

// Realny, aktualny model Sonnet (w MENAGO_SPEC.md jako placeholder figuruje
// "claude-sonnet-5-5" — na dziś takiego modelu nie ma, więc używamy
// najnowszego dostępnego Sonneta; nadpisywalne przez env ANTHROPIC_MODEL).
export const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

interface RunToolLoopArgs {
  system: string;
  tools: ToolUnion[];
  execTool: (name: string, input: Record<string, unknown>) => Promise<unknown>;
  userPrompt: string;
  maxTurns?: number;
  model?: string;
}

/** Generyczna pętla tool-use na Anthropic Messages API, współdzielona przez agentów. */
export async function runToolLoop({
  system,
  tools,
  execTool,
  userPrompt,
  maxTurns = 6,
  model = DEFAULT_MODEL,
}: RunToolLoopArgs): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("Brak ANTHROPIC_API_KEY w konfiguracji.");
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const messages: MessageParam[] = [{ role: "user", content: userPrompt }];

  for (let turn = 0; turn < maxTurns; turn++) {
    const response = await client.messages.create({
      model,
      max_tokens: 1024,
      system,
      tools,
      messages,
    });

    if (response.stop_reason !== "tool_use") {
      const text = response.content
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim();
      return text || "(brak odpowiedzi)";
    }

    messages.push({ role: "assistant", content: response.content });

    const toolResults = await Promise.all(
      response.content
        .filter((b) => b.type === "tool_use")
        .map(async (block) => {
          const result = await execTool(
            block.name,
            block.input as Record<string, unknown>,
          );
          return {
            type: "tool_result" as const,
            tool_use_id: block.id,
            content: JSON.stringify(result),
          };
        }),
    );

    messages.push({ role: "user", content: toolResults });
  }

  return "Osiągnięto limit kroków — spróbuj doprecyzować polecenie.";
}
