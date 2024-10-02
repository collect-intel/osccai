import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import ChatInterface from "@/lib/components/chat/ChatInterface";
import { setActiveConstitution } from "@/lib/actions";
import EditableConstitution from '@/lib/components/EditableConstitution';
import { FaArrowLeft } from 'react-icons/fa';

export default async function ConstitutionPage({
  params,
}: {
  params: { constitutionId: string };
}) {
  const constitution = await prisma.constitution.findUnique({
    where: { uid: params.constitutionId, deleted: false },
    include: { model: true },
  });

  if (!constitution) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8 flex h-screen">
      <div className="w-1/2 pr-4">
        <Link
          href={`/community-models/${constitution.modelId}`}
          className="mb-6 inline-flex items-center px-4 py-2 bg-teal text-white rounded hover:bg-slate-900 transition-colors"
        >
          <FaArrowLeft className="mr-2" />
          Back to Community Model
        </Link>
        <h1 className="text-2xl font-bold mb-4 mt-4">Constitution Details</h1>
        <p className="mt-2">Version: {constitution.version}</p>
        <p className="mt-2">
          Created at: {constitution.createdAt.toLocaleString()}
        </p>
        <p className="mt-2">Status: {constitution.status}</p>
        <div className="mt-4">
          <h2 className="text-xl font-semibold">Constitution Text</h2>
          <EditableConstitution
            constitutionId={constitution.uid}
            initialContent={constitution.content.trim()}
          />
        </div>
      </div>
      <div className="w-1/2 pl-4 flex flex-col h-full">
        <h2 className="text-2xl font-semibold mb-4">Try the AI Chatbot</h2>
        <div className="flex-grow overflow-hidden" style={{ maxHeight: 'calc(100% - 200px)' }}>
          <ChatInterface
            constitution={{
              text: constitution.content,
            }}
          />
        </div>
      </div>
    </div>
  );
}
