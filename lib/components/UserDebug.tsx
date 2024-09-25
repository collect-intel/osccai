"use client";

import { useState, useEffect } from "react";
import { auth } from "@clerk/nextjs/server";

export default function UserDebug() {
  const [debugInfo, setDebugInfo] = useState<any>(null);

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

  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  if (!debugInfo) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-blue-600 text-white border-t border-blue-400">
        <details>
          <summary className="font-bold cursor-pointer">Debug Info</summary>
          <div className="mt-4 max-h-[50vh] overflow-y-auto">
            <h3 className="font-semibold">No debug info available</h3>
          </div>
        </details>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-blue-600 text-white border-t border-blue-400">
      <details>
        <summary className="font-bold cursor-pointer">Debug Info</summary>
        <div className="mt-4 max-h-[50vh] overflow-y-auto">
          <h3 className="font-semibold">Clerk User Info:</h3>
          <pre className="bg-blue-800 p-2 rounded mt-2 text-sm overflow-auto">
            {JSON.stringify(debugInfo.clerkUser, null, 2)}
          </pre>

          <h3 className="font-semibold mt-4">Database User Info:</h3>
          <pre className="bg-blue-800 p-2 rounded mt-2 text-sm overflow-auto">
            {JSON.stringify(debugInfo.dbUser, null, 2)}
          </pre>

          <h3 className="font-semibold mt-4">Active Community Models:</h3>
          <pre className="bg-blue-800 p-2 rounded mt-2 text-sm overflow-auto">
            {JSON.stringify(debugInfo.activeCommunityModels, null, 2)}
          </pre>

          <h3 className="font-semibold mt-4">
            First 10 Community Models in DB:
          </h3>
          <pre className="bg-blue-800 p-2 rounded mt-2 text-sm overflow-auto">
            {JSON.stringify(debugInfo.firstTenCommunityModels, null, 2)}
          </pre>
        </div>
      </details>
    </div>
  );
}
