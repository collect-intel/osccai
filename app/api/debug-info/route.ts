import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { prisma } from "@/lib/db";

export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  const { userId } = auth();
  let clerkUser = null;
  let dbUser = null;
  let activeCommunityModels = null;

  const firstTenCommunityModels = await prisma.communityModel.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    select: {
      uid: true,
      name: true,
      initialIdea: true,
      ownerId: true,
      published: true,
      createdAt: true
    }
  });

  if (userId) {
    clerkUser = await currentUser() || undefined;
    dbUser = await prisma.communityModelOwner.findUnique({
      where: { clerkUserId: userId },
      include: { participant: true }
    });

    if (dbUser) {
      activeCommunityModels = await prisma.communityModel.findMany({
        where: { 
          ownerId: dbUser.uid,
          deleted: false,
          published: true
        },
        select: {
          uid: true,
          name: true,
          deleted: true,
          initialIdea: true
        }
      });
    }
  }

  return NextResponse.json({
    clerkUser,
    dbUser,
    activeCommunityModels,
    firstTenCommunityModels
  });
}