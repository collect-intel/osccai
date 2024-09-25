"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import type { ClerkUser, ClerkEmailAddress } from "@/lib/types";
import type {
  Poll,
  VoteValue as VoteValueType,
  Statement,
} from "@prisma/client";
import { VoteValue } from "@prisma/client";
import { init as initCuid } from "@paralleldrive/cuid2";
import { stringify } from "csv-stringify/sync";
import { currentUser } from "@clerk/nextjs/server";
import { v4 as uuidv4 } from "uuid";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { getParticipantId, getPollData } from "./data";
import {
  generateStatementsFromIdea,
  generateSimpleConstitution,
} from "./aiActions";

// According to the [CUID docs](https://github.com/paralleldrive/cuid2), there's a 50% chance of a collision after sqrt(36^(n-1) * 26) IDs, so this has a good chance of a collision after a few million IDs. We should check for collisions but we don't currently.
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
  const participantId = await getParticipantId();
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
  uid: string,
  statementsOrStr: string | Statement[],
) {
  const [separatedStatements, participantId] = await Promise.all([
    Array.isArray(statementsOrStr)
      ? statementsOrStr
      : // TODO: separateStatements(statementsOrStr),
        statementsOrStr.split("\n"),
    getParticipantId(),
  ]);
  if (!participantId) throw new Error("Participant not found");
  await prisma.statement.createMany({
    data: separatedStatements.map((text) =>
      typeof text === "string"
        ? {
            pollId: uid,
            text,
            participantId,
          }
        : {
            uid: text.uid,
            pollId: uid,
            text: text.text,
            participantId: text.participantId,
            status: text.status,
            createdAt: text.createdAt,
            updatedAt: text.updatedAt,
            deleted: text.deleted,
          },
    ),
  });
  revalidatePath(`/polls/${uid}`);
}

export async function submitStatement(pollId: string, text: string) {
  const participantId = await getParticipantId();
  if (!participantId) throw new Error("Participant not found");
  await prisma.statement.create({
    data: { pollId, text, participantId },
  });
  revalidatePath(`/polls/${pollId}`);
}

export async function flagStatement(statementId: string) {
  const participantId = await getParticipantId();
  if (!participantId) throw new Error("Participant not found");
  await prisma.flag.create({
    data: {
      statementId,
      participantId,
      reason: "TODO",
    },
  });
}

export async function submitVote(
  statementId: string,
  voteValue: VoteValueType,
  previousVote?: VoteValueType,
) {
  const participantId = await getParticipantId();
  if (!participantId) throw new Error("Participant not found");

  if (previousVote) {
    await prisma.vote.updateMany({
      where: {
        statementId,
        participantId,
        voteValue: previousVote,
      },
      data: { voteValue },
    });
  } else {
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

async function getOrCreateOwner(user: ClerkUser) {
  console.log("Getting or creating owner for user:", user);

  let owner = await prisma.communityModelOwner.findUnique({
    where: { clerkUserId: user.id },
  });

  if (!owner) {
    console.log("Owner not found, creating new owner");
    const participant = await getOrCreateParticipant(user.id);
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
          uid: user.id,
          name:
            (user.firstName || "Unknown") + " " + (user.lastName || "Unknown"),
          email: primaryEmailAddress || "Unknown",
          participantId: participant.uid,
        },
      });
      console.log("New owner created:", owner);
    } catch (error) {
      console.error("Error creating owner:", error);
      throw error;
    }
  } else if (!owner.participantId) {
    console.log("Owner found, but missing participantId. Updating owner...");
    const participant = await getOrCreateParticipant(user.id);
    await prisma.communityModelOwner.update({
      where: { uid: user.id },
      data: { participantId: participant.uid },
    });
    console.log("Owner updated with participantId");
  } else {
    console.log("Owner found:", owner);
  }

  return owner;
}

async function getOrCreateParticipant(userId: string) {
  let participant = await prisma.participant.findUnique({
    where: { uid: userId },
  });

  if (!participant) {
    participant = await prisma.participant.create({
      data: { uid: userId },
    });
  }

  return participant;
}

async function createInitialPoll(
  communityModelUid: string,
  name: string,
  participantId: string,
  statements: string[],
) {
  const pollId = createId();
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
      participantId,
    })),
  });

  return pollId;
}

export async function createCommunityModel(name: string, initialIdea: string) {
  "use server";
  const user = (await currentUser()) as ClerkUser | null;

  if (!user) {
    redirect("/sign-in");
  }

  const owner = await getOrCreateOwner(user);
  const participantId = owner.participantId || user.id;

  const communityModel = await prisma.communityModel.create({
    data: {
      uid: createId(),
      name,
      owner: { connect: { uid: owner.uid } },
      initialIdea,
      published: false,
    },
  });

  const statements = await generateStatementsFromIdea(initialIdea);
  await createInitialPoll(communityModel.uid, name, participantId, statements);

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

  await prisma.constitution.update({
    where: { uid: constitutionId },
    data: { deleted: true },
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

export async function createConstitution(communityModelId: string) {
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
              votes: {
                where: {
                  createdAt: {
                    gt:
                      (
                        await prisma.constitution.findFirst({
                          where: { modelId: communityModelId },
                          orderBy: { createdAt: "desc" },
                          select: { createdAt: true, version: true },
                        })
                      )?.createdAt || new Date(0), // Add a fallback date
                  },
                },
              },
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

  const isFirstConstitution = !latestConstitution;
  const hasNewVotes = communityModel.polls.some((poll) =>
    poll.statements.some((statement) => statement.votes.length > 0),
  );

  if (!isFirstConstitution && !hasNewVotes) {
    throw new Error("No new poll data available to create a new constitution");
  }

  let constitutionContent: string;

  if (isFirstConstitution) {
    constitutionContent = await generateSimpleConstitution(
      communityModel.initialIdea,
    );
  } else {
    // Implement actual constitution generation logic here
    constitutionContent = `CONSTITUTION VERSION ${newVersion}:

Based on new poll data, this constitution has been updated.
(Implement actual constitution generation logic here)`;
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
) {
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
  const { userId } = auth();
  if (!userId) {
    throw new Error("User not authenticated");
  }

  const user = await clerkClient.users.getUser(userId);
  const primaryEmailAddress = user.emailAddresses.find(
    (email) => email.id === user.primaryEmailAddressId,
  )?.emailAddress;

  if (!primaryEmailAddress) {
    throw new Error("User primary email not found");
  }

  const existingOwner = await prisma.communityModelOwner.findUnique({
    where: { email: primaryEmailAddress },
  });

  if (existingOwner) {
    // Link the Clerk user ID to the existing CommunityModelOwner
    await prisma.communityModelOwner.update({
      where: { email: primaryEmailAddress },
      data: { clerkUserId: userId },
    });
  } else {
    // Create a new CommunityModelOwner if one doesn't exist
    await prisma.communityModelOwner.create({
      data: {
        uid: uuidv4(),
        name: user.firstName || "Unknown",
        email: primaryEmailAddress,
        clerkUserId: userId,
        participant: {
          create: {
            uid: uuidv4(),
          },
        },
      },
    });
  }
}

export async function updatePoll(
  uid: string,
  data: {
    title: string;
    description: string;
    statements: Statement[];
    requireAuth: boolean;
    allowParticipantStatements: boolean;
  },
) {
  const {
    title,
    description,
    statements,
    requireAuth,
    allowParticipantStatements,
  } = data;

  // Get the current user's participantId
  const participantId = await getParticipantId();
  if (!participantId) throw new Error("Participant not found");

  await prisma.poll.update({
    where: { uid },
    data: {
      title,
      description,
      requireAuth,
      allowParticipantStatements,
      statements: {
        upsert: statements.map((statement) => ({
          where: { uid: statement.uid },
          update: { text: statement.text },
          create: {
            uid: statement.uid,
            text: statement.text,
            participantId: participantId, // Use the current user's participantId
          },
        })),
      },
    },
  });

  revalidatePath(`/polls/${uid}`);
}
