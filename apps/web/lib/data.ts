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
import type { ExtendedPoll } from "@/lib/types";

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
    statements: poll.statements.map((statement: Statement & { votes: Vote[]; flags: any[] }) => ({
      ...statement,
      isConstitutionable: isStatementConstitutionable(statement),
    })),
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

export async function getCommunityModel(modelId: string): Promise<
  | (CommunityModel & {
      principles: Array<{ id: string; text: string; gacScore?: number }>;
      requireAuth: boolean;
      allowContributions: boolean;
      constitutions: Constitution[];
      activeConstitution: Constitution | null;
      polls: Poll[];
      published: boolean;
      ownerId: string;
      owner: { uid: string; name: string; clerkUserId: string };
      apiKeys: ApiKey[];
    })
  | null
> {
  const model = await prisma.communityModel.findUnique({
    where: { uid: modelId },
    include: {
      owner: true,
      polls: {
        include: {
          statements: {
            include: {
              votes: true,
            },
          },
        },
      },
      constitutions: true,
      activeConstitution: true,
      apiKeys: true,
    },
  });

  if (!model) {
    return null;
  }

  const firstPoll = model.polls[0];

  return {
    ...model,
    principles:
      firstPoll?.statements.map((s: Statement & { votes: Vote[] }) => ({
        id: s.uid,
        text: s.text,
        gacScore: s.gacScore || undefined,
      })) || [],
    requireAuth: firstPoll?.requireAuth || false,
    allowContributions: firstPoll?.allowParticipantStatements || false,
    constitutions: model.constitutions,
    published: model.published || false,
    ownerId: model.ownerId,
    owner: {
      uid: model.owner.uid,
      name: model.owner.name || "",
      clerkUserId: model.owner.clerkUserId || "",
    },
    apiKeys: model.apiKeys || [],
  };
}
