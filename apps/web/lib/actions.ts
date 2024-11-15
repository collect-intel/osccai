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
  ConstitutionStatus,
} from "@prisma/client";
import { VoteValue } from "@prisma/client";
import { init as initCuid } from "@paralleldrive/cuid2";
import { stringify } from "csv-stringify/sync";
import { currentUser, auth } from "@clerk/nextjs/server";
import { getPollData } from "./data";
import { deleteFile } from "@/lib/utils/uploader";
import { isStatementConstitutionable } from "@/lib/utils/pollUtils";
import { generateApiKey } from '@/lib/utils/server/api-keys';
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

  return await prisma.$transaction(async (prisma) => {
    // First, check if the statement exists
    const statement = await prisma.statement.findUnique({
      where: { uid: statementId },
    });

    if (!statement) {
      throw new Error("Statement not found");
    }

    if (previousVote) {
      // Update the existing vote
      await prisma.vote.updateMany({
        where: {
          statementId,
          participantId,
        },
        data: { voteValue },
      });

      // Update vote counts
      await updateVoteCounts(statementId, previousVote, voteValue);
    } else {
      // Create a new vote
      try {
        await retryOperation(() =>
          prisma.vote.create({
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

    // Fetch and return updated statement
    return prisma.statement.findUnique({
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

  await prisma.statement.update({
    where: { uid: statementId },
    data: updateData,
  });
}

async function incrementVoteCount(statementId: string, voteValue: VoteValue) {
  const updateData: any = {};

  if (voteValue === VoteValue.AGREE) updateData.agreeCount = { increment: 1 };
  if (voteValue === VoteValue.DISAGREE)
    updateData.disagreeCount = { increment: 1 };
  if (voteValue === VoteValue.PASS) updateData.passCount = { increment: 1 };

  await prisma.statement.update({
    where: { uid: statementId },
    data: updateData,
  });
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
      participantId: owner.participantId ?? "",
    })),
  });

  return pollId;
}

export async function createCommunityModel(
  data: Partial<CommunityModel> & {
    principles?: Array<{ id: string; text: string; gacScore?: number }>;
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
    principles?: Array<{ id: string; text: string; gacScore?: number }>;
    requireAuth?: boolean;
    allowContributions?: boolean;
    constitutions?: Constitution[];
    activeConstitutionId?: string | null;
  },
): Promise<CommunityModel & { polls: Poll[] }> {
  const {
    principles,
    requireAuth,
    allowContributions,
    constitutions,
    activeConstitutionId,
    ...modelData
  } = data;

  try {
    const updatedModel = await prisma.$transaction(async (prisma) => {
      // Update the community model
      const model = await prisma.communityModel.update({
        where: { uid: modelId },
        data: {
          ...modelData,
          activeConstitutionId:
            activeConstitutionId !== undefined
              ? activeConstitutionId
              : undefined,
        },
        include: { polls: true, owner: true },
      });

      // Update all associated polls
      if (requireAuth !== undefined || allowContributions !== undefined) {
        await prisma.poll.updateMany({
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
        const poll = await prisma.poll.findFirst({
          where: { communityModelId: modelId },
          include: { statements: true },
        });

        if (poll) {
          // Ensure the owner has a linked participant
          let participantId = model.owner.participantId;
          if (!participantId) {
            const participant = await prisma.participant.create({
              data: {
                clerkUserId: model.owner.clerkUserId,
              },
            });
            participantId = participant.uid;
            await prisma.communityModelOwner.update({
              where: { uid: model.owner.uid },
              data: { participantId: participantId },
            });
          }

          const updatedPrinciples = [];

          // Update existing principles and add new ones
          for (const principle of principles) {
            if (principle.id.startsWith("new-")) {
              // This is a new principle, create it
              const newStatement = await prisma.statement.create({
                data: {
                  pollId: poll.uid,
                  text: principle.text,
                  gacScore: principle.gacScore,
                  participantId: participantId,
                },
              });
              updatedPrinciples.push(newStatement);
            } else {
              // This is an existing principle, update it
              const updatedStatement = await prisma.statement.update({
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

          // Delete principles that are no longer in the list
          for (const statement of statementsToDelete) {
            await prisma.vote.deleteMany({
              where: { statementId: statement.uid },
            });

            await prisma.flag.deleteMany({
              where: { statementId: statement.uid },
            });

            await prisma.statement.delete({
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
            await prisma.constitution.update({
              where: { uid: constitution.uid },
              data: {
                content: constitution.content,
                status: constitution.status,
              },
            });
          } else {
            await prisma.constitution.create({
              data: {
                modelId: modelId,
                content: constitution.content,
                status: constitution.status,
                version: constitution.version,
              },
            });
          }
        }
      }

      // Fetch the updated model with polls and constitutions
      return prisma.communityModel.findUnique({
        where: { uid: modelId },
        include: {
          polls: { include: { statements: true } },
          constitutions: true,
        },
      });
    });

    if (!updatedModel) {
      throw new Error("Failed to update community model");
    }

    return updatedModel;
  } catch (error) {
    console.error("Error updating community model:", error);
    throw error;
  }
}

export async function fetchPollData(
  modelId: string,
): Promise<Poll & { statements: Statement[] }> {
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
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!poll) {
    throw new Error("No poll found for this community model");
  }

  // Calculate isConstitutionable for each statement
  const statementsWithConstitutionable = poll.statements.map((statement) => {
    const totalVotes = statement.votes.length;
    const agreeVotes = statement.votes.filter(
      (vote) => vote.voteValue === "AGREE",
    ).length;
    const agreePercentage =
      totalVotes > 0 ? (agreeVotes / totalVotes) * 100 : 0;

    return {
      ...statement,
      // If isConstitutionable is not explicitly set, use the agreePercentage threshold
      isConstitutionable:
        statement.isConstitutionable ?? agreePercentage >= 66.67,
    };
  });

  return {
    ...poll,
    statements: statementsWithConstitutionable,
  };
}

export async function createApiKey(modelId: string, ownerId: string, name: string) {
  console.log('Creating API key:', { modelId, ownerId, name });
  
  if (!ownerId || ownerId === "") {
    throw new Error("Invalid owner ID provided");
  }

  if (!name || name.trim() === "") {
    throw new Error("API key name is required");
  }

  const owner = await prisma.communityModelOwner.findUnique({
    where: { uid: ownerId }
  });

  if (!owner) {
    console.error(`Owner not found for ID: ${ownerId}`);
    throw new Error("Owner not found");
  }

  // Generate the API key
  const { raw, hashed } = await generateApiKey('sk');
  
  // Store only the hashed version in the database
  const apiKey = await prisma.apiKey.create({
    data: {
      key: hashed,
      name,
      ownerId,
      modelId,
    }
  });
  
  // Return the raw key only once - it will never be accessible again
  return {
    id: apiKey.uid,
    key: raw,
    name: apiKey.name!,
    createdAt: apiKey.createdAt
  };
}
