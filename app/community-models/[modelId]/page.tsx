// app/community-models/[modelId]/page.tsx
import { auth } from '@clerk/nextjs/server';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import Link from 'next/link';
import PollList from '@/lib/components/PollList';
import ConstitutionViewer from '@/lib/components/ConstitutionViewer';
import PageTitle from '@/lib/components/PageTitle';
import { CommunityModel, Constitution } from '@/lib/types';

export default async function CommunityModelPage({ params }: { params: { modelId: string } }) {
  const { userId } = auth();
  const { modelId } = params;

  const communityModel = await prisma.communityModel.findUnique({
    where: { uid: modelId },
    include: {
      owner: true,
      activeConstitution: true,
      constitutions: {
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
      polls: true,
    },
  }) as (CommunityModel & {
    constitutions: Constitution[];
    activeConstitution: Constitution | null;
  }) | null;

  if (!communityModel || communityModel.ownerId !== userId) {
    notFound();
  }

  const activeConstitution = communityModel.activeConstitution || communityModel.constitutions[0];

  return (
    <div className="container mx-auto px-4 py-8">
      <PageTitle title={communityModel.name} />
      <p className="mt-4 text-lg text-gray-600">{communityModel.initialIdea}</p>
      
      <div className="mt-8 space-y-8">
        <section>
          <h2 className="text-2xl font-semibold mb-4">Constitutions</h2>
          {communityModel.constitutions.length > 0 ? (
            <ul className="space-y-2">
              {communityModel.constitutions.map((constitution: Constitution) => (
                <li key={constitution.uid} className="flex items-center space-x-2">
                  <Link 
                    href={`/community-models/constitution/${constitution.uid}`} 
                    className="text-blue-600 hover:underline"
                  >
                    Constitution v{constitution.version}
                  </Link>
                  {constitution.uid === communityModel.activeConstitution?.uid && (
                    <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">
                      Active
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <>
              <p className="text-gray-600">There are currently no constitutions for this community model.</p>
              <Link href="/community-models/constitution/default" className="mt-4 inline-block text-blue-600 hover:underline">
                Try Default Constitution
              </Link>
            </>
          )}
        </section>
        
        <section>
          <h2 className="text-2xl font-semibold mb-4">Polls</h2>
          <PollList polls={communityModel.polls} />
        </section>
      </div>
    </div>
  );
}
