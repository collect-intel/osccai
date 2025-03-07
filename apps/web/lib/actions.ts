"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import type {
  ClerkUser,
  ClerkEmailAddress,
  ExtendedStatement,
  ExtendedPoll,
  Principle,
} from "@/lib/types";
import type {
  Poll,
  VoteValue as VoteValueType,
  Statement,
  Participant,
  CommunityModelOwner,
  CommunityModel,
  Constitution,
  Vote,
} from "@prisma/client";
import { VoteValue } from "@prisma/client";
import { init as initCuid } from "@paralleldrive/cuid2";
import { stringify } from "csv-stringify/sync";
import { currentUser, auth } from "@clerk/nextjs/server";
import { getPollData } from "./data";
import { isStatementConstitutionable } from "@/lib/utils/pollUtils";
import { generateApiKey } from "@/lib/utils/server/api-keys";
import type { Prisma } from "@prisma/client";
import {
  createActorFromOwner,
  logModelChanges,
  logPollCreated,
  createActorFromParticipant,
  logPollUpdated,
  logStatementAdded,
  logVoteCast,
  logGacScoreUpdated,
  SYSTEM_ACTOR,
  logConstitutionGenerated,
  logConstitutionActivated,
  logApiKeyCreated,
  logApiKeyRevoked,
} from "@/lib/utils/server/eventLogger";
import { isCurrentUserAdmin } from "@/lib/utils/admin";
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

  // Log the poll creation
  const actor = createActorFromParticipant(participant);
  logPollCreated(newPoll, actor);

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
  const participant = await getOrCreateParticipant();
  if (!participant) throw new Error("Participant not found");

  const updatedPoll = await prisma.poll.update({
    where: { uid },
    data: {
      ...data,
    },
  });

  // Log the poll update
  const actor = createActorFromParticipant(participant);
  logPollUpdated(updatedPoll, actor);

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

  if (!participant) throw new Error("Participant not found");

  const participantId = participant.uid;

  // Get the poll to check limits and requirements
  const poll = await prisma.poll.findUnique({
    where: { uid: pollId },
  });

  if (!poll) throw new Error("Poll not found");

  // Check if participant statements are allowed
  if (!poll.allowParticipantStatements) {
    throw new Error("Participant statements are not allowed in this poll");
  }

  // Check minimum votes requirement if set
  if (poll.minVotesBeforeSubmission) {
    const voteCount = await prisma.vote.count({
      where: {
        participantId,
        statement: {
          pollId,
        },
      },
    });

    if (voteCount < poll.minVotesBeforeSubmission) {
      throw new Error(
        `You must vote on at least ${poll.minVotesBeforeSubmission} statements before submitting your own`,
      );
    }
  }

  // Check maximum submissions limit if set
  if (poll.maxSubmissionsPerParticipant) {
    const submissionCount = await prisma.statement.count({
      where: {
        pollId,
        participantId,
        deleted: false,
      },
    });

    if (submissionCount >= poll.maxSubmissionsPerParticipant) {
      throw new Error("Maximum submissions limit reached");
    }
  }

  // Create the statement
  const statement = await prisma.statement.create({
    data: { pollId, text, participantId },
  });

  // Log the statement addition
  const actor = createActorFromParticipant(participant);
  await logStatementAdded(statement, actor, poll.communityModelId);

  revalidatePath(`/polls/${pollId}`);
  return statement;
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
    (
      acc: Record<string, VoteValue>,
      vote: { statementId: string; voteValue: VoteValue },
    ) => {
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
      try {
        participant = await prisma.participant.create({
          data: { anonymousId },
        });
      } catch (error: any) {
        // If the creation fails due to a unique constraint violation,
        // try to fetch the existing participant again
        if (
          error?.code === "P2002" &&
          error?.meta?.target?.includes("anonymousId")
        ) {
          participant = await prisma.participant.findUnique({
            where: { anonymousId },
          });
        } else {
          // If it's a different error, rethrow it
          throw error;
        }
      }
    }

    return participant;
  }

  return null;
}

async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000,
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error("Max retries reached");
}

export async function submitVote(
  statementId: string,
  voteValue: VoteValue,
  previousVote?: VoteValue,
  anonymousId?: string,
) {
  const participant = await getOrCreateParticipant(null, anonymousId);
  if (!participant) throw new Error("Participant not found");

  const participantId = participant.uid;

  // Get the poll and statement to check limits
  const statement = await prisma.statement.findUnique({
    where: { uid: statementId },
    include: {
      poll: true,
    },
  });

  if (!statement) throw new Error("Statement not found");

  // If there's a vote limit, check if participant has reached it
  if (statement.poll.maxVotesPerParticipant) {
    const voteCount = await prisma.vote.count({
      where: {
        participantId,
        statement: {
          pollId: statement.pollId,
        },
      },
    });

    if (!previousVote && voteCount >= statement.poll.maxVotesPerParticipant) {
      throw new Error("Maximum votes limit reached");
    }
  }

  const pollId = statement.pollId;

  return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // First, check if the statement exists
    const statementCheck = await tx.statement.findUnique({
      where: { uid: statementId },
    });

    if (!statementCheck) {
      throw new Error("Statement not found");
    }

    let vote;

    if (previousVote) {
      // Update the existing vote
      await tx.vote.updateMany({
        where: {
          statementId,
          participantId,
        },
        data: { voteValue },
      });

      // Get the updated vote for logging
      vote = await tx.vote.findFirst({
        where: {
          statementId,
          participantId,
        },
      });

      // Update vote counts
      await updateVoteCounts(statementId, previousVote, voteValue);
    } else {
      // Create a new vote
      try {
        vote = await retryOperation(() =>
          tx.vote.create({
            data: { statementId, voteValue, participantId },
          }),
        );

        // Increment the new vote count
        await incrementVoteCount(statementId, voteValue);
      } catch (error) {
        console.error("Error creating vote:", error);
        throw new Error("Failed to create vote");
      }
    }

    // Log the vote
    if (vote) {
      const actor = createActorFromParticipant(participant);
      try {
        // Get the communityModelId from the statement's poll
        const statementWithPoll = await tx.statement.findUnique({
          where: { uid: statementId },
          select: {
            poll: {
              select: { communityModelId: true },
            },
          },
        });

        // Pass communityModelId if available
        await logVoteCast(
          vote,
          pollId,
          actor,
          statementWithPoll?.poll?.communityModelId,
        );
      } catch (error) {
        // Fall back to logging without communityModelId
        console.error(
          "Error getting communityModelId for vote logging:",
          error,
        );
        await logVoteCast(vote, pollId, actor);
      }
    }

    // Fetch and return updated statement
    return tx.statement.findUnique({
      where: { uid: statementId },
      include: { votes: true },
    });
  });
}

async function updateVoteCounts(
  statementId: string,
  previousVote: VoteValue,
  newVote: VoteValue,
) {
  const updateData: any = {};

  if (previousVote === VoteValue.AGREE)
    updateData.agreeCount = { decrement: 1 };
  if (previousVote === VoteValue.DISAGREE)
    updateData.disagreeCount = { decrement: 1 };
  if (previousVote === VoteValue.PASS) updateData.passCount = { decrement: 1 };

  if (newVote === VoteValue.AGREE) updateData.agreeCount = { increment: 1 };
  if (newVote === VoteValue.DISAGREE)
    updateData.disagreeCount = { increment: 1 };
  if (newVote === VoteValue.PASS) updateData.passCount = { increment: 1 };

  // Fetch the statement to get the old GAC score
  const statement = await prisma.statement.findUnique({
    where: { uid: statementId },
    select: { gacScore: true },
  });

  const oldScore = statement?.gacScore ?? undefined;

  // Update the statement
  const updatedStatement = await prisma.statement.update({
    where: { uid: statementId },
    data: updateData,
  });

  // If GAC score has changed, log it
  if (updatedStatement.gacScore !== oldScore) {
    logGacScoreUpdated(
      updatedStatement,
      oldScore,
      updatedStatement.gacScore || 0,
    );
  }
}

async function incrementVoteCount(statementId: string, voteValue: VoteValue) {
  const updateData: any = {};

  if (voteValue === VoteValue.AGREE) updateData.agreeCount = { increment: 1 };
  if (voteValue === VoteValue.DISAGREE)
    updateData.disagreeCount = { increment: 1 };
  if (voteValue === VoteValue.PASS) updateData.passCount = { increment: 1 };

  // Fetch the statement to get the old GAC score
  const statement = await prisma.statement.findUnique({
    where: { uid: statementId },
    select: { gacScore: true },
  });

  const oldScore = statement?.gacScore ?? undefined;

  // Update the statement
  const updatedStatement = await prisma.statement.update({
    where: { uid: statementId },
    data: updateData,
  });

  // If GAC score has changed, log it
  if (updatedStatement.gacScore !== oldScore) {
    logGacScoreUpdated(
      updatedStatement,
      oldScore,
      updatedStatement.gacScore || 0,
    );
  }
}

export async function generateCsv(pollId: string): Promise<string> {
  const poll = await getPollData(pollId);

  if (!poll) {
    throw new Error("Poll not found");
  }

  const csvData = poll.statements.map((statement: ExtendedStatement) => {
    const approvedVotes = statement.votes.filter(
      (vote: Vote) => vote.voteValue === VoteValue.AGREE,
    );
    const disapprovedVotes = statement.votes.filter(
      (vote: Vote) => vote.voteValue === VoteValue.DISAGREE,
    );
    const passedVotes = statement.votes.filter(
      (vote: Vote) => vote.voteValue === VoteValue.PASS,
    );

    return {
      "Owner uid": poll.communityModel.owner.uid,
      Statement: statement.text,
      "Statement uid": statement.uid,
      "Participant uids vote Approved": approvedVotes
        .map((vote: Vote) => vote.participantId)
        .join(", "),
      "Participant uids vote Disapproved": disapprovedVotes
        .map((vote: Vote) => vote.participantId)
        .join(", "),
      "Participant uids vote Passed": passedVotes
        .map((vote: Vote) => vote.participantId)
        .join(", "),
      "Count of Flags": statement.flags.length,
    };
  });

  return stringify(csvData, { header: true });
}

async function getOrCreateOwnerFromClerkId(clerkUserId: string) {
  let owner = await prisma.communityModelOwner.findUnique({
    where: { clerkUserId },
    select: { uid: true, name: true, email: true, participantId: true },
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

  // Check if user is admin (separate query to avoid linter error)
  const isAdmin = await isCurrentUserAdmin();
  return { ...owner, isAdmin };
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
      participantId: owner.participantId ?? "",
    })),
  });

  return pollId;
}

export async function createCommunityModel(
  data: Partial<CommunityModel> & {
    principles?: Principle[];
  },
) {
  const { userId: clerkUserId } = auth();

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
      goal: data.goal || "",
      logoUrl: data.logoUrl || null,
      published: false,
      polls: {
        create: {
          title: `Poll for Community Model: ${data.name}`,
          published: false,
          statements:
            data.principles && data.principles.length > 0
              ? {
                  create: data.principles.map((principle) => ({
                    text: principle.text,
                    participantId: owner.participantId!,
                    gacScore: principle.gacScore,
                  })),
                }
              : undefined,
        },
      },
    },
    include: {
      polls: true,
    },
  });

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

export async function createConstitution(
  communityModelId: string,
): Promise<Constitution> {
  // Get the current user
  const { userId: clerkUserId } = auth();
  if (!clerkUserId) {
    throw new Error("User not authenticated");
  }

  const owner = await prisma.communityModelOwner.findUnique({
    where: { clerkUserId },
  });

  if (!owner) {
    throw new Error("Owner not found");
  }

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
          statements: {
            include: {
              votes: true,
            },
          },
        },
      },
    },
  });

  if (!communityModel) {
    throw new Error("Community model not found");
  }
  const latestConstitution = communityModel.constitutions[0];
  const newVersion = latestConstitution ? latestConstitution.version + 1 : 1;

  // Use the imported function
  const constitutionableStatements = communityModel.polls
    .flatMap((poll) => poll.statements)
    .filter(isStatementConstitutionable);

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

  // Create actor and log the constitution generation
  const actor = createActorFromOwner({
    uid: owner.uid,
    name: owner.name,
    isAdmin: false,
  });

  logConstitutionGenerated(newConstitution, actor);

  revalidatePath(`/community-models/${communityModelId}`);
  return newConstitution;
}

export async function setActiveConstitution(
  communityModelId: string,
  constitutionId: string,
): Promise<void> {
  // Get the current user
  const { userId: clerkUserId } = auth();
  if (!clerkUserId) {
    throw new Error("User not authenticated");
  }

  const owner = await prisma.communityModelOwner.findUnique({
    where: { clerkUserId },
  });

  if (!owner) {
    throw new Error("Owner not found");
  }

  // Update the community model with the active constitution
  await prisma.communityModel.update({
    where: { uid: communityModelId },
    data: { activeConstitutionId: constitutionId },
  });

  // Update the constitution status
  const constitution = await prisma.constitution.update({
    where: { uid: constitutionId },
    data: { status: "ACTIVE" },
  });

  // Create actor and log the constitution activation
  const actor = createActorFromOwner({
    uid: owner.uid,
    name: owner.name,
    isAdmin: false,
  });

  logConstitutionActivated(constitution, communityModelId, actor);

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

export async function updatePoll(
  modelId: string,
  pollData: Partial<Poll> & { statements?: Partial<Statement>[] },
): Promise<Poll> {
  let poll = await prisma.poll.findFirst({
    where: {
      communityModelId: modelId,
      deleted: false,
    },
    include: {
      statements: true,
    },
  });

  if (poll) {
    const { statements, ...pollDataWithoutStatements } = pollData;
    poll = await prisma.poll.update({
      where: {
        uid: poll.uid,
      },
      data: {
        ...pollDataWithoutStatements,
        ...(statements && {
          statements: {
            upsert: statements.map((statement) => ({
              where: { uid: statement.uid || "new" },
              update: { text: statement.text },
              create: {
                text: statement.text ?? "",
                participantId: statement.participantId ?? "",
                status: "PENDING",
              },
            })),
          },
        }),
      },
      include: { statements: true },
    });
  } else {
    const { statements, ...pollDataWithoutStatements } = pollData;
    poll = await prisma.poll.create({
      data: {
        ...pollDataWithoutStatements,
        communityModelId: modelId,
        title: pollDataWithoutStatements.title || `Poll for ${modelId}`,
        published: pollDataWithoutStatements.published ?? false,
        statements: {
          create:
            statements?.map((statement) => ({
              text: statement.text ?? "",
              participantId: statement.participantId ?? "",
              status: "PENDING",
            })) || [],
        },
      },
      include: { statements: true },
    });
  }

  revalidatePath(`/community-models/${modelId}`);
  return poll;
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

export async function updateCommunityModel(
  modelId: string,
  data: Partial<CommunityModel> & {
    principles?: Principle[];
    requireAuth?: boolean;
    allowContributions?: boolean;
    constitutions?: Constitution[];
    activeConstitutionId?: string | null;
    autoCreateConstitution?: boolean;
  },
): Promise<CommunityModel & { polls: Poll[] }> {
  const {
    principles,
    requireAuth,
    allowContributions,
    constitutions,
    activeConstitutionId,
    autoCreateConstitution,
    ...modelData
  } = data;

  try {
    // Get the current model state before update for logging
    const currentModel = await prisma.communityModel.findUnique({
      where: { uid: modelId },
      include: { owner: true },
    });

    if (!currentModel) {
      throw new Error("Model not found");
    }

    // Get the current user for logging
    const { userId: clerkUserId } = auth();
    if (!clerkUserId) {
      throw new Error("User not authenticated");
    }

    const owner = await prisma.communityModelOwner.findUnique({
      where: { clerkUserId },
    });

    if (!owner) {
      throw new Error("Owner not found");
    }

    // Check if user is owner or admin
    const isAdmin = await isCurrentUserAdmin();
    const isOwner = currentModel.ownerId === owner.uid;

    if (!isOwner && !isAdmin) {
      throw new Error("Not authorized to update this model");
    }

    // Create actor for logging
    const actor = createActorFromOwner({
      uid: owner.uid,
      name: owner.name,
      isAdmin: !isOwner && isAdmin,
    });

    const updatedModel = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        // Update the community model
        const model = await tx.communityModel.update({
          where: { uid: modelId },
          data: {
            ...modelData,
            ...(autoCreateConstitution !== undefined && {
              autoCreateConstitution,
            }),
            activeConstitutionId:
              activeConstitutionId !== undefined
                ? activeConstitutionId
                : undefined,
          },
          include: { polls: true, owner: true },
        });

        // Update all associated polls
        if (requireAuth !== undefined || allowContributions !== undefined) {
          await tx.poll.updateMany({
            where: { communityModelId: modelId },
            data: {
              ...(requireAuth !== undefined && { requireAuth }),
              ...(allowContributions !== undefined && {
                allowParticipantStatements: allowContributions,
              }),
            },
          });
        }

        // Handle principles update if provided
        if (principles) {
          const poll = await tx.poll.findFirst({
            where: { communityModelId: modelId },
            include: { statements: true },
          });

          if (poll) {
            // Ensure the owner has a linked participant
            let participantId = model.owner.participantId;
            if (!participantId) {
              const participant = await tx.participant.create({
                data: {
                  clerkUserId: model.owner.clerkUserId,
                },
              });
              participantId = participant.uid;
              await tx.communityModelOwner.update({
                where: { uid: model.owner.uid },
                data: { participantId: participantId },
              });
            }

            const updatedPrinciples = [];

            // Update existing principles and add new ones
            for (const principle of principles) {
              if (principle.id.startsWith("new-")) {
                // This is a new principle, create it
                const newStatement = await tx.statement.create({
                  data: {
                    pollId: poll.uid,
                    text: principle.text,
                    gacScore: principle.gacScore,
                    participantId: participantId,
                  },
                });
                updatedPrinciples.push(newStatement);

                // Log the new statement
                await logStatementAdded(newStatement, actor, modelId);
              } else {
                // This is an existing principle, update it
                const updatedStatement = await tx.statement.update({
                  where: { uid: principle.id },
                  data: {
                    text: principle.text,
                    gacScore: principle.gacScore,
                  },
                });
                updatedPrinciples.push(updatedStatement);
              }
            }

            // Get all principle IDs, including newly created ones
            const allPrincipleIds = updatedPrinciples.map((p) => p.uid);

            // Find principles that are no longer in the list
            const statementsToDelete = poll.statements.filter(
              (s) => !allPrincipleIds.includes(s.uid),
            );

            // Log how many statements are being deleted and why
            if (statementsToDelete.length > 0) {
              console.log(
                `Deleting ${statementsToDelete.length} statements because they're not in the updated principles list.`,
              );
              console.log(
                `Updated principles: ${allPrincipleIds.length} statements`,
              );
              console.log(
                `Total poll statements: ${poll.statements.length} statements`,
              );
            }

            // Delete principles that are no longer in the list
            for (const statement of statementsToDelete) {
              await tx.vote.deleteMany({
                where: { statementId: statement.uid },
              });

              await tx.flag.deleteMany({
                where: { statementId: statement.uid },
              });

              await tx.statement.delete({
                where: { uid: statement.uid },
              });
            }
          }
        }

        // Handle constitutions update if provided
        if (constitutions) {
          // Update or create constitutions
          for (const constitution of constitutions) {
            if (constitution.uid) {
              await tx.constitution.update({
                where: { uid: constitution.uid },
                data: {
                  content: constitution.content,
                  status: constitution.status,
                },
              });
            } else {
              const newConstitution = await tx.constitution.create({
                data: {
                  modelId: modelId,
                  content: constitution.content,
                  status: constitution.status,
                  version: constitution.version,
                },
              });

              // Log the constitution creation
              logConstitutionGenerated(newConstitution, actor);
            }
          }
        }

        // Fetch the updated model with polls and constitutions
        return tx.communityModel.findUnique({
          where: { uid: modelId },
          include: {
            polls: { include: { statements: true } },
            constitutions: true,
            owner: true,
          },
        });
      },
    );

    if (!updatedModel) {
      throw new Error("Failed to update community model");
    }

    // Log the model changes
    logModelChanges(currentModel, updatedModel, actor);

    return updatedModel;
  } catch (error) {
    console.error("Error updating community model:", error);
    throw error;
  }
}

export async function fetchPollData(modelId: string): Promise<ExtendedPoll> {
  const poll = await prisma.poll.findFirst({
    where: {
      communityModelId: modelId,
      deleted: false,
    },
    include: {
      statements: {
        where: { deleted: false },
        include: {
          votes: true,
          flags: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
      communityModel: {
        include: {
          owner: true,
        },
      },
    },
  });

  if (!poll) {
    throw new Error("No poll found for this community model");
  }

  // Calculate isConstitutionable for each statement
  const statementsWithConstitutionable = poll.statements.map(
    (statement: ExtendedStatement) => {
      const totalVotes = statement.votes.length;
      const agreeVotes = statement.votes.filter(
        (vote: Vote) => vote.voteValue === VoteValue.AGREE,
      ).length;
      const agreePercentage =
        totalVotes > 0 ? (agreeVotes / totalVotes) * 100 : 0;

      return {
        ...statement,
        isConstitutionable:
          statement.isConstitutionable ?? agreePercentage >= 66.67,
      };
    },
  );

  // Convert null values to undefined for optional fields
  const {
    minVotesBeforeSubmission,
    maxVotesPerParticipant,
    maxSubmissionsPerParticipant,
    minRequiredSubmissions,
    completionMessage,
    ...restPoll
  } = poll;

  // Return the poll data with properly typed optional fields
  return {
    ...restPoll,
    minVotesBeforeSubmission: minVotesBeforeSubmission ?? undefined,
    maxVotesPerParticipant: maxVotesPerParticipant ?? undefined,
    maxSubmissionsPerParticipant: maxSubmissionsPerParticipant ?? undefined,
    minRequiredSubmissions: minRequiredSubmissions ?? undefined,
    completionMessage: completionMessage ?? undefined,
    statements: statementsWithConstitutionable,
    communityModel: {
      bio: poll.communityModel.bio ?? "",
      goal: poll.communityModel.goal ?? "",
      name: poll.communityModel.name,
      uid: poll.communityModel.uid,
      owner: {
        uid: poll.communityModel.owner.uid,
        name: poll.communityModel.owner.name,
        clerkUserId: poll.communityModel.owner.clerkUserId,
      },
    },
  } as ExtendedPoll;
}

export async function createApiKey(
  modelId: string,
  ownerId: string,
  name: string,
) {
  console.log("Creating API key:", { modelId, ownerId, name });

  if (!ownerId || ownerId === "") {
    throw new Error("Invalid owner ID provided");
  }

  if (!name || name.trim() === "") {
    throw new Error("API key name is required");
  }

  const owner = await prisma.communityModelOwner.findUnique({
    where: { uid: ownerId },
  });

  if (!owner) {
    console.error(`Owner not found for ID: ${ownerId}`);
    throw new Error("Owner not found");
  }

  // Generate the API key
  const { raw, hashed } = await generateApiKey("sk");

  // Store only the hashed version in the database
  const apiKey = await prisma.apiKey.create({
    data: {
      key: hashed,
      name,
      ownerId,
      modelId,
    },
  });

  // Create actor and log the API key creation
  const actor = createActorFromOwner({
    uid: owner.uid,
    name: owner.name,
    isAdmin: false,
  });

  logApiKeyCreated(apiKey, actor);

  // Return the raw key only once - it will never be accessible again
  return {
    id: apiKey.uid,
    key: raw,
    name: apiKey.name!,
    createdAt: apiKey.createdAt,
  };
}

/**
 * Revokes an API key by marking it as revoked
 * @param apiKeyId ID of the API key to revoke
 * @returns The updated API key
 */
export async function revokeApiKey(apiKeyId: string) {
  // Get the current user
  const { userId: clerkUserId } = auth();
  if (!clerkUserId) {
    throw new Error("User not authenticated");
  }

  const owner = await prisma.communityModelOwner.findUnique({
    where: { clerkUserId },
  });

  if (!owner) {
    throw new Error("Owner not found");
  }

  // Get the API key
  const apiKey = await prisma.apiKey.findUnique({
    where: { uid: apiKeyId },
  });

  if (!apiKey) {
    throw new Error("API key not found");
  }

  // Check if user is owner or admin
  const isAdmin = await isCurrentUserAdmin();
  const isOwner = apiKey.ownerId === owner.uid;

  if (!isOwner && !isAdmin) {
    throw new Error("Not authorized to revoke this API key");
  }

  // Revoke the API key
  const updatedApiKey = await prisma.apiKey.update({
    where: { uid: apiKeyId },
    data: { status: "REVOKED" },
  });

  // Create actor and log the API key revocation
  const actor = createActorFromOwner({
    uid: owner.uid,
    name: owner.name,
    isAdmin: !isOwner && isAdmin,
  });

  logApiKeyRevoked(updatedApiKey, actor);

  return updatedApiKey;
}

// New helper function to check poll completion status
export async function checkPollCompletion(
  pollId: string,
  anonymousId: string,
): Promise<{
  isComplete: boolean;
  message?: string;
  requiredSubmissions?: number;
  currentSubmissions?: number;
}> {
  const participant = await getOrCreateParticipant(null, anonymousId);
  if (!participant) throw new Error("Participant not found");

  const participantId = participant.uid;

  const poll = await prisma.poll.findUnique({
    where: { uid: pollId },
    include: {
      statements: {
        where: { deleted: false },
      },
    },
  });

  if (!poll) throw new Error("Poll not found");

  const voteCount = await prisma.vote.count({
    where: {
      participantId,
      statement: {
        pollId,
      },
    },
  });

  const submissionCount = await prisma.statement.count({
    where: {
      pollId,
      participantId,
      deleted: false,
    },
  });

  const hasReachedVoteLimit = poll.maxVotesPerParticipant
    ? voteCount >= poll.maxVotesPerParticipant
    : voteCount >= poll.statements.length;

  const hasMetSubmissionRequirement =
    !poll.minRequiredSubmissions ||
    submissionCount >= poll.minRequiredSubmissions;

  const isComplete = hasReachedVoteLimit && hasMetSubmissionRequirement;

  return {
    isComplete,
    message: isComplete ? (poll.completionMessage ?? undefined) : undefined,
    requiredSubmissions: poll.minRequiredSubmissions ?? undefined,
    currentSubmissions: submissionCount,
  };
}

export async function createAndActivateConstitution(
  modelId: string,
): Promise<Constitution> {
  const constitution = await createConstitution(modelId);
  await setActiveConstitution(modelId, constitution.uid);
  return constitution;
}
