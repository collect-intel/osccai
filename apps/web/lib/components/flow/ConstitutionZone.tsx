import { useState } from "react";
import ZoneWrapper from "./ZoneWrapper";
import { createConstitution, deleteConstitution, publishModel, unpublishModel } from "@/lib/actions";
import ConstitutionalAIChat from "@/lib/components/chat/ConstitutionalAIChat";
import Modal from "@/lib/components/Modal";
import { Constitution } from "@prisma/client";
import ConstitutionIcon from "../icons/ConstitutionIcon";
import Spinner from "@/lib/components/Spinner";
import ReactMarkdown from "react-markdown";
import { formatDistanceToNow } from "date-fns";
import { FaTrash, FaExternalLinkAlt, FaLink, FaEye } from "react-icons/fa";

interface ConstitutionZoneProps {
  isActive: boolean;
  modelId: string;
  modelData: {
    name: string;
    bio: string;
    constitutions: Constitution[];
    activeConstitutionId?: string | null;
    published?: boolean;
  };
  isExistingModel: boolean;
  onToggle: () => void;
  onUpdate: (data: Partial<ConstitutionZoneProps["modelData"]>) => void;
  savingStatus: "idle" | "saving" | "saved";
}

export default function ConstitutionZone({
  isActive,
  modelId,
  modelData,
  isExistingModel,
  onToggle,
  onUpdate,
  savingStatus,
}: ConstitutionZoneProps) {
  // Sort constitutions by createdAt in descending order (newest first)
  const sortedConstitutions = [...modelData.constitutions].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const [selectedConstitution, setSelectedConstitution] =
    useState<Constitution | null>(sortedConstitutions[0] || null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [constitutionToDelete, setConstitutionToDelete] =
    useState<Constitution | null>(null);
  const [showCopiedToast, setShowCopiedToast] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const handleGenerateConstitution = async () => {
    setIsGenerating(true);
    const newConstitution: Constitution = {
      uid: "temp-" + Date.now(),
      version: modelData.constitutions.length + 1,
      content: "",
      status: "DRAFT",
      deleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      modelId: modelId,
    };
    const updatedConstitutions = [...modelData.constitutions, newConstitution];
    onUpdate({
      constitutions: updatedConstitutions,
    });
    setSelectedConstitution(newConstitution);

    try {
      const createdConstitution = await createConstitution(modelId);
      const finalConstitutions = updatedConstitutions.map((c) =>
        c.uid === newConstitution.uid ? createdConstitution : c,
      );
      onUpdate({
        constitutions: finalConstitutions,
      });
      setSelectedConstitution(createdConstitution);
    } catch (error) {
      console.error("Failed to create constitution:", error);
      // Remove the temporary constitution if creation failed
      onUpdate({
        constitutions: modelData.constitutions,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteConstitution = async (constitution: Constitution) => {
    setConstitutionToDelete(constitution);
  };

  const confirmDeleteConstitution = async () => {
    if (constitutionToDelete) {
      try {
        await deleteConstitution(constitutionToDelete.uid);
        const updatedConstitutions = modelData.constitutions.filter(
          (c) => c.uid !== constitutionToDelete.uid,
        );
        onUpdate({ constitutions: updatedConstitutions });
        if (selectedConstitution?.uid === constitutionToDelete.uid) {
          setSelectedConstitution(updatedConstitutions[0] || null);
        }
      } catch (error) {
        console.error("Failed to delete constitution:", error);
      }
    }
    setConstitutionToDelete(null);
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      const formData = new FormData();
      formData.append("modelId", modelId);
      await publishModel(formData);
      onUpdate({ ...modelData, published: true });
    } catch (error) {
      console.error("Failed to publish model:", error);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleUnpublish = async () => {
    try {
      const formData = new FormData();
      formData.append("modelId", modelId);
      await unpublishModel(formData);
      onUpdate({ ...modelData, published: false });
    } catch (error) {
      console.error("Failed to unpublish model:", error);
    }
  };

  return (
    <ZoneWrapper
      title="Constitutions"
      isActive={isActive}
      layout="vertical"
      onToggle={onToggle}
      savingStatus={savingStatus}
    >
      <div className="flex bg-teal text-white rounded-lg overflow-hidden min-h-[200px]">
        <div className="w-1/3 p-4">
          <button
            onClick={handleGenerateConstitution}
            disabled={isGenerating}
            className={`bg-yellow text-black px-4 py-2 rounded mb-4 w-full transition-colors
              ${
                isGenerating
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-yellow-600"
              }`}
          >
            {isGenerating ? "Generating..." : "Generate New Constitution"}
          </button>
          <p className="text-sm mb-4">
            Generating a new constitution will use the community model bio and
            goals, and the latest poll-derived consensus principles.
          </p>
          {sortedConstitutions.length > 0 && (
            <>
              <h3 className="text-xl font-semibold mb-2">Constitutions:</h3>
            </>
          )}
          <ul className="space-y-2">
            {sortedConstitutions.map((constitution) => (
              <li key={constitution.uid} className="flex items-center">
                <button
                  onClick={() => setSelectedConstitution(constitution)}
                  className={`flex-grow text-left px-3 py-2 rounded transition-all
                    ${
                      selectedConstitution?.uid === constitution.uid
                        ? "bg-teal-700 border-2 border-white"
                        : "hover:bg-teal-600 hover:border-2 hover:border-white border-2 border-transparent"
                    }
                  `}
                >
                  <div>
                    Constitution v{constitution.version}
                  </div>
                  <div className="text-xs text-teal-200">
                    {formatDistanceToNow(new Date(constitution.createdAt), {
                      addSuffix: true,
                    })}
                  </div>
                  {constitution.uid.startsWith("temp-") && (
                    <>
                      {" "}
                      - Generating... <Spinner />
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleDeleteConstitution(constitution)}
                  className="ml-2 p-2 text-white hover:text-red-500 transition-colors"
                  title="Delete Constitution"
                >
                  <FaTrash />
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="w-2/3 p-4 bg-teal-700 flex flex-col">
          {selectedConstitution ? (
            <>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-xl font-semibold">
                  Constitution v{selectedConstitution.version}
                </h3>
                <div className="flex items-center divide-x divide-white/20">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/community-models/chat/${modelId}`);
                      setShowCopiedToast(true);
                      setTimeout(() => setShowCopiedToast(false), 2000);
                    }}
                    className="flex items-center gap-2 px-3 text-white/90 hover:text-yellow transition-colors text-sm"
                  >
                    <FaLink className="w-3 h-3" />
                    <span>Copy Public Link</span>
                  </button>
                  <a
                    href={`/community-models/chat/${modelId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 text-white/90 hover:text-yellow transition-colors text-sm"
                  >
                    <FaExternalLinkAlt className="w-3 h-3" />
                    <span>Open Public Chat</span>
                  </a>
                  <button
                    onClick={() => setIsChatModalOpen(true)}
                    className="flex items-center gap-2 px-3 text-white/90 hover:text-yellow transition-colors text-sm"
                    disabled={selectedConstitution.uid.startsWith("temp-")}
                  >
                    <FaEye className="w-3 h-3" />
                    <span>Quick Preview</span>
                  </button>
                </div>
              </div>
              {showCopiedToast && (
                <div className="absolute top-4 right-4 bg-black text-white px-3 py-1 rounded text-sm">
                  Link copied!
                </div>
              )}
              <div className="bg-white p-4 rounded overflow-auto flex-grow text-black border-2 border-white">
                <ReactMarkdown>
                  {selectedConstitution.uid.startsWith("temp-")
                    ? "Generating constitution..."
                    : selectedConstitution.content}
                </ReactMarkdown>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-lg">No constitution selected</p>
            </div>
          )}
        </div>
      </div>
      {isChatModalOpen && selectedConstitution && (
        <Modal
          isOpen={isChatModalOpen}
          onClose={() => setIsChatModalOpen(false)}
          minHeight={500}
        >
          <div className="w-full h-full max-w-4xl">
            <ConstitutionalAIChat
              constitution={{
                text: selectedConstitution.content,
                icon: <ConstitutionIcon />,
                color: "teal",
              }}
              initialMessages={[
                {
                  role: "assistant",
                  content: `Hi there. You're chatting with an AI encoded with the constitution of your community model.`,
                },
              ]}
              customStyles={{
                userMessage: "bg-white rounded-lg p-4 mb-4 shadow-sm border border-gray-100",
                aiMessage: "bg-teal rounded-lg p-4 mb-4 shadow-sm border border-teal-100 text-white",
                infoIcon: "text-teal-600 hover:text-teal-700 transition-colors",
              }}
            />
          </div>
        </Modal>
      )}

      {/* Confirmation Modal for Constitution Deletion */}
      {constitutionToDelete && (
        <Modal
          isOpen={!!constitutionToDelete}
          onClose={() => setConstitutionToDelete(null)}
        >
          <div className="bg-white rounded-lg">
            <h3 className="text-xl font-semibold mb-4">Confirm Deletion</h3>
            <p className="mb-6">
              Are you sure you want to delete Constitution v
              {constitutionToDelete.version}?
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setConstitutionToDelete(null)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteConstitution}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </Modal>
      )}

      {modelData.published ? (
        <div className="mt-4 p-4 bg-green-100 text-green-800 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              <span>Published! Your model is available in the library.</span>
            </div>
            <button
              onClick={handleUnpublish}
              className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors text-sm"
            >
              Unpublish
            </button>
          </div>
        </div>
      ) : (
        selectedConstitution && (
          <div className="mt-4 p-4 bg-yellow text-black rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Ready to publish?</h3>
                <p className="text-sm">
                  Publishing will make your model visible in the library and allow others to chat with it.
                </p>
              </div>
              <button
                onClick={handlePublish}
                disabled={isPublishing}
                className={`bg-teal text-white px-4 py-2 rounded hover:bg-teal-dark transition-colors
                  ${isPublishing ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {isPublishing ? "Publishing..." : "Publish Model"}
              </button>
            </div>
          </div>
        )
      )}
    </ZoneWrapper>
  );
}
