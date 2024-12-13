'use client';

import { useState, useEffect } from 'react';
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
  const [activeTab, setActiveTab] = useState('constitution');
  const [progress, setProgress] = useState(0);

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
<constitution_metrics>...</constitution_metrics>

Regarding metrics, they will help the AI self-reflect and measure itself according to when attempting to follow the constitution. This IS NOT a metric of the community itself, because the AI has no control over that; it is only a metric of AI behaviours. An example would be "kindness" or "avoid over-stereotyping or fixating".

`
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
                metric: ['A singular metric an AI can measure itself according to.']
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

  useEffect(() => {
    if (refinedConstitution && !isRefining && window.innerWidth < 1024) {
      setActiveTab('chat');
    }
  }, [refinedConstitution, isRefining]);

  useEffect(() => {
    if (isRefining) {
      const interval = setInterval(() => {
        setProgress(p => Math.min(p + Math.random() * 15, 90));
      }, 500);
      return () => clearInterval(interval);
    } else {
      setProgress(0);
    }
  }, [isRefining]);

  return (
    <div className="p-6 lg:block">
      {/* Main Container */}
      <div className="max-w-[1600px] mx-auto bg-white/50 rounded-2xl shadow-sm overflow-hidden">
        {/* Header - More compact on mobile */}
        <header className="px-4 pt-4 lg:px-8 lg:pt-6">
          <h1 className="text-xl lg:text-2xl font-bold text-gray-800">Experiment with your own AI Constitution</h1>
          <p className="text-sm lg:text-base text-gray-600 mt-1">
            Create and test your own AI constitution. Changes are not saved.
          </p>
          {isRefining && (
            <div className="relative h-0.5 bg-gray-100">
              <div 
                className="absolute h-full bg-teal-600 transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </header>

        {/* Mobile Navigation */}
        <div className="lg:hidden px-4 pb-2">
          <div className="flex gap-2 bg-white p-1 rounded-lg shadow-sm">
            <button 
              onClick={() => setActiveTab('constitution')}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors
                ${activeTab === 'constitution' 
                  ? 'bg-teal-600 text-white' 
                  : 'text-gray-600 hover:bg-gray-50'
                }`}
            >
              Constitution
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors
                ${activeTab === 'chat' 
                  ? 'bg-teal-600 text-white' 
                  : 'text-gray-600 hover:bg-gray-50'
                }
                ${isRefining ? 'opacity-50 cursor-not-allowed' : ''}
              `}
              disabled={isRefining}
            >
              Chat {isRefining && <span className="ml-2 inline-block animate-pulse">•</span>}
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="p-4 lg:p-6">
          <div className={`
            relative
            flex flex-col lg:flex-row lg:gap-6 
            h-[calc(100vh-12rem)] lg:h-[calc(100vh-16rem)]
            -mt-2 lg:mt-0
          `}>
            {/* Left Panel - Constitution Input & Refined Display */}
            <div className={`
              absolute lg:relative inset-0
              w-full lg:w-[50%] flex flex-col gap-4 lg:gap-6
              ${activeTab === 'constitution' 
                ? 'opacity-100 translate-x-0' 
                : 'opacity-0 translate-x-full lg:opacity-100 lg:translate-x-0 pointer-events-none lg:pointer-events-auto'
              }
            `}>
              {/* Constitution Input Card */}
              <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] overflow-hidden">
                <ConstitutionRefiner 
                  constitution={constitution}
                  onConstitutionChange={setConstitution}
                  isRefining={isRefining}
                  error={error}
                  onRefine={() => refineConstitution(constitution)}
                />
              </div>

              {/* Refined Display Card */}
              <div className="flex-1 bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] overflow-hidden">
                <RefinedDisplay
                  isRefining={isRefining}
                  refinedConstitution={refinedConstitution}
                  reflection={reflection}
                  metrics={metrics}
                />
              </div>
            </div>

            {/* Right Panel - Chat Interface */}
            <div className={`
              absolute lg:relative inset-0
              w-full lg:w-[50%] bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.08)]
              overflow-hidden h-full
              ${activeTab === 'chat' ? 'block' : 'hidden lg:flex'}
            `}>
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
                  userMessage: "bg-gray-50/50 rounded-lg p-4 mb-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)]",
                  aiMessage: "bg-teal/95 rounded-lg p-4 mb-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)] text-white",
                  infoIcon: "text-white/80 hover:text-white transition-colors",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
