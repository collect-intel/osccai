import { prisma } from "@/lib/db";
import Link from "next/link";
import PageTitle from "@/lib/components/PageTitle";
import ConstitutionIcon from "@/lib/components/icons/ConstitutionIcon";
import type { PublishedModel } from "@/lib/types";

export default async function LibraryPage() {
  const publishedModels = await prisma.communityModel.findMany({
    where: {
      published: true,
      deleted: false,
      constitutions: {
        some: {
          deleted: false,
        },
      },
    },
    select: {
      uid: true,
      name: true,
      bio: true,
      constitutions: {
        where: { deleted: false },
        orderBy: { version: "desc" },
        take: 1,
        select: {
          version: true,
        },
      },
    },
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <PageTitle title="Community Model Library" />
      <p className="mt-4 text-lg text-gray-600 max-w-2xl">
        Explore published community models and chat with AI assistants that are
        aligned with their constitutional values.
      </p>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {publishedModels.map((model: PublishedModel) => {
          const version = model.constitutions[0]?.version;

          return (
            <Link
              key={model.uid}
              href={`/community-models/chat/${model.uid}`}
              className="block p-6 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-2 mb-3">
                <ConstitutionIcon className="w-5 h-5 text-teal" />
                <div className="text-xs bg-gray-100 px-2 py-1 rounded-full">
                  v{version}
                </div>
              </div>
              <h2 className="mb-2 text-xl font-semibold tracking-tight text-gray-900">
                {model.name}
              </h2>
              <p className="text-gray-600 text-sm line-clamp-3">{model.bio}</p>
              <div className="mt-4 text-teal text-sm font-medium hover:text-teal-dark">
                Start chatting →
              </div>
            </Link>
          );
        })}
      </div>

      {publishedModels.length === 0 && (
        <div className="mt-8 text-center text-gray-600">
          <p>No published community models available yet.</p>
        </div>
      )}
    </div>
  );
}
