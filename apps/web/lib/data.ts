"use server";
import { prisma } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import {
  CommunityModel,
  Constitution,
  Poll,
  ApiKey,
  Statement,
  Vote,
} from "@prisma/client";
import { currentUser } from "@clerk/nextjs/server";
import { isStatementConstitutionable } from "@/lib/utils/pollUtils";
import type { ExtendedPoll, Principle } from "@/lib/types";
import { isCurrentUserAdmin } from "@/lib/utils/admin";

export async function getUserCommunityModels() {
  const { userId: clerkUserId } = auth();

  if (!clerkUserId) {
    return null;
  }

  const dbUser = await prisma.communityModelOwner.findUnique({
    where: { clerkUserId },
  });

  if (!dbUser) {
    return null;
  }

  const communityModels = await prisma.communityModel.findMany({
    where: { ownerId: dbUser.uid, deleted: false },
  });

  return communityModels;
}

export async function getPollData(
  pollId: string,
): Promise<ExtendedPoll | null> {
  const poll = await prisma.poll.findUnique({
    where: { uid: pollId },
    include: {
      statements: {
        include: {
          votes: true,
          flags: true,
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
    return null;
  }

  const {
    minVotesBeforeSubmission,
    maxVotesPerParticipant,
    maxSubmissionsPerParticipant,
    minRequiredSubmissions,
    completionMessage,
    ...restPoll
  } = poll;

  return {
    ...restPoll,
    minVotesBeforeSubmission: minVotesBeforeSubmission ?? undefined,
    maxVotesPerParticipant: maxVotesPerParticipant ?? undefined,
    maxSubmissionsPerParticipant: maxSubmissionsPerParticipant ?? undefined,
    minRequiredSubmissions: minRequiredSubmissions ?? undefined,
    completionMessage: completionMessage ?? undefined,
    statements: poll.statements.map(
      (statement: Statement & { votes: Vote[]; flags: any[] }) => ({
        ...statement,
        isConstitutionable: isStatementConstitutionable(statement),
      }),
    ),
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

export async function getCommunityModel(modelId: string): Promise<{
  uid: string;
  name: string;
  bio: string | null;
  goal: string | null;
  logoUrl: string | null;
  published: boolean;
  apiEnabled: boolean;
  advancedOptionsEnabled: boolean;
  autoCreateConstitution: boolean;
  owner: {
    uid: string;
    clerkUserId: string | null;
    name: string;
    imageUrl: string | null;
  };
  principles: Principle[];
  polls: Poll[];
  constitutions: Constitution[];
  activeConstitutionId: string | null;
  requireAuth: boolean;
  allowContributions: boolean;
} | null> {
  const { userId: clerkUserId } = auth();

  if (!clerkUserId) {
    return null;
  }

  const dbUser = await prisma.communityModelOwner.findUnique({
    where: { clerkUserId },
  });

  if (!dbUser) {
    return null;
  }

  // Check if user is admin
  const isAdmin = await isCurrentUserAdmin();

  // If user is admin, OR if the model is published, allow access to any model
  // Otherwise, only allow access to models owned by the user
  const model = await prisma.communityModel.findUnique({
    where: {
      uid: modelId,
      deleted: false,
      OR: [
        { published: true },
        { ownerId: dbUser?.uid },
        ...(isAdmin ? [{}] : []),
      ],
    },
    include: {
      owner: {
        select: {
          uid: true,
          name: true,
          clerkUserId: true,
        },
      },
      activeConstitution: true,
      constitutions: {
        where: {
          deleted: false,
        },
        orderBy: {
          version: "desc",
        },
      },
      polls: {
        where: {
          deleted: false,
        },
        orderBy: {
          createdAt: "desc",
        },
        include: {
          statements: {
            where: {
              deleted: false,
            },
          },
        },
      },
      apiKeys: true,
    },
  });

  if (!model) {
    throw new Error(`Community model with ID ${modelId} not found`);
  }

  const firstPoll = model.polls[0];
  const principles =
    firstPoll?.statements?.map((s) => ({
      id: s.uid,
      text: s.text,
      gacScore: s.gacScore ?? null,
    })) || [];

  return {
    uid: model.uid,
    name: model.name,
    bio: model.bio,
    goal: model.goal,
    logoUrl: model.logoUrl,
    published: model.published,
    apiEnabled: model.apiEnabled,
    advancedOptionsEnabled: model.advancedOptionsEnabled,
    autoCreateConstitution: model.autoCreateConstitution,
    owner: {
      uid: model.owner.uid,
      clerkUserId: model.owner.clerkUserId,
      name: model.owner.name,
      imageUrl: null, // Note: Add this field to CommunityModelOwner if needed
    },
    principles,
    polls: model.polls,
    constitutions: model.constitutions,
    activeConstitutionId: model.activeConstitutionId,
    requireAuth: firstPoll?.requireAuth || false,
    allowContributions: firstPoll?.allowParticipantStatements || false,
  };
}
