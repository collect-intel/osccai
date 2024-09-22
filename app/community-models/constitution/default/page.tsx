import ConstitutionViewer from '@/lib/components/ConstitutionViewer';
import ChatInterface from '@/lib/components/ChatInterface';

const defaultConstitution = {
  uid: 'default',
  version: '0.0',
  content: `This is a default constitution for demonstration purposes.

1. The community model will strive for fairness and equality.
2. All members have the right to express their opinions respectfully.
3. Decisions will be made through democratic processes.
4. The model will adapt and evolve based on community feedback.`,
  createdAt: new Date(),
  updatedAt: new Date(),
  modelId: 'default',
};

export default function DefaultConstitutionPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Default Constitution</h1>
      <p className="mb-4">
        This is a default constitution for demonstration purposes. It allows you to interact 
        with the AI chatbot as if a real constitution was in place.
      </p>
      <ConstitutionViewer constitution={defaultConstitution} />
      <div className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">Try the AI Chatbot</h2>
        <ChatInterface constitutionId="default" />
      </div>
    </div>
  );
}