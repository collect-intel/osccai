"use server";
import { prisma } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { CommunityModel, Constitution, Poll } from "@prisma/client";
import { currentUser } from "@clerk/nextjs/server";
import { isStatementConstitutionable } from "@/lib/utils/pollUtils";

type ExtendedCommunityModel = CommunityModel & {
  owner: { uid: string };
  constitutions: Constitution[];
  activeConstitution: Constitution | null;
  polls: Poll[];
};

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

export async function getPollData(pollId: string) {
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

  return {
    ...poll,
    statements: poll.statements.map((statement) => ({
      ...statement,
      isConstitutionable: isStatementConstitutionable(statement),
    })),
  };
}

export async function getCommunityModel(
  modelId: string,
): Promise<
  | (CommunityModel & {
      principles: Array<{ id: string; text: string; gacScore?: number }>;
      requireAuth: boolean;
      allowContributions: boolean;
      constitutions: Constitution[];
      polls: Poll[];
      published: boolean;
    })
  | null
> {
  const model = await prisma.communityModel.findUnique({
    where: { uid: modelId },
    include: {
      polls: {
        include: {
          statements: true,
        },
      },
      constitutions: true,
    },
  });

  if (!model) {
    return null;
  }

  const firstPoll = model.polls[0];

  return {
    ...model,
    principles:
      firstPoll?.statements.map((s) => ({
        id: s.uid,
        text: s.text,
        gacScore: s.gacScore || undefined,
      })) || [],
    requireAuth: firstPoll?.requireAuth || false,
    allowContributions: firstPoll?.allowParticipantStatements || false,
    constitutions: model.constitutions,
    published: model.published || false,
  };
}
