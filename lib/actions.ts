"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import type { ClerkUser, ClerkEmailAddress } from "@/lib/types";
import type {
  Poll,
  VoteValue as VoteValueType,
  Statement,
  Participant,
  CommunityModelOwner,
  CommunityModel,
  Constitution,
  ConstitutionStatus
} from "@prisma/client";
import { VoteValue } from "@prisma/client";
import { init as initCuid } from "@paralleldrive/cuid2";
import { stringify } from "csv-stringify/sync";
import { currentUser, auth } from "@clerk/nextjs/server";
import { getPollData } from "./data";
import {
  generateSimpleConstitution,
  generateConstitutionFromStatements
} from "./aiActions";
import { deleteFile } from '@/lib/utils/uploader';
const createId = initCuid({ length: 10 });

export async function createPoll(
  communityModelId: string,
  pollData: {
    title: string;
    description: string;
    statements: Statement[];
    requireAuth: boolean;
    allowParticipantStatements: boolean;
    published: boolean;
  },
) {
  const participant = await getOrCreateParticipant();
  const participantId = participant?.uid;
  if (!participantId) throw new Error("Participant not found");

  const newPoll = await prisma.poll.create({
    data: {
      title: pollData.title,
      description: pollData.description,
      requireAuth: pollData.requireAuth,
      allowParticipantStatements: pollData.allowParticipantStatements,
      published: pollData.published,
      communityModel: {
        connect: { uid: communityModelId },
      },
      statements: {
        create: pollData.statements.map((statement) => ({
          text: statement.text,
          participantId,
          status: statement.status || "PENDING",
          createdAt: statement.createdAt || new Date(),
          updatedAt: statement.updatedAt || new Date(),
          deleted: statement.deleted || false,
        })),
      },
    },
  });

  return newPoll;
}

export async function editPoll(
  uid: string,
  data: {
    title?: string;
    description?: string;
    requireAuth?: boolean;
    allowParticipantStatements?: boolean;
  },
): Promise<Poll> {
  const updatedPoll = await prisma.poll.update({
    where: { uid },
    data: {
      ...data,
    },
  });
  revalidatePath(`/polls/${uid}`);
  return updatedPoll;
}

export async function publishPoll(
  pollId: string,
  newStatements: string,
  setPublished: boolean = true,
) {
  const participant = await getOrCreateParticipant();
  const participantId = participant?.uid;
  if (!participantId) throw new Error("Participant not found");

  const separatedStatements = newStatements
    .split("\n")
    .filter((s) => s.trim() !== "");

  const [updatedPoll] = await prisma.$transaction([
    prisma.poll.update({
      where: { uid: pollId },
      data: {
        published: setPublished,
        statements: {
          createMany: {
            data: separatedStatements.map((text) => ({
              text,
              participantId,
            })),
          },
        },
      },
      include: {
        statements: true,
      },
    }),
  ]);

  revalidatePath(`/polls/${pollId}`);
  return updatedPoll;
}

export async function submitStatement(
  pollId: string,
  text: string,
  anonymousId?: string,
) {
  const participant = await getOrCreateParticipant(null, anonymousId);
  const participantId = participant?.uid;
  if (!participantId) throw new Error("Participant not found");
  await prisma.statement.create({
    data: { pollId, text, participantId },
  });
  revalidatePath(`/polls/${pollId}`);
}

export async function flagStatement(statementId: string, anonymousId?: string) {
  const participant = await getOrCreateParticipant(null, anonymousId);
  const participantId = participant?.uid;
  if (!participantId) throw new Error("Participant not found");
  await prisma.flag.create({
    data: {
      statementId,
      participantId,
      reason: "TODO",
    },
  });
}

export async function fetchUserVotes(
  pollId: string,
  anonymousId?: string,
): Promise<Record<string, VoteValue>> {
  console.log("fetchUserVotes", { pollId, anonymousId });

  const participant = await getOrCreateParticipant(null, anonymousId);
  if (!participant) return {};

  const votes = await prisma.vote.findMany({
    where: {
      participantId: participant.uid,
      statement: {
        pollId,
      },
    },
    select: {
      statementId: true,
      voteValue: true,
    },
  });

  console.log("votes", votes);

  return votes.reduce(
    (acc, vote) => {
      acc[vote.statementId] = vote.voteValue;
      return acc;
    },
    {} as Record<string, VoteValue>,
  );
}

export async function isPollOwner(pollId: string): Promise<boolean> {
  const { userId: clerkUserId } = auth();

  if (!clerkUserId) {
    return false;
  }

  const poll = await prisma.poll.findUnique({
    where: { uid: pollId },
    include: {
      communityModel: {
        include: {
          owner: true,
        },
      },
    },
  });

  if (!poll) {
    return false;
  }

  return poll.communityModel.owner.clerkUserId === clerkUserId;
}
/**
 * Get or create a participant based on the provided participantId or anonymousId.
 * If neither is provided, it will attempt to use the current user's session.
 * If the user is not logged in, it will create an anonymous participant.
 * This essentially caters to these cases:
 * 1. The user is logged in and has a participantId
 * 2. The user is logged in and does not have a participantId, so we link the user to the participant
 * 3. (If the user is a community model owner, then we ensure that owner is linked to the participant)
 * 4. The user is not logged in, so we create an anonymous participant
 *
 * @param {string | null} participantId - Optional. The ID of the participant to retrieve.
 * @param {string | null} anonymousId - Optional. The anonymous ID to create a participant if not logged in.
 * @returns {Promise<Participant | null>} A promise that resolves to the participant or null if not found.
 */
export async function getOrCreateParticipant(
  participantId?: string | null,
  anonymousId?: string | null,
): Promise<Participant | null> {
  // If we have a participantId, return that
  if (participantId) {
    return await prisma.participant.findUnique({
      where: { uid: participantId },
    });
  }

  // Otherwise look for user via logged-in session
  const user = await currentUser();

  if (user) {
    let participant = await prisma.participant.findUnique({
      where: { clerkUserId: user.id },
    });

    if (!participant) {
      participant = await prisma.participant.create({
        data: {
          clerkUserId: user.id,
        },
      });

      const owner = await prisma.communityModelOwner.findUnique({
        where: { clerkUserId: user.id },
      });

      if (owner && !owner.participantId) {
        await prisma.communityModelOwner.update({
          where: { uid: owner.uid },
          data: { participantId: participant.uid },
        });
      }
    }

    return participant;
  }

  // If they're not logged in, or
  if (anonymousId) {
    let participant = await prisma.participant.findUnique({
      where: { anonymousId },
    });

    if (!participant) {
      participant = await prisma.participant.create({
        data: { anonymousId },
      });
    }

    return participant;
  }

  return null;
}

export async function submitVote(
  statementId: string,
  voteValue: VoteValue,
  previousVote?: VoteValue,
  anonymousId?: string,
) {
  console.log("submitVote", {
    statementId,
    voteValue,
    previousVote,
    anonymousId,
  });

  // Pass the anonymousId to get the participant just in case
  // nobody is logged in, otherwise getOrCreateParticipant() will
  // use the logged-in user
  const participant = await getOrCreateParticipant(null, anonymousId);
  if (!participant) throw new Error("Participant not found");

  const participantId = participant.uid;

  if (previousVote) {
    // Update the existing vote
    await prisma.vote.updateMany({
      where: {
        statementId,
        participantId,
        voteValue: previousVote,
      },
      data: { voteValue },
    });
  } else {
    // Create a new vote
    await prisma.vote.create({
      data: { statementId, voteValue, participantId },
    });
  }
}

export async function generateCsv(pollId: string): Promise<string> {
  const poll = await getPollData(pollId);

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
      "Owner uid": poll.communityModel.owner.uid,
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

async function getOrCreateOwnerFromClerkId(clerkUserId: string) {
  console.log("Getting or creating owner for clerk user:", clerkUserId);

  let owner = await prisma.communityModelOwner.findUnique({
    where: { clerkUserId },
  });

  if (!owner) {
    console.log("Owner not found, creating new owner");
    const user = (await currentUser()) as ClerkUser | null;

    if (!user) {
      throw new Error("User not logged in");
    }

    const primaryEmailAddress = user.emailAddresses.find(
      (email: ClerkEmailAddress) => email.id === user.primaryEmailAddressId,
    )?.emailAddress;

    console.log("Email addresses:", user.emailAddresses);
    console.log("Primary email address ID:", user.primaryEmailAddressId);
    console.log("Primary email address:", primaryEmailAddress);

    if (!primaryEmailAddress) {
      console.error("User does not have a primary email address");
      // Handle the case where the user doesn't have a primary email address
      // You could throw an error, or create the owner record with a default email
    }

    try {
      owner = await prisma.communityModelOwner.create({
        data: {
          clerkUserId: user.id,
          name:
            (user.firstName || "Unknown") + " " + (user.lastName || "Unknown"),
          email: primaryEmailAddress || "Unknown",
        },
      });
      console.log("New owner created:", owner);
    } catch (error) {
      console.error("Error creating owner:", error);
      throw error;
    }
  }

  if (!owner.participantId) {
    console.log("Owner found, but missing participantId. Updating owner...");
    const participant = await getOrCreateParticipant();
    if (participant) {
      await prisma.communityModelOwner.update({
        where: { clerkUserId },
        data: { participantId: participant.uid },
      });
      console.log("Owner updated with participantId");
    }
  } else {
    console.log("Owner found:", owner);
  }

  return owner;
}

async function createInitialPoll(
  communityModelUid: string,
  name: string,
  owner: CommunityModelOwner,
  statements: string[],
) {
  const pollId = createId();
  
  // Ensure the owner has a linked participant
  if (!owner.participantId) {
    const participant = await getOrCreateParticipant();
    if (participant) {
      await prisma.communityModelOwner.update({
        where: { uid: owner.uid },
        data: { participantId: participant.uid },
      });
      owner.participantId = participant.uid;
    } else {
      throw new Error("Failed to create or retrieve participant for owner");
    }
  }

  await prisma.poll.create({
    data: {
      uid: pollId,
      communityModel: { connect: { uid: communityModelUid } },
      title: `Initial Poll for ${name}`,
      published: true,
    },
  });

  await prisma.statement.createMany({
    data: statements.map((text) => ({
      pollId,
      text,
      participantId: owner.participantId ?? '',
    })),
  });

  return pollId;
}

export async function createCommunityModel(
  name: string,
  initialIdea: string,
  anonymousId: string,
) {
  "use server";
  const startTime = Date.now(); // Record the start time

  console.time("createCommunityModel"); // Start a timer

  const { userId: clerkUserId }: { userId: string | null } = auth();

  if (!clerkUserId) {
    throw new Error("User not authenticated");
  }

  if (!data.name || !data.bio) {
    throw new Error("Name and bio are required to create a community model");
  }

  const owner = await getOrCreateOwnerFromClerkId(clerkUserId);

  const communityModel = await prisma.communityModel.create({
    data: {
      uid: createId(),
      name: data.name,
      owner: { connect: { uid: owner.uid } },
      bio: data.bio,
      goal: data.goal || '',
      logoUrl: data.logoUrl || null,
      published: false,
      polls: data.principles && data.principles.length > 0 ? {
        create: {
          title: "Initial Poll",
          published: false,
          statements: {
            create: data.principles.map(principle => ({
              text: principle.text,
              participantId: owner.participantId!,
            })),
          },
        },
      } : undefined,
    },
  });
  console.timeEnd("createCommunityModel.prisma"); // Log the time taken by Prisma operations

  console.time("generateStatementsFromIdea"); // Start a timer for generateStatementsFromIdea
  const statements = await generateStatementsFromIdea(initialIdea);
  console.timeEnd("generateStatementsFromIdea"); // Log the time taken by generateStatementsFromIdea

  console.time("createInitialPoll"); // Start a timer for createInitialPoll
  await createInitialPoll(communityModel.uid, name, participantId, statements);
  console.timeEnd("createInitialPoll"); // Log the time taken by createInitialPoll

  console.timeEnd("createCommunityModel"); // Log the total time taken by createCommunityModel

  const endTime = Date.now(); // Record the end time
  console.log(`createCommunityModel took ${endTime - startTime} ms`);

  return communityModel.uid;
}

export async function deletePoll(pollId: string) {
  const poll = await prisma.poll.findUnique({
    where: { uid: pollId },
    select: { communityModelId: true },
  });

  if (!poll) {
    throw new Error("Poll not found");
  }

  // Soft delete the poll
  await prisma.poll.update({
    where: { uid: pollId },
    data: { deleted: true },
  });

  revalidatePath(`/polls/${pollId}`);
  revalidatePath(`/community-models/${poll.communityModelId}`);
}

export async function deleteCommunityModel(communityModelId: string) {
  await prisma.communityModel.update({
    where: { uid: communityModelId },
    data: { deleted: true },
  });

  revalidatePath(`/community-models/${communityModelId}`);
}

export async function deleteConstitution(constitutionId: string) {
  const constitution = await prisma.constitution.findUnique({
    where: { uid: constitutionId },
    select: { modelId: true },
  });

  if (!constitution) {
    throw new Error("Constitution not found");
  }

  await prisma.constitution.delete({
    where: { uid: constitutionId },
  });

  revalidatePath(`/community-models/${constitution.modelId}`);
}

export async function deleteStatement(statementId: string) {
  const statement = await prisma.statement.findUnique({
    where: { uid: statementId },
    select: { pollId: true },
  });

  if (!statement) {
    throw new Error("Statement not found");
  }

  await prisma.statement.update({
    where: { uid: statementId },
    data: { deleted: true },
  });

  revalidatePath(`/polls/${statement.pollId}`);
}

// For Votes and Flags, we'll keep the hard delete
export async function deleteVote(voteId: string) {
  await prisma.vote.delete({
    where: { uid: voteId },
  });
}

export async function deleteFlag(flagId: string) {
  await prisma.flag.delete({
    where: { uid: flagId },
  });
}

export async function publishModel(formData: FormData) {
  const modelId = formData.get("modelId") as string;
  await prisma.communityModel.update({
    where: { uid: modelId },
    data: { published: true },
  });
  revalidatePath(`/community-models/${modelId}`);
  revalidatePath("/library");
}

export async function unpublishModel(formData: FormData) {
  const modelId = formData.get("modelId") as string;
  await prisma.communityModel.update({
    where: { uid: modelId },
    data: { published: false },
  });
  revalidatePath(`/community-models/${modelId}`);
  revalidatePath("/library");
}

export async function createConstitution(communityModelId: string): Promise<Constitution> {
  const communityModel = await prisma.communityModel.findUnique({
    where: { uid: communityModelId },
    include: {
      constitutions: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { createdAt: true, version: true },
      },
      polls: {
        include: {
          statements: true,
        },
      },
    },
  });

  if (!communityModel) {
    throw new Error("Community model not found");
  }

  const latestConstitution = communityModel.constitutions[0];
  const newVersion = latestConstitution ? latestConstitution.version + 1 : 1;

  // Collect all statements from all polls that are marked as constitutionable
  const constitutionableStatements = communityModel.polls
    .flatMap(poll => poll.statements)
    .filter(statement => statement.isConstitutionable);

  // Generate the constitution content
  let constitutionContent = `Community Name: ${communityModel.name}\n\n`;
  constitutionContent += `Goal: ${communityModel.goal}\n\n`;
  constitutionContent += `Bio: ${communityModel.bio}\n\n`;

  if (constitutionableStatements.length > 0) {
    constitutionContent += "Principles:\n";
    constitutionableStatements.forEach((statement, index) => {
      constitutionContent += `${index + 1}. ${statement.text}\n`;
    });
  } else {
    constitutionContent += "[No specific principles]\n";
  }

  const newConstitution = await prisma.constitution.create({
    data: {
      version: newVersion,
      content: constitutionContent,
      modelId: communityModelId,
      status: "DRAFT",
    },
  });

  revalidatePath(`/community-models/${communityModelId}`);
  return newConstitution;
}

export async function setActiveConstitution(
  communityModelId: string,
  constitutionId: string,
): Promise<void> {
  await prisma.communityModel.update({
    where: { uid: communityModelId },
    data: { activeConstitutionId: constitutionId },
  });

  await prisma.constitution.update({
    where: { uid: constitutionId },
    data: { status: "ACTIVE" },
  });

  revalidatePath(`/community-models/${communityModelId}`);
  revalidatePath(`/community-models/constitution/${constitutionId}`);
}

export async function linkClerkUserToCommunityModelOwner() {
  const { userId: clerkUserId } = auth();

  if (!clerkUserId) {
    throw new Error("User not authenticated");
  }

  const owner = await getOrCreateOwnerFromClerkId(clerkUserId);

  return owner;
}

export async function updatePoll(modelId: string, pollData: Partial<Poll> & { statements?: Partial<Statement>[] }): Promise<Poll> {
  // First, try to find an existing poll for this community model
  let existingPoll = await prisma.poll.findFirst({
    where: {
      communityModelId: modelId,
    },
  });

  if (existingPoll) {
    const { statements, ...pollDataWithoutStatements } = pollData;
    const updatedPoll = await prisma.poll.update({
      where: {
        uid: existingPoll.uid,
      },
      data: {
        ...pollDataWithoutStatements,
        ...(statements && {
          statements: {
            deleteMany: {},
            create: statements.map((statement: Partial<Statement>) => ({
              text: statement.text ?? '',
              participantId: statement.participantId ?? '',
              status: 'PENDING',
              // Add other required fields here
            })),
          },
        }),
      },
      include: { statements: true },
    });
    revalidatePath(`/community-models/${modelId}`);
    return updatedPoll;
  } else {
    // If no poll exists, create a new one
    const { statements, ...pollDataWithoutStatements } = pollData;
    const newPoll = await prisma.poll.create({
      data: {
        ...pollDataWithoutStatements,
        communityModelId: modelId,
        title: pollDataWithoutStatements.title || `Poll for ${modelId}`,
        published: pollDataWithoutStatements.published ?? false, // Set a default value for published
        statements: {
          create: statements?.map((statement: Partial<Statement>) => ({
            text: statement.text ?? '',
            participantId: statement.participantId ?? '',
            status: 'PENDING' as const,
          })) || [],
        },
      },
      include: { statements: true },
    });
    revalidatePath(`/community-models/${modelId}`);
    return newPoll;
  }
}

export async function updateConstitution(
  constitutionId: string,
  newContent: string,
) {
  const updatedConstitution = await prisma.constitution.update({
    where: { uid: constitutionId },
    data: { content: newContent },
  });

  revalidatePath(`/community-models/constitution/${constitutionId}`);
  return updatedConstitution;
}
