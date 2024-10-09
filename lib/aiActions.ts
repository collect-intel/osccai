"use server";

import xmllm from "xmllm";

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

export async function generateStatementsFromIdea(
  goal: string,
  bio: string,
): Promise<string[]> {
  const stream = await xmllm(({ promptClosed }: { promptClosed: any }) => {
    return [
      promptClosed({
        model: "claude:good",
        messages: [
          {
            role: "user",
            content: `
              Generate a list of 5 to 10 core principles for a community AI model based on the following description:

              Goal: ${goal}
              Bio: ${bio}

              Each principle should be a concise statement starting with "The AI should...".
              Return the principles as an XML list of <principle> elements.
            `,
          },
        ],
        schema: {
          principles: {
            principle: [String],
          },
        },
      }),
    ];
  });

  const result = (await stream.next()).value;
  const principles = result?.principles?.principle || [];

  if (!principles || principles.length === 0) {
    console.error("No principles generated, using default");
    return [
      "The AI should prioritize the interests of the collective or common good over individual preferences or rights",
      "The AI should be helpful",
      "The AI should be honest",
      "The AI should be harmless",
      "The AI should respect privacy and data protection",
    ];
  }

  return principles;
}
