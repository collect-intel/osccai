import { redirect } from "next/navigation";
import CommunityModelCard from "@/lib/components/CommunityModelCard";
import Link from "next/link";
import { getUserCommunityModels } from "@/lib/data";
import { ExtendedCommunityModel } from "@/lib/types";
import { CommunityModel } from '@prisma/client';

export default async function CommunityModelsPage() {
  const communityModels = await getUserCommunityModels();

  if (communityModels === null) {
    redirect("/sign-in");
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 md:py-8">
      <h1 className="text-2xl md:text-3xl font-bold mb-6">My Community Models</h1>

      <div className="bg-white border border-yellow rounded-lg p-4 md:p-6 mb-6 md:mb-8">
        <h2 className="text-lg md:text-xl font-semibold mb-3 md:mb-4">
          What are Community Models?
        </h2>
        <p className="text-sm md:text-base mb-4">
          Community Models are AI models shaped by collective input. They
          represent a shared vision of how AI should behave, based on the votes
          and contributions of community members.
        </p>
        <p className="text-sm md:text-base mb-3">With your Community Models, you can:</p>
        <ul className="list-disc list-inside mb-4 text-sm md:text-base space-y-2">
          <li>Create new models based on initial ideas</li>
          <li>Run polls to gather community input</li>
          <li>Refine and evolve your models over time</li>
          <li>Use these models to guide AI behavior in various applications</li>
        </ul>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-xl md:text-2xl font-semibold">My Models</h2>
        <Link
          href="/community-models/flow"
          className="w-full sm:w-auto bg-teal text-white py-2.5 px-4 rounded text-center hover:bg-teal-dark transition-colors"
        >
          + New Community Model
        </Link>
      </div>

      {communityModels.length === 0 ? (
        <div className="bg-white rounded-lg p-4 md:p-6 text-gray-600 text-sm md:text-base">
          You haven't created any Community Models yet. Why not start by
          creating one?
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {communityModels.map((model: CommunityModel) => (
            <CommunityModelCard key={model.uid} model={model} />
          ))}
        </div>
      )}
    </div>
  );
}
