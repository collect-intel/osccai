'use client';

import { useState, useEffect, useCallback } from 'react';
import ChatInterface from '@/lib/components/ChatInterface';
import debounce from 'lodash/debounce';

export default function SandboxPage() {
  const [text, setText] = useState('');
  const [chatId, setChatId] = useState('initial');
  const [isLoading, setIsLoading] = useState(false);

  const debouncedSetChatId = useCallback(
    debounce((value: string) => {
      setChatId(value);
      setIsLoading(true);
      setTimeout(() => setIsLoading(false), 5000);
    }, 5000),
    []
  );

  useEffect(() => {
    debouncedSetChatId(text);
  }, [text, debouncedSetChatId]);

  const handleSubmit = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 5000);
  };

  return (
    <div className="flex h-screen w-screen">
      <div className="w-1/2 p-4 flex flex-col">
        <textarea
          className="flex-grow w-full p-2 border rounded resize-none max-h-[calc(100vh-190px)]"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter your text here..."
        />
        <div className="flex justify-end mt-4">
          <button
            className={`px-4 py-2 rounded ${
              isLoading ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'
            } text-white`}
            onClick={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'Submit'}
          </button>
        </div>
      </div>
      <div className="w-1/2 p-4 flex flex-col">
        <div className="flex-grow overflow-auto max-h-[calc(100vh-80px)]">
          <ChatInterface constitutionId={chatId} />
        </div>
      </div>
    </div>
  );
}