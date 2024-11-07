"use client";

import { useState, useEffect } from "react";

export default function UserDebug() {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") {
      return;
    }

    async function fetchDebugInfo() {
      const response = await fetch("/api/debug-info");
      if (response.ok) {
        const data = await response.json();
        setDebugInfo(data);
      }
    }

    fetchDebugInfo();
  }, []);

  if (process.env.NODE_ENV !== "development" || !debugInfo) {
    return null;
  }

  return (
    <div className="fixed bottom-2 left-2 z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-blue-600 text-white px-2 py-1 rounded-md text-xs hover:bg-blue-700 transition-colors"
      >
        Debug
      </button>
      
      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 bg-blue-600 text-white rounded-lg shadow-lg p-4 w-96 max-h-[80vh] overflow-y-auto">
          <button 
            onClick={() => setIsOpen(false)}
            className="absolute top-2 right-2 text-white hover:text-gray-200"
          >
            ✕
          </button>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-sm">Clerk User:</h3>
              <pre className="bg-blue-800 p-2 rounded mt-1 text-xs">
                {JSON.stringify(debugInfo.clerkUser, null, 2)}
              </pre>
            </div>

            <div>
              <h3 className="font-semibold text-sm">DB User:</h3>
              <pre className="bg-blue-800 p-2 rounded mt-1 text-xs">
                {JSON.stringify(debugInfo.dbUser, null, 2)}
              </pre>
            </div>

            <div>
              <h3 className="font-semibold text-sm">Active Models:</h3>
              <pre className="bg-blue-800 p-2 rounded mt-1 text-xs">
                {JSON.stringify(debugInfo.activeCommunityModels, null, 2)}
              </pre>
            </div>

            <div>
              <h3 className="font-semibold text-sm">First 10 Models:</h3>
              <pre className="bg-blue-800 p-2 rounded mt-1 text-xs">
                {JSON.stringify(debugInfo.firstTenCommunityModels, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
