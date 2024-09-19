import React from 'react';

interface ChatInterfaceProps {
  constitutionId: string;
}

export default function ChatInterface({ constitutionId }: ChatInterfaceProps) {
  const apiUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/community-models/constitution/${constitutionId}/bot`;
  const iframeSrc = `http://localhost:3088/bot/via_url?url=${encodeURIComponent(apiUrl)}`;

  console.log('iframeSrc', iframeSrc);

  return (
    <div className="w-full h-[600px] border rounded-lg overflow-hidden">
      <iframe
        src={iframeSrc}
        width="100%"
        height="100%"
        frameBorder="0"
        allow="microphone"
        title="AI Chat Interface"
      ></iframe>
    </div>
  );
}