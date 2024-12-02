'use client';

import { useState } from 'react';
import ConstitutionalAIChat from '@/lib/components/chat/ConstitutionalAIChat';
import { ClientProvider, xmllm } from "xmllm/client";
import ConstitutionRefiner from '@/lib/components/custom_constitution/ConstitutionRefiner';
import RefinedDisplay from '@/lib/components/custom_constitution/RefinedDisplay';

const DEFAULT_CONSTITUTION = `For a small neighbourly community.`;

export default function CustomConstitutionPage() {
  const [constitution, setConstitution] = useState(DEFAULT_CONSTITUTION);
  const [refinedConstitution, setRefinedConstitution] = useState('');
  const [reflection, setreflection] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatId] = useState(`custom-${Date.now()}`);
  const [metrics, setMetrics] = useState<{ metric: string[] }>();

  const refineConstitution = async (rawConstitution: string) => {
    setIsRefining(true);
    setError(null);
    setreflection('');
    setMetrics(undefined);
    setRefinedConstitution('');

    try {
      const proxyUrl = process.env.NEXT_PUBLIC_PROXY_API_URL || "https://proxyai.cip.org/api/stream";
      const clientProvider = new ClientProvider(proxyUrl);

      const stream = await xmllm(({ prompt }: { prompt: any }) => {
        return [
          prompt({
            system: `
You are an expert at writing constitutions that drive AI behaviour for a variety of topics. These constitutions will be used to guide and align the behaviour of an AI. The subject matter of the constitution might be entirely unrelated to tech however. For example, the constitution might be to represent the needs of an elderly community, and thus may look like this:

<refined_constitution>
# Constitution for an AI representing the needs of an elderly community:
- The AI should be easy to use and understand
- The AI should be helpful and not harmful
- The AI should focus on diverse needs and preferences
- The AI should always self-identify as an AI assistant, not human
- The AI should not overly fixate on the needs of the elderly to the extent of patronizing language.
</refined_constitution>
            `.trim(),
            model: ["togetherai:good", "claude:good"],
            messages: [{
              role: "user",
              content: `Please help refine and structure this constitution which is to help align the behaviour of an AI (a Large Language Model). The constitution is regarding a specific topic or community outlined below. Make it clear, concise, and well-organized. Here's the raw details or early thoughts from the user/creator or community owner who is seeking to create a constitution to guide the behaviour of their AI:

=== BEGIN Initial thoughts or very-early-draft constitution ===
${rawConstitution}
=== END ===

Please begin by reflecting on what you think the consitution should contain.
THEN write the refined constitution. 
THEN determine the best metrics or rubric to use to judge any given response according to the constitution.

Please output a refined version that:
1. Is well-structured with clear sections
2. Removes any redundancy but enables high specificity
3. Makes the principles clear and actionable
4. Maintains the original intent but improves clarity
5. Uses consistent formatting

Output the refined constitution in a clean format with appropriate sections and bullet points where helpful.

The order of your output is:
<reflection>...</reflection>
<refined_constitution>
# Constitution on ____
## Preamble
This constitution is designed for a community of__

### Principle of ____
Etc.
</refined_constitution>
<constitution_metrics>...</constitution_metrics>`
            }],
            schema: {
              refined_constitution: String,
              constitution_metrics: {
                metric: [String]
              },
              reflection: String
            },
            hints: {
              refined_constitution: 'Refined constitution in markdown format with headings and bullet points. E.g. \n# Constitution on ____\n## Preamble\n...Etc.',
              constitution_metrics: {
                metric: ['A singular metric an AI can measure itself according to when attempting to follow the constitution.']
              },
              reflection: 'An initial reflection of what you think the constitution should contain, based on the initial user-provided constitution.'
            }
          })
        ];
      }, clientProvider);

      for await (const chunk of stream) {
        if (chunk.refined_constitution) {
          setRefinedConstitution(chunk.refined_constitution);
        }
        if (chunk.reflection) {
          setreflection(chunk.reflection);
        }
        if (chunk.constitution_metrics) {
          setMetrics(chunk.constitution_metrics);
        }
      }
    } catch (error) {
      console.error('Error refining constitution:', error);
      setError('Failed to refine constitution. Please try again.');
    } finally {
      setIsRefining(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b px-6 py-4 w-full">
        <div className="max-w-[1600px] mx-auto">
          <h1 className="text-2xl font-bold text-gray-800">Custom Constitution Dashboard</h1>
          <p className="text-gray-600 mt-1">Create and test your own AI constitution</p>
        </div>
      </header>

      {/* Main Content - Fixed height container */}
      <main className="flex-1 flex flex-col items-center">
        <div className="w-full max-w-[1600px] h-[calc(100vh-9rem)] flex">
          {/* Left Panel - Fixed height */}
          <div className="w-1/3 flex-shrink-0 border-r bg-white h-full">
            <ConstitutionRefiner 
              constitution={constitution}
              onConstitutionChange={setConstitution}
              isRefining={isRefining}
              error={error}
              onRefine={() => refineConstitution(constitution)}
            />
          </div>

          {/* Middle Panel - Scrollable */}
          <div className="w-1/3 flex-shrink-0 border-r bg-white overflow-y-auto">
            <RefinedDisplay
              isRefining={isRefining}
              refinedConstitution={refinedConstitution}
              reflection={reflection}
              metrics={metrics}
            />
          </div>

          {/* Right Panel - Fixed height */}
          <div className="w-1/3 flex-shrink-0 bg-white h-full">
            {refinedConstitution && !isRefining ? (
              <ConstitutionalAIChat
                chatId={chatId}
                modelId="custom"
                model="togetherai:good"
                constitution={{
                  text: `${refinedConstitution}\n\n${
                    metrics?.metric?.length ?
                      '# Metrics to be aware of:\n' + metrics?.metric.join('\n') : ''
                  }`,
                  color: "teal"
                }}
                ephemeral={true}
                initialMessage={{
                  role: "assistant",
                  content: `Hi there! I'm an AI assistant guided by this constitution. Feel free to test how I respond.`,
                }}
                customStyles={{
                  userMessage: "bg-white rounded-lg p-4 mb-4 shadow-sm border border-gray-100",
                  aiMessage: "bg-teal rounded-lg p-4 mb-4 shadow-sm text-white",
                  infoIcon: "text-white/80 hover:text-white transition-colors",
                }}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500 italic p-6">
                Chat will appear after constitution is refined...
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
} 