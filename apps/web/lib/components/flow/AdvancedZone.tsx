import { useState, useEffect } from "react";
import ZoneWrapper from "./ZoneWrapper";
import { ApiKey } from "@prisma/client";
import { createApiKey } from "@/lib/actions";
import Modal from "@/lib/components/Modal";
import { FaKey, FaCopy, FaTrash } from "react-icons/fa";
import { formatDistanceToNow } from "date-fns";

interface AdvancedZoneProps {
  isActive: boolean;
  modelId: string;
  ownerId: string;
  apiKeys: ApiKey[];
  onToggle: () => void;
  savingStatus: "idle" | "saving" | "saved";
}

interface NewKeyData {
  id: string;
  key: string;
  name: string;
  createdAt: Date;
}

export default function AdvancedZone({
  isActive,
  modelId,
  ownerId,
  apiKeys,
  onToggle,
  savingStatus,
}: AdvancedZoneProps) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newKeyData, setNewKeyData] = useState<NewKeyData | null>(null);
  const [keyName, setKeyName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [showCopiedMessage, setShowCopiedMessage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ownerId || ownerId === "") {
      console.error('Invalid owner ID in AdvancedZone:', { modelId, ownerId });
    }
  }, [ownerId, modelId]);

  const handleCreateKey = async () => {
    setIsCreating(true);
    setError(null);
    
    if (!ownerId || ownerId === "") {
      setError("Invalid owner configuration. Please contact support.");
      setIsCreating(false);
      return;
    }

    try {
      const newKey = await createApiKey(modelId, ownerId, keyName);
      setNewKeyData(newKey);
      setKeyName("");
    } catch (error) {
      console.error("Error creating API key:", error);
      setError("Failed to create API key. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyKey = async () => {
    if (newKeyData?.key) {
      await navigator.clipboard.writeText(newKeyData.key);
      setShowCopiedMessage(true);
      setTimeout(() => setShowCopiedMessage(false), 2000);
    }
  };

  const handleCloseModal = () => {
    setIsCreateModalOpen(false);
    setNewKeyData(null);
    setKeyName("");
  };

  return (
    <ZoneWrapper
      title="Advanced Settings"
      isActive={isActive}
      onToggle={onToggle}
      savingStatus={savingStatus}
    >
      <div className="bg-gray-50 p-6 rounded-lg">
        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-2">API Keys</h3>
          <p className="text-gray-600 mb-4">
            Create and manage API keys for programmatic access to your community model.
          </p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-teal text-white px-4 py-2 rounded-md hover:bg-teal-dark transition-colors flex items-center gap-2"
          >
            <FaKey className="w-4 h-4" />
            Create New API Key
          </button>
        </div>

        {apiKeys.length > 0 && (
          <div className="mt-6">
            <h4 className="text-lg font-medium mb-3">Existing API Keys</h4>
            <div className="space-y-3">
              {apiKeys.map((key) => (
                <div
                  key={key.uid}
                  className="bg-white p-4 rounded-md border border-gray-200 flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium">{key.name || "Unnamed Key"}</p>
                    <p className="text-sm text-gray-500">
                      Created {formatDistanceToNow(key.createdAt)} ago
                      {key.lastUsedAt && (
                        <> · Last used {formatDistanceToNow(key.lastUsedAt)} ago</>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        key.status === "ACTIVE"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {key.status}
                    </span>
                    {key.status === "ACTIVE" && (
                      <button
                        className="text-red-500 hover:text-red-700 transition-colors"
                        title="Revoke Key"
                      >
                        <FaTrash className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <Modal isOpen={isCreateModalOpen} onClose={handleCloseModal}>
          <div className="p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold mb-4">
              {newKeyData ? "Save Your API Key" : "Create New API Key"}
            </h3>
            
            {!newKeyData && (
              <>
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
                    {error}
                  </div>
                )}
                <div className="mb-4">
                  <label htmlFor="keyName" className="block text-sm font-medium text-gray-700 mb-1">
                    Key Name
                  </label>
                  <input
                    type="text"
                    id="keyName"
                    value={keyName}
                    onChange={(e) => setKeyName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
                    placeholder="e.g., Development Key"
                  />
                </div>
                <button
                  onClick={handleCreateKey}
                  disabled={isCreating || !keyName.trim()}
                  className={`w-full bg-teal text-white px-4 py-2 rounded-md hover:bg-teal-dark transition-colors
                    ${(isCreating || !keyName.trim()) && "opacity-50 cursor-not-allowed"}`}
                >
                  {isCreating ? "Creating..." : "Create API Key"}
                </button>
              </>
            )}
            {newKeyData && (
              <>
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
                  <p className="text-yellow-800 text-sm font-medium">
                    Important: Copy your API key now. You won't be able to see it again!
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded-md mb-4 font-mono text-sm break-all">
                  {newKeyData.key}
                </div>
                <button
                  onClick={handleCopyKey}
                  className="w-full bg-teal text-white px-4 py-2 rounded-md hover:bg-teal-dark transition-colors flex items-center justify-center gap-2"
                >
                  <FaCopy className="w-4 h-4" />
                  {showCopiedMessage ? "Copied!" : "Copy API Key"}
                </button>
                <button
                  onClick={handleCloseModal}
                  className="w-full mt-2 bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors"
                >
                  Close
                </button>
              </>
            )}
          </div>
        </Modal>
      </div>
    </ZoneWrapper>
  );
} 