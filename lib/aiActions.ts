import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const max_tokens = 2048;
const model = "claude-3-5-sonnet-20240620";
const defaultTemperature = 0.5;
const systemPrompt = `Your goal is to separate the user's input into a list of statements. You should use one of the tools available to you to respond to the user: use "response_with_separated_statements" if you're able to accomplish the task, otherwise use "refusal" to tell the user why you're unable to complete the task.`;

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY_OSCCAI_MVP,
});

const refusalTool: Tool = {
  name: "refusal",
  description:
    "Give reasoning for not generating a response. The reason will be shown to the user, and it should help them to reformulate their input.",
  input_schema: {
    type: "object",
    properties: {
      reason: { type: "string" },
    },
    required: ["reason"],
  },
};

const separateStatementsTool: Tool = {
  name: "response_with_separated_statements",
  description: `Respond to the user with a list of separate statements which have been identified from the input. Each statement should be put in the form "The AI should...". For example, given the input "The AI should prioritize the interests of the collective or common good over individual preferences or rights, The AI should be helpful, Be honest, Be harmless" a good response would be ["The AI should prioritize the interests of the collective or common good over individual preferences or rights", The AI should be helpful", "The AI should be honest", "The AI should be harmless"].`,
  input_schema: {
    type: "object",
    properties: {
      statements: {
        type: "array",
        items: {
          type: "string",
          description: "A statement.",
        },
      },
    },
    required: ["statements"],
  },
};

const separatedStatementsSchema = z.object({
  statements: z.array(z.string()),
});

export async function separateStatements(
  statementsStr: string,
  temperature = defaultTemperature,
): Promise<string[]> {
  const message = await anthropic.messages.create({
    max_tokens,
    system: systemPrompt,
    messages: [{ role: "user", content: statementsStr }],
    tools: [separateStatementsTool, refusalTool],
    tool_choice: { type: "any" },
    model,
    temperature,
  });

  if (message.content.length !== 1) {
    console.warn(
      `Expected exactly one message from Claude, got ${String(message.content)}`,
    );
  }

  for (const content of message.content) {
    if (content.type === "tool_use") {
      const { name, input } = content;
      const json = input as JSON;
      if (name === "refusal") {
        const { reason } = json as any as { reason: string };
        console.log("Refusal reason:", reason);
        return [];
      } else {
        const { statements } = separatedStatementsSchema.parse(json);
        return statements;
      }
    } else {
      console.warn(`Unexpected content type ${content.type}`);
    }
  }

  console.log("No response from Claude");
  return [];
}

export async function generateStatementsFromIdea(initialIdea: string): Promise<string[]> {
  return [
    "The AI should prioritize the interests of the collective or common good over individual preferences or rights",
    "The AI should be helpful",
    "Be honest",
    "Be harmless" 
  ]
}

export async function generateSimpleConstitution(initialIdea: string): Promise<string> {
  // For now, we'll just return an all-caps version of the initial idea
  return `CONSTITUTION:

${initialIdea.toUpperCase()}`;
}