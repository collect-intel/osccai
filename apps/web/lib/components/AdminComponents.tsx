"use client";

import { CommunityModelOwner } from "@prisma/client";

/**
 * Admin mode indicator component
 * Displays a fixed indicator at the bottom right of the screen
 */
export function AdminModeIndicator() {
  return (
    <div className="fixed bottom-4 right-4 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg z-50">
      Admin Mode
    </div>
  );
}

/**
 * User impersonation banner component
 * Displays a banner at the top of the screen when impersonating a user
 */
export function ImpersonationBanner({ 
  user, 
  onExit 
}: { 
  user: CommunityModelOwner; 
  onExit: () => void;
}) {
  return (
    <div className="bg-yellow-100 border-yellow-400 border-b px-4 py-2 flex justify-between items-center sticky top-0 z-50">
      <div>
        <span className="font-bold">Viewing as:</span> {user.name} ({user.email})
      </div>
      <button 
        onClick={onExit}
        className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded"
      >
        Exit Impersonation
      </button>
    </div>
  );
} 