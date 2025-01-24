import {
  ClientProvider,
  xmllm,
  configure as xmllmConfigure,
} from "xmllm/client";
import { MessageWithFields } from "./types";

const proxyUrl =
  process.env.NEXT_PUBLIC_PROXY_API_URL || "https://proxyai.cip.org/api/stream";
const clientProvider = new ClientProvider(proxyUrl);

// Configure xmllm with the client provider
xmllmConfigure({
  clientProvider,
});

export function genSystemPrompt(constitutionText: string): string {
  // Copy the system prompt generation logic from ConstitutionalAIChat.tsx
  if (!constitutionText.trim()) {
    return "Be a helpful AI assistant";
  }

  return `
Main system prompt:

=== IMPORTANT ===
Here is a constitution of your values that you will self-reflect on prior to every response:
=== CONSTITUTION ===
${constitutionText}
=== END CONSTITUTION ===

You will reply in <draft_response/>, then <response_metrics/>, <improvement_strategy>, then finally <final_response/> which will internalize and improve upon the analysis.

You will embody the values of the constitution in your final response. You will ensure that you don't overly insert the community into the response; answer the user's question directly.
`.trim();
}

export async function processAIResponse({
  messages,
  systemPrompt,
  temperature = 0.7,
  maxTokens,
}: {
  messages: any[];
  systemPrompt: string;
  temperature?: number;
  maxTokens?: number;
}) {
  const stream = await xmllm(({ prompt }: { prompt: any }) => {
    return [
      prompt({
        model: ["claude:good", "openai:good", "claude:fast", "openai:fast"],
        messages,
        schema: {
          thinking: String,
          draft_response: String,
          response_metrics: String,
          improvement_strategy: String,
          final_response: String,
        },
        system: systemPrompt,
        temperature,
        max_tokens: maxTokens,
      }),
      function* (t: any) {
        yield { role: "assistant", ...t };
      },
    ];
  }, clientProvider);

  let response = { role: "assistant" } as MessageWithFields;
  for await (const chunk of stream) {
    if (typeof chunk === "string") {
      response.content = (response.content || "") + chunk;
    } else {
      Object.assign(response, chunk);
    }
  }

  return response;
}
