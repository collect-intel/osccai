import { currentUser } from '@clerk/nextjs/server';

export async function isCreator(creatorId: string | undefined): Promise<boolean> {
  const user = await currentUser();

  console.log('user', user);

  if (!user) {
    return false;
  }

  return user.id === creatorId;
}