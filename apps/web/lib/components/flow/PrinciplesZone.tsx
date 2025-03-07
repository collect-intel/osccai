import { useState, useEffect, useCallback } from "react";
import ZoneWrapper from "./ZoneWrapper";
import Toggle from "@/lib/components/Toggle";
import { generateStatementsFromIdea } from "@/lib/aiActions";
import Principle from "@/lib/components/Principle";
import { FaMagic } from "react-icons/fa";
import { debounce } from "lodash";
import Modal from "@/lib/components/Modal";

interface PrinciplesZoneProps {
  isActive: boolean;
  onComplete: () => void;
  modelId: string;
  modelData: {
    principles: Array<{
      id: string;
      text: string;
    }>;
    requireAuth: boolean;
    allowContributions: boolean;
    goal: string;
    bio: string;
  };
  updateModelData: (data: Partial<PrinciplesZoneProps["modelData"]>) => void;
  isExistingModel: boolean;
  onToggle: () => void;
  savingStatus: "idle" | "saving" | "saved";
}

interface PrincipleData {
  id: string;
  text: string;
  isLoading: boolean;
  isEditing: boolean;
}

export default function PrinciplesZone({
  isActive,
  onComplete,
  modelData,
  updateModelData,
  isExistingModel,
  onToggle,
  savingStatus,
}: PrinciplesZoneProps) {
  const [principles, setPrinciples] = useState<PrincipleData[]>(() => {
    return Array.isArray(modelData.principles)
      ? modelData.principles.map((p) => ({
          id:
            typeof p === "string"
              ? `principle-${Date.now()}-${Math.random()}`
              : p.id,
          text: typeof p === "string" ? p : p.text,
          isLoading: false,
          isEditing: false,
        }))
      : [];
  });
  const [requireAuth, setRequireAuth] = useState(modelData.requireAuth);
  const [allowContributions, setAllowContributions] = useState(
    modelData.allowContributions,
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGeneratedPrinciples, setHasGeneratedPrinciples] = useState(false);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const debouncedUpdateModelData = useCallback(
    debounce((data: Partial<PrinciplesZoneProps["modelData"]>) => {
      updateModelData(data);
    }, 500),
    [updateModelData],
  );

  const addPrinciple = () => {
    const newPrinciple: PrincipleData = {
      id: `new-${Date.now()}`,
      text: "",
      isLoading: false,
      isEditing: true,
    };
    setPrinciples((prevPrinciples) => [...prevPrinciples, newPrinciple]);
  };

  const updatePrinciple = (id: string, value: string) => {
    // Clean and validate the text value
    const cleanedValue = value.trim();
    
    // If value is too short (like just "2"), add some context to it or show a warning
    if (cleanedValue.length < 3) {
      // Option 1: Warn the user but still allow the short input
      console.warn("Very short principle detected:", cleanedValue);
      
      // Option 2: Add context to make it more meaningful
      // const enhancedValue = `Principle: ${cleanedValue}`;
      // setPrinciples((prevPrinciples) => {
      //   const newPrinciples = prevPrinciples.map((p) =>
      //     p.id === id ? { ...p, text: enhancedValue, isEditing: false } : p,
      //   );
      //   const formattedPrinciples = newPrinciples.map(({ id, text }) => ({
      //     id,
      //     text,
      //   }));
      //   debouncedUpdateModelData({ principles: formattedPrinciples });
      //   return newPrinciples;
      // });
      // return;
    }
    
    setPrinciples((prevPrinciples) => {
      const newPrinciples = prevPrinciples.map((p) =>
        p.id === id ? { ...p, text: cleanedValue, isEditing: false } : p,
      );

      const formattedPrinciples = newPrinciples.map(({ id, text }) => ({
        id,
        text,
      }));

      debouncedUpdateModelData({ principles: formattedPrinciples });

      return newPrinciples;
    });
  };

  const removePrinciple = (id: string) => {
    setPrinciples((prevPrinciples) => {
      const newPrinciples = prevPrinciples.filter((p) => p.id !== id);

      const formattedPrinciples = newPrinciples.map(({ id, text }) => ({
        id,
        text,
      }));

      debouncedUpdateModelData({ principles: formattedPrinciples });

      return newPrinciples;
    });
  };

  const setIsEditing = (id: string, isEditing: boolean) => {
    setPrinciples((prevPrinciples) =>
      prevPrinciples.map((p) => (p.id === id ? { ...p, isEditing } : p)),
    );
  };

  const handleToggleChange = (
    field: "requireAuth" | "allowContributions",
    value: boolean,
  ) => {
    if (field === "requireAuth") {
      setRequireAuth(value);
    } else {
      setAllowContributions(value);
    }
    debouncedUpdateModelData({ [field]: value });
  };

  const handleGeneratePrinciples = async () => {
    if (hasGeneratedPrinciples) return;

    setIsGenerating(true);

    try {
      const generatedPrinciples = await generateStatementsFromIdea(
        modelData.goal,
        modelData.bio,
      );

      const newPrinciples = generatedPrinciples.map((text) => ({
        id: `new-${Date.now()}-${Math.random()}`,
        text,
        isLoading: false,
        isEditing: false,
      }));

      setPrinciples((prevPrinciples) => {
        const updatedPrinciples = [...prevPrinciples, ...newPrinciples];

        const formattedPrinciples = updatedPrinciples.map(({ id, text }) => ({
          id,
          text,
        }));
        debouncedUpdateModelData({ principles: formattedPrinciples });

        return updatedPrinciples;
      });

      setHasGeneratedPrinciples(true);
    } catch (error) {
      console.error("Error generating principles:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteAll = async () => {
    setIsDeleting(true);
    try {
      setPrinciples([]);
      const formattedPrinciples: Array<{ id: string; text: string }> = [];
      await debouncedUpdateModelData({ principles: formattedPrinciples });
    } catch (error) {
      console.error("Error deleting principles:", error);
      // Optionally add error handling UI here
    } finally {
      setIsDeleting(false);
      setShowDeleteAllModal(false);
    }
  };

  return (
    <ZoneWrapper
      title="Configure Principles"
      subtitle="Define the core principles that will guide your community AI model.
            These principles will be used to create polls for your community to
            vote on."
      isActive={isActive}
      onToggle={onToggle}
      savingStatus={savingStatus}
    >
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <label className="block text-sm font-medium text-gray-700">
            Add at least 5 principles for your community to vote on
          </label>
          {principles.length > 0 && (
            <button
              onClick={() => setShowDeleteAllModal(true)}
              className="text-red-500 hover:text-red-700 text-sm"
            >
              Delete All
            </button>
          )}
        </div>
        {principles.map((principle) => {
          return (
            <Principle
              key={principle.id}
              text={principle.text}
              isLoading={principle.isLoading}
              onUpdate={(value) => updatePrinciple(principle.id, value)}
              onDelete={() => removePrinciple(principle.id)}
              isEditing={principle.isEditing}
              setIsEditing={(isEditing) =>
                setIsEditing(principle.id, isEditing)
              }
            />
          );
        })}
        <div className="space-y-2">
          {!hasGeneratedPrinciples && (
            <button
              onClick={handleGeneratePrinciples}
              className="text-white bg-teal flex items-center px-3 py-1 rounded text-m"
              disabled={isGenerating || hasGeneratedPrinciples}
            >
              {isGenerating ? (
                "Generating..."
              ) : (
                <>
                  <FaMagic className="h-4 w-4 mr-1" />
                  Generate some principles automatically
                </>
              )}
            </button>
          )}
          <button onClick={addPrinciple} className="text-teal block">
            {principles.length === 0
              ? "+ Add a principle"
              : "+ Add another principle"}
          </button>
        </div>
        <Toggle
          label="Require Authentication"
          enabled={requireAuth}
          setEnabled={(value) => handleToggleChange("requireAuth", value)}
          details="Require community voters to authenticate"
        />
        <Toggle
          label="Allow Participant Contributions"
          enabled={allowContributions}
          setEnabled={(value) =>
            handleToggleChange("allowContributions", value)
          }
          details="Allow community voters to contribute their own principles"
        />
        {!isExistingModel && (
          <button
            onClick={onComplete}
            className="bg-teal text-white px-4 py-2 rounded flex items-center"
            disabled={principles.filter((p) => !p.isLoading).length < 5}
          >
            Next
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 ml-2"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}
      </div>

      <Modal
        isOpen={showDeleteAllModal}
        onClose={() => setShowDeleteAllModal(false)}
      >
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-red-600">
            Delete All Principles
          </h2>
          <div className="space-y-2">
            <p className="text-gray-600">
              Are you sure you want to delete all principles? This action cannot
              be undone.
            </p>
            <p className="text-red-500 bg-red-50 p-3 rounded-md">
              Warning: This will also delete all associated poll data,
              including:
              <ul className="list-disc ml-5 mt-2">
                <li>All votes on these principles</li>
                <li>All community feedback</li>
                <li>All consensus tracking data</li>
              </ul>
            </p>
          </div>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setShowDeleteAllModal(false)}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteAll}
              disabled={isDeleting}
              className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50"
            >
              {isDeleting ? (
                <span className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Deleting...
                </span>
              ) : (
                "Yes, Delete Everything"
              )}
            </button>
          </div>
        </div>
      </Modal>
    </ZoneWrapper>
  );
}
