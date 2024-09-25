import { prisma } from '@/lib/db';
import { auth } from '@clerk/nextjs/server';
import { CommunityModel, Constitution, Poll } from '@prisma/client';
import { cookies } from 'next/headers';
import { currentUser } from '@clerk/nextjs/server';

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

export async function getParticipantId() {
  const user = await currentUser();
  const cookieStore = cookies();

  if (user) {
    let participant = await prisma.participant.findUnique({
      where: { clerkUserId: user.id },
    });

    if (!participant) {
      participant = await prisma.participant.create({
        data: { clerkUserId: user.id },
      });
    }

    return participant.uid;
  } else {
    // For anonymous users
    let anonymousId = cookieStore.get('anonymousId')?.value;

    if (!anonymousId) {
      return null; // Handle this case in the action
    }

    let participant = await prisma.participant.findUnique({
      where: { anonymousId },
    });

    return participant ? participant.uid : null;
  }
}

export async function getPollData(pollId: string) {
  return prisma.poll.findUnique({
    where: { uid: pollId },
    include: {
      communityModel: {
        include: {
          owner: true
        }
      },
      statements: {
        where: { deleted: false }, // Add this line to filter out soft-deleted statements
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

export async function fetchUserVotes(pollId: string): Promise<Record<string, typeof VoteValue>> {
  const participantId = await getParticipantId();
  if (!participantId) return {};

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
  }, {} as Record<string, typeof VoteValue>);
}

export async function getCommunityModel(modelId: string): Promise<ExtendedCommunityModel | null> {
  const { userId: clerkUserId } = auth();

  console.log('Fetching community model:', modelId);
  console.log('Current Clerk user ID:', clerkUserId);

  if (!clerkUserId) {
    console.log('No user ID found');
    return null;
  }

  const communityModel = await prisma.communityModel.findUnique({
    where: { uid: modelId, deleted: false },
    include: {
      owner: true,
      activeConstitution: true,
      constitutions: {
        where: { deleted: false },
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
      polls: {
        where: { deleted: false },
      },
    },
  });

  console.log('Found community model:', communityModel);

  if (!communityModel) {
    console.log('Community model not found');
    return null;
  }

  // Check if this is the seeded user or if the Clerk user IDs match
  if (communityModel.owner.clerkUserId !== 'seeded_user' && communityModel.owner.clerkUserId !== clerkUserId) {
    console.log('User does not own this community model');
    console.log('Owner Clerk ID:', communityModel.owner.clerkUserId);
    console.log('Current Clerk ID:', clerkUserId);
    return null;
  }

  return communityModel as ExtendedCommunityModel;
}

export async function isPollOwner(pollId: string): Promise<boolean> {
  const { userId: clerkUserId } = auth();
  const participantId = await getParticipantId();

  if (!clerkUserId && !participantId) {
    return false;
  }

  const poll = await prisma.poll.findUnique({
    where: { uid: pollId },
    include: {
      communityModel: {
        include: {
          owner: true
        }
      }
    }
  });

  if (!poll) {
    return false;
  }

  // Check if it's a seeded user
  if (poll.communityModel.owner.clerkUserId === 'seeded_user') {
    // For seeded data, we'll check against participantId
    return poll.communityModel.owner.participantId === participantId;
  }

  // For non-seeded data, we'll check against both clerkUserId and participantId
  return (
    poll.communityModel.owner.clerkUserId === clerkUserId ||
    poll.communityModel.owner.participantId === participantId
  );
}