import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

// Define our own Tool type
interface Tool {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: {
      [key: string]: {
        type: string;
        description?: string;
      };
    };
    required: string[];
  };
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