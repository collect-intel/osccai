'use client';

import { useState } from 'react';
import ConstitutionalAIChat from '@/lib/components/chat/ConstitutionalAIChat';
import { ClientProvider, xmllm } from "xmllm/client";
import ConstitutionRefiner from '@/lib/components/constitution/ConstitutionRefiner';
import RefinedDisplay from '@/lib/components/constitution/RefinedDisplay';

const DEFAULT_CONSTITUTION = `This AI constitution is designed for a community of neighbors in a rural town and should reflect their priorities.

The AI should:
- Prioritize local knowledge and traditional farming/rural practices
- Respect the tight-knit nature of small communities
- Understand the importance of self-reliance and mutual aid
- Consider the impact on local businesses and farmers
- Preserve rural values and way of life
- Support sustainable land management
- Encourage community gatherings and events
- Value practical, hands-on solutions
- Respect privacy and property rights
- Promote intergenerational knowledge sharing
- Support local food systems and farmers markets
- Consider the pace and rhythm of rural life`;

export default function CustomConstitutionPage() {
  const [constitution, setConstitution] = useState(DEFAULT_CONSTITUTION);
  const [refinedConstitution, setRefinedConstitution] = useState('');
  const [reasoning, setReasoning] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatId] = useState(`custom-${Date.now()}`);
  const [metrics, setMetrics] = useState<{ metric: string[] }>();

  const refineConstitution = async (rawConstitution: string) => {
    setIsRefining(true);
    setError(null);
    setReasoning('');
    setMetrics(undefined);
    try {
      const proxyUrl = process.env.NEXT_PUBLIC_PROXY_API_URL || "https://proxyai.cip.org/api/stream";
      const clientProvider = new ClientProvider(proxyUrl);

      const stream = await xmllm(({ prompt }: { prompt: any }) => {
        return [
          prompt({
            model: ["togetherai:good", "claude:good"],
            messages: [{
              role: "user",
              content: `Please help refine and structure this AI constitution. Make it clear, concise, and well-organized. Here's the raw constitution:

${rawConstitution}

Please output a refined version that:
1. Is well-structured with clear sections
2. Removes any redundancy
3. Makes the principles clear and actionable
4. Maintains the original intent but improves clarity
5. Uses consistent formatting

Provide reasoning and reflections in <reasoning/>

Output the refined constitution in a clean format with appropriate sections and bullet points where helpful.`
            }],
            schema: {
              refined_constitution: String,
              constitution_metrics: {
                metric: [String]
              },
              reasoning: String
            },
            hints: {
              refined_constitution: 'Markdwown rich with headings and in the style of a constitution.',
              constitution_metrics: {
                metric: ['A singular metric an AI can measure itself according to when attempting to follow the constitution.']
              },
              reasoning: 'An initial reflection of what you think the constitution should contain, based on the initial user-provided constitution.'
            }
          }),
          function* (t: any) {
            console.log('>chunk',t);
            yield t;
          },
        ];
      }, clientProvider);

      for await (const chunk of stream) {
        if (chunk.refined_constitution) {
          setRefinedConstitution(chunk.refined_constitution);
        }
        if (chunk.reasoning) {
          setReasoning(chunk.reasoning);
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
              onRefinedConstitution={setRefinedConstitution}
              onReasoning={setReasoning}
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
              reasoning={reasoning}
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
                  text: refinedConstitution,
                  color: "teal"
                }}
                ephemeral={true}
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