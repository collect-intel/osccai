"use server";
import Anthropic from "@anthropic-ai/sdk";
// import type { Tool } from "@anthropic-ai/sdk/resources";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from 'next/headers';
import { prisma } from "@/lib/db";
import type { Poll, VoteValue as VoteValueType } from "@prisma/client";
import { VoteValue } from "@prisma/client";
import { init as initCuid } from "@paralleldrive/cuid2";
import slugify from "slugify";
import { stringify } from "csv-stringify/sync";
import { createStreamableValue } from "ai/rsc";
import { CoreMessage, streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { currentUser } from '@clerk/nextjs/server'

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

export async function createPoll(communityModelId: string) {
  const user = await currentUser();
  if (!user) {
    throw new Error("User not authenticated");
  }

  const uid = createId();
  const urlSlug = 'new';
  
  await prisma.poll.create({
    data: { 
      uid, 
      urlSlug, 
      communityModel: { connect: { uid: communityModelId } },
      published: false 
    },
  });
  
  revalidatePath('/');
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
  const user = await currentUser();
  const cookieStore = cookies();

  if (user) {
    let participant = await prisma.participant.findUnique({
      where: { uid: user.id },
    });

    if (!participant) {
      participant = await prisma.participant.create({
        data: { uid: user.id },
      });
    }

    return participant.uid;
  }

  // For anonymous users, try to retrieve participantId from cookies
  let participantId = cookieStore.get('participantId')?.value;

  if (participantId) {
    // Ensure the participant exists in the database
    const participantExists = await prisma.participant.findUnique({
      where: { uid: participantId },
    });

    if (participantExists) {
      return participantId;
    }

    // If participant does not exist in the database, create a new one
  }

  // No participantId found in cookies, or participant does not exist in DB
  participantId = createId();
  await prisma.participant.create({
    data: { uid: participantId },
  });

  // Set the participantId cookie
  cookieStore.set({
    name: 'participantId',
    value: participantId,
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });

  return participantId;
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
  revalidatePath(`/polls/${uid}`);
}

export async function submitStatement(pollId: string, text: string) {
  const participantId = await getParticipantId();
  await prisma.statement.create({
    data: { pollId, text, participantId },
  });
  revalidatePath(`/polls/${pollId}`);
}

export async function flagStatement(statementId: string) {
  const participantId = await getParticipantId();
  await prisma.flag.create({
    data: {
      statementId,
      participantId,
    },
  });
}

export async function submitVote(
  statementId: string,
  voteValue: VoteValueType,
  previousVote?: VoteValueType
) {
  const participantId = await getParticipantId();

  if (previousVote) {
    // If there's a previous vote, update it
    await prisma.vote.updateMany({
      where: { 
        statementId, 
        participantId,
        voteValue: previousVote
      },
      data: { voteValue },
    });
  } else {
    // If there's no previous vote, create a new one
    await prisma.vote.create({
      data: { statementId, voteValue, participantId },
    });
  }
}

export async function generateCsv(pollId: string): Promise<string> {
  const poll = await prisma.poll.findUnique({
    where: { uid: pollId },
    include: {
      creator: true,
      statements: {
        include: {
          participant: true,
          votes: {
            include: {
              participant: true,
            },
          },
          flags: {
            include: {
              participant: true,
            },
          },
        },
      },
    },
  });

  if (!poll) {
    throw new Error("Poll not found");
  }

  const csvData = poll.statements.map((statement) => {
    const approvedVotes = statement.votes.filter(
      (vote) => vote.voteValue === VoteValue.AGREE,
    );
    const disapprovedVotes = statement.votes.filter(
      (vote) => vote.voteValue === VoteValue.DISAGREE,
    );
    const passedVotes = statement.votes.filter(
      (vote) => vote.voteValue === VoteValue.PASS,
    );

    return {
      "Creator uid": poll.creatorId,
      Statement: statement.text,
      "Statement uid": statement.uid,
      "Participant uids vote Approved": approvedVotes
        .map((vote) => vote.participantId)
        .join(", "),
      "Participant uids vote Disapproved": disapprovedVotes
        .map((vote) => vote.participantId)
        .join(", "),
      "Participant uids vote Passed": passedVotes
        .map((vote) => vote.participantId)
        .join(", "),
      "Count of Flags": statement.flags.length,
    };
  });

  return stringify(csvData, { header: true });
}

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY_OSCCAI_MVP,
});

export async function continueConversation(messages: CoreMessage[]) {
  const result = await streamText({
    model: openai("gpt-4o"),
    messages,
  });

  const stream = createStreamableValue(result.textStream);
  return stream.value;
}

async function generateStatementsFromIdea(initialIdea: string): Promise<string[]> {
  return [
    "The AI should prioritize the interests of the collective or common good over individual preferences or rights",
    "The AI should be helpful",
    "Be honest",
    "Be harmless" 
  ]
}

export async function createCommunityModel(name: string, initialIdea: string) {
  'use server';
  const user = await currentUser();

  if (!user) {
    redirect('/sign-in');
  }

  const uid = createId();

  // Ensure the owner exists in the CommunityModelOwner table
  let owner = await prisma.communityModelOwner.findUnique({
    where: { uid: user.id },
  });

  let participantId: string;

  if (!owner) {
    // Check if Participant already exists
    let participant = await prisma.participant.findUnique({
      where: { uid: user.id },
    });

    if (!participant) {
      // Create a Participant if it doesn't exist
      participant = await prisma.participant.create({
        data: {
          uid: user.id,
        },
      });
    }

    participantId = participant.uid;

    // Then create the CommunityModelOwner
    owner = await prisma.communityModelOwner.create({
      data: {
        uid: user.id,
        name: user.fullName || user.firstName || 'Unknown',
        email: user.primaryEmailAddress?.emailAddress || '',
        participantId: participantId
      },
    });
  } else {
    participantId = owner.participantId || user.id;
    
    // If owner exists but doesn't have a participantId, link to existing Participant or create a new one
    if (!owner.participantId) {
      let participant = await prisma.participant.findUnique({
        where: { uid: user.id },
      });

      if (!participant) {
        participant = await prisma.participant.create({
          data: {
            uid: user.id,
          },
        });
      }
      
      // Update the CommunityModelOwner with the participantId
      await prisma.communityModelOwner.update({
        where: { uid: user.id },
        data: {
          participantId: participant.uid
        },
      });
      
      participantId = participant.uid;
    }
  }

  // Create Community Model
  const communityModel = await prisma.communityModel.create({
    data: {
      uid,
      name,
      owner: { connect: { uid: owner.uid } },
      initialIdea,
    },
  });

  // Generate initial statements from initialIdea
  const statements = await generateStatementsFromIdea(initialIdea);

  // Create first poll
  const pollId = createId();
  await prisma.poll.create({
    data: {
      uid: pollId,
      communityModel: { connect: { uid: communityModel.uid } },
      published: true,
      urlSlug: 'initial'
    },
  });

  // Create statements for the poll
  await prisma.statement.createMany({
    data: statements.map((text) => ({
      pollId,
      text,
      participantId,
    })),
  });

  return uid;
}

export async function setActiveConstitution(communityModelId: string, constitutionId: string) {
  await prisma.communityModel.update({
    where: { uid: communityModelId },
    data: { activeConstitutionId: constitutionId },
  });

  await prisma.constitution.update({
    where: { uid: constitutionId },
    data: { isPublished: true },
  });

  revalidatePath(`/community-models/${communityModelId}`);
}

export async function fetchUserVotes(pollId: string): Promise<Record<string, VoteValueType>> {
  const participantId = await getParticipantId();
  const votes = await prisma.vote.findMany({
    where: {
      participantId,
      statement: {
        pollId
      }
    },
    select: {
      statementId: true,
      voteValue: true
    }
  });

  return votes.reduce((acc, vote) => {
    acc[vote.statementId] = vote.voteValue;
    return acc;
  }, {} as Record<string, VoteValueType>);
}