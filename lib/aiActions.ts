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
  initialIdea: string,
): Promise<string[]> {
  return [
    "The AI should prioritize the interests of the collective or common good over individual preferences or rights",
    "The AI should be helpful",
    "Be honest",
    "Be harmless",
  ];
}

export async function generateSimpleConstitution(
  initialIdea: string,
): Promise<string> {
  console.log("XMLLM", xmllm, process.env);

  const stream = await xmllm(
    ({
      promptClosed,
    }: {
      promptClosed: (prompt: string, schema: any) => void;
    }) => {
      return [
        // pipeline
        promptClosed(
          `
        Generate a brief principle-based and behavioural 
        in the form of a list of "The AI should..." statements.

        The constitution is for a community that is described thus: ${initialIdea}

        Return the constitution in XML <constitution> element.
      `,
          {
            constitution: String,
          },
        ),
      ];
    },
  );

  const constitution = (await stream.next()).value?.constitution;

  if (!constitution) {
    console.error("No constitution generated, using default");

    return (
      'Behave in a way aligned with the best interests of a community described thus: "' +
      initialIdea +
      '"'
    );
  }

  return constitution;
}
