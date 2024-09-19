import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import CommunityModelCard from '@/lib/components/CommunityModelCard';
import NewCommunityModelForm from '@/lib/components/NewCommunityModelForm';
import { redirect } from 'next/navigation';

export default async function CommunityModelsPage() {
  const { userId } = auth();

  if (!userId) {
    redirect('/sign-in');
  }

  const communityModels = await prisma.communityModel.findMany({
    where: { ownerId: userId },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">My Community Models</h1>
      <NewCommunityModelForm />
      <div className="grid grid-cols-3 gap-6 mt-6">
        {communityModels.map((model: any) => (
          <CommunityModelCard key={model.uid} model={model} />
        ))}
      </div>
    </div>
  );
}
