"use server";
import { prisma } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { CommunityModel, Constitution, Poll } from "@prisma/client";
import { currentUser } from "@clerk/nextjs/server";

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
  return prisma.poll.findUnique({
    where: { uid: pollId },
    include: {
      communityModel: {
        include: {
          owner: true,
        },
      },
      statements: {
        where: { deleted: false },
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
}

export async function getCommunityModel(
  modelId: string,
): Promise<ExtendedCommunityModel | null> {
  const { userId: clerkUserId } = auth();

  if (!clerkUserId) {
    return null;
  }

  const communityModel = await prisma.communityModel.findUnique({
    where: { uid: modelId, deleted: false },
    include: {
      owner: true,
      activeConstitution: true,
      constitutions: {
        where: { deleted: false },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
      polls: {
        where: { deleted: false },
      },
    },
  });

  if (!communityModel) {
    return null;
  }

  if (
    communityModel.owner.clerkUserId !== "seeded_user" &&
    communityModel.owner.clerkUserId !== clerkUserId
  ) {
    return null;
  }

  return communityModel as ExtendedCommunityModel;
}
