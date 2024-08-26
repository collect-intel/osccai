"use server";
import Anthropic from "@anthropic-ai/sdk";
// import type { Tool } from "@anthropic-ai/sdk/resources";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import type { Poll, VoteValue } from "@prisma/client";
import { init as initCuid } from "@paralleldrive/cuid2";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import slugify from "slugify";

const max_tokens = 2048;
const model = "claude-3-5-sonnet-20240620";
const defaultTemperature = 0.5;
const systemPrompt = `Your goal is to separate the user's input into a list of statements. You should use one of the tools available to you to respond to the user: use "response_with_separated_statements" if you're able to accomplish the task, otherwise use "refusal" to tell the user why you're unable to complete the task.`;

// According to the [CUID docs](https://github.com/paralleldrive/cuid2), there's a 50% chance of a collision after sqrt(36^(n-1) * 26) IDs, so this has a good chance of a collision after a few million IDs. We should check for collisions but we don't currently.
const createId = initCuid({ length: 10 });

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

export async function createPoll() {
  const supabase = createClient();
  const uid = createId();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (!user) {
    console.error("createPoll error", error);
    redirect("/error");
  }
  const urlSlug = "new";
  await prisma.poll.create({
    data: { uid, urlSlug, creatorId: user.id, published: false },
  });
  revalidatePath("/");
  redirect(`/${uid}/${urlSlug}/create`);
}

export async function editPoll(
  uid: string,
  data: {
    title?: string;
    description?: string;
    published?: boolean;
    requireSMS?: boolean;
    allowParticipantStatements?: boolean;
  },
): Promise<Poll> {
  const urlSlug = data.title
    ? slugify(data.title || "", { lower: true })
    : undefined;
  const updatedPoll = await prisma.poll.update({
    where: { uid },
    data: {
      ...data,
      ...(urlSlug ? { urlSlug } : {}),
    },
  });
  revalidatePath(`/${uid}`);
  return updatedPoll;
}

type Tool = (typeof anthropic.messages.create.arguments)["tools"][0];

async function separateStatements(
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

async function getParticipantId() {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (!user) {
    console.error("createPoll error", error);
    redirect("/error");
  }
  return user.id;
}

export async function publishPoll(uid: string, statementsStr: string) {
  const [separatedStatements, participantId] = await Promise.all([
    separateStatements(statementsStr),
    getParticipantId(),
    prisma.poll.update({
      where: { uid },
      data: { published: true },
    }),
  ]);
  await prisma.statement.createMany({
    data: separatedStatements.map((text) => ({
      pollId: uid,
      text,
      participantId,
    })),
  });
  revalidatePath(`/poll/${uid}`);
}

export async function submitStatement(pollId: string, text: string) {
  await prisma.statement.create({
    data: { pollId, text, participantId: await getParticipantId() },
  });
  revalidatePath(`/poll/${pollId}`);
}

export async function flagStatement(statementId: string) {
  await prisma.flag.create({
    data: {
      statementId,
      participantId: await getParticipantId(),
    },
  });
}

export async function submitVote(statementId: string, voteValue: VoteValue) {
  await prisma.vote.create({
    data: { statementId, voteValue, participantId: await getParticipantId() },
  });
}
