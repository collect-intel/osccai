import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import ChatInterface from '@/lib/components/chat/ChatInterface';
import { setActiveConstitution } from '@/lib/actions';

export default async function ConstitutionPage({ params }: { params: { constitutionId: string } }) {
  const constitution = await prisma.constitution.findUnique({
    where: { uid: params.constitutionId, deleted: false },
    include: { model: true },
  });

  if (!constitution) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Constitution Details</h1>
      <p className="mt-2">Version: {constitution.version}</p>
      <p className="mt-2">Created at: {constitution.createdAt.toLocaleString()}</p>
      <p className="mt-2">Status: {constitution.status}</p>
      {constitution.status !== "ACTIVE" && (
        <form action={setActiveConstitution.bind(null, constitution.modelId, constitution.uid)} className="mt-4">
          <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
            Set as Active Constitution
          </button>
        </form>
      )}
      <div className="mt-4">
        <h2 className="text-xl font-semibold">Constitution Text</h2>
        <div className="mt-2 p-4 bg-gray-100 rounded whitespace-pre-wrap">{constitution.content}</div>
      </div>
      <div className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">Try the AI Chatbot</h2>
        <ChatInterface
          constitution={{
            text: constitution.content,
          }}
        />
      </div>
      <Link href={`/community-models/${constitution.modelId}`} className="mt-4 inline-block text-blue-600 hover:underline">
        Back to Community Model
      </Link>
    </div>
  );
}