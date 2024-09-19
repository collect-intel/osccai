import React from 'react';
import PageTitle from "@/lib/components/PageTitle";

const HowItWorks = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <PageTitle title="How It Works" size="large" />
      <div className="space-y-6">
        <section>
          <h2 className="text-2xl font-semibold mb-2">Step 1: Create a Community Model</h2>
          <p>Start by creating a community model. Input initial principles or statements that are important to your community. This forms the foundation of your AI's alignment.</p>
        </section>
        <section>
          <h2 className="text-2xl font-semibold mb-2">Step 2: Start Your First Poll</h2>
          <p>Initiate your first poll to gather community input on specific issues or decisions. This helps refine and expand upon your initial principles.</p>
        </section>
        <section>
          <h2 className="text-2xl font-semibold mb-2">Step 3: Generate a Constitution</h2>
          <p>Based on the community model and poll results, generate a constitution. This document will serve as a guide for your AI's behavior and decision-making processes.</p>
        </section>
        <section>
          <h2 className="text-2xl font-semibold mb-2">Step 4: Interact with Your Aligned AI</h2>
          <p>Finally, interact with your newly aligned AI. Test how it responds to various scenarios based on the principles and constitution you've established.</p>
        </section>
      </div>
    </div>
  );
};

export default HowItWorks;