import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "./db";

export async function isCreator(ownerId: string | undefined): Promise<boolean> {
  const user = await currentUser();

  if (!user) {
    return false;
  }

  const owner = await prisma.communityModelOwner.findUnique({
    where: { uid: ownerId },
    select: { clerkUserId: true },
  });

  return owner?.clerkUserId === user.id;
}
