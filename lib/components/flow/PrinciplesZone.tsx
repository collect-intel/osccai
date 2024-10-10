import { useState, useEffect, useCallback } from "react";
import ZoneWrapper from "./ZoneWrapper";
import Toggle from "@/lib/components/Toggle";
import { generateStatementsFromIdea } from "@/lib/aiActions";
import Principle from "@/lib/components/Principle";
import { FaMagic } from "react-icons/fa";
import { debounce } from "lodash";

interface PrinciplesZoneProps {
  isActive: boolean;
  onComplete: () => void;
  modelId: string;
  modelData: {
    principles: Array<{
      id: string;
      text: string;
      gacScore?: number;
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
  gacScore?: number;
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
          gacScore: typeof p === "object" ? p.gacScore : undefined,
        }))
      : [];
  });
  const [requireAuth, setRequireAuth] = useState(modelData.requireAuth);
  const [allowContributions, setAllowContributions] = useState(
    modelData.allowContributions,
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGeneratedPrinciples, setHasGeneratedPrinciples] = useState(false);

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
    setPrinciples((prevPrinciples) => {
      const newPrinciples = prevPrinciples.map((p) =>
        p.id === id ? { ...p, text: value.trim(), isEditing: false } : p,
      );

      const formattedPrinciples = newPrinciples.map(
        ({ id, text, gacScore }) => ({
          id,
          text,
          gacScore,
        }),
      );

      debouncedUpdateModelData({ principles: formattedPrinciples });

      return newPrinciples;
    });
  };

  const removePrinciple = (id: string) => {
    setPrinciples((prevPrinciples) => {
      const newPrinciples = prevPrinciples.filter((p) => p.id !== id);

      const formattedPrinciples = newPrinciples.map(
        ({ id, text, gacScore }) => ({
          id,
          text,
          gacScore,
        }),
      );

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
        id: `generated-${Date.now()}-${Math.random()}`,
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

  return (
    <ZoneWrapper
      title="Configure Principles"
      isActive={isActive}
      onToggle={onToggle}
      savingStatus={savingStatus}
    >
      <div className="flex">
        <div className="w-1/3 pr-4">
          <p className="text-gray-600">
            Define the core principles that will guide your community AI model.
            These principles will be used to create polls for your community to
            vote on.
          </p>
        </div>
        <div className="w-2/3 space-y-4">
          <label className="block text-sm font-medium text-gray-700">
            Add at least 5 principles for your community to vote on
          </label>
          {principles.map((principle) => {
            return (
              <Principle
                key={principle.id}
                text={principle.text}
                isLoading={principle.isLoading}
                gacScore={principle.gacScore}
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
      </div>
    </ZoneWrapper>
  );
}
