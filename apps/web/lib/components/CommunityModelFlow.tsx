"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import AboutZone from "./flow/AboutZone";
import PrinciplesZone from "./flow/PrinciplesZone";
import PollZone from "./flow/PollZone";
import ConstitutionZone from "./flow/ConstitutionZone";
import AdvancedZone from "./flow/AdvancedZone";
import {
  createCommunityModel,
  updateCommunityModel,
  updatePoll,
  fetchPollData,
} from "@/lib/actions";
import { getCommunityModel } from "@/lib/data";
import { AboutZoneData } from "./flow/AboutZone";
import Toast from "./Toast";
import { debounce } from "lodash";
import { Constitution, Poll, Statement, ApiKey, Vote } from "@prisma/client";
import Spinner from "./Spinner";
import type { ExtendedPoll } from "@/lib/types";

interface ExtendedAboutZoneData extends AboutZoneData {
  principles: Array<{ id: string; text: string; gacScore?: number }>;
  requireAuth: boolean;
  allowContributions: boolean;
  constitutions: Constitution[];
  activeConstitutionId?: string | null;
  polls: Poll[];
  published?: boolean;
  apiEnabled?: boolean;
  advancedOptionsEnabled?: boolean;
  apiKeys?: ApiKey[];
  owner?: {
    uid: string;
    name: string;
    clerkUserId: string;
  };
}

interface CommunityModelFlowProps {
  initialModelId?: string;
}

interface ZoneRefs {
  [key: string]: React.RefObject<HTMLDivElement>;
}

interface Principle {
  id: string;
  text: string;
  gacScore?: number;
}

export default function CommunityModelFlow({
  initialModelId,
}: CommunityModelFlowProps) {
  const router = useRouter();
  const [activeZones, setActiveZones] = useState<string[]>(["about"]);
  const [modelId, setModelId] = useState<string | null>(initialModelId || null);
  const [isSaving, setIsSaving] = useState(false);
  const [modelData, setModelData] = useState<ExtendedAboutZoneData | null>(
    null,
  );
  const [showToast, setShowToast] = useState(false);
  const [savingStatus, setSavingStatus] = useState<
    Record<string, "idle" | "saving" | "saved">
  >({
    about: "idle",
    principles: "idle",
    poll: "idle",
    communityModel: "idle",
    advanced: "idle",
  });

  const isExistingModel = !!initialModelId;

  const [isLoading, setIsLoading] = useState(!!initialModelId);
  const [isPageLoading, setIsPageLoading] = useState(true);

  const zoneRefs: ZoneRefs = {
    about: useRef<HTMLDivElement>(null),
    principles: useRef<HTMLDivElement>(null),
    poll: useRef<HTMLDivElement>(null),
    communityModel: useRef<HTMLDivElement>(null),
    advanced: useRef<HTMLDivElement>(null),
  };

  const handleHashChange = useCallback(() => {
    const hash = window.location.hash.slice(1);
    if (hash && zoneRefs[hash]?.current) {
      zoneRefs[hash].current?.scrollIntoView({ behavior: "smooth" });
      setActiveZones((prev) => Array.from(new Set([...prev, hash])));
    }
  }, []);

  useEffect(() => {
    setIsPageLoading(false);

    // Only set up the hash change listener after model data is fetched
    if (modelData) {
      // Initial check for hash
      handleHashChange();

      // Listen for hash changes
      window.addEventListener("hashchange", handleHashChange);

      // Cleanup
      return () => {
        window.removeEventListener("hashchange", handleHashChange);
      };
    }
  }, [modelData, handleHashChange]);

  useEffect(() => {
    async function fetchModelData() {
      if (modelId) {
        setIsLoading(true);
        try {
          const fetchedModelData = await getCommunityModel(modelId);
          console.log("Loaded model data:", fetchedModelData);
          if (fetchedModelData) {
            setModelData({
              name: fetchedModelData.name || "Default Name",
              bio: fetchedModelData.bio || "",
              goal: fetchedModelData.goal || "",
              logoUrl: fetchedModelData.logoUrl || "",
              principles: fetchedModelData.principles.map((p: string | Principle) =>
                typeof p === "string"
                  ? { id: `principle-${Date.now()}-${Math.random()}`, text: p }
                  : p,
              ),
              requireAuth: fetchedModelData.requireAuth || false,
              allowContributions: fetchedModelData.allowContributions || false,
              constitutions: fetchedModelData.constitutions || [],
              activeConstitutionId:
                fetchedModelData.activeConstitutionId || undefined,
              polls: fetchedModelData.polls || [],
              published: fetchedModelData.published || false,
              apiEnabled: fetchedModelData.apiEnabled || false,
              advancedOptionsEnabled: fetchedModelData.advancedOptionsEnabled || false,
              apiKeys: fetchedModelData.apiKeys || [],
              owner: fetchedModelData.owner,
            });
            setActiveZones([
              "about",
              "principles",
              "poll",
              "communityModel",
              "advanced",
            ]);

            // After setting the model data, check for hash
            handleHashChange();
          } else {
            console.error("Model not found");
            router.push("/community-models");
          }
        } catch (error) {
          console.error("Error fetching model data:", error);
        } finally {
          setIsLoading(false);
        }
      }
    }

    fetchModelData();
  }, [modelId, router, handleHashChange]);

  const handleSaveAbout = async (data: AboutZoneData) => {
    setIsSaving(true);
    try {
      if (!modelId) {
        const newModelId = await createCommunityModel({
          name: data.name,
          bio: data.bio,
          goal: data.goal,
          logoUrl: data.logoUrl,
        });
        setModelId(newModelId);
        router.push(`/community-models/flow/${newModelId}`);
      } else {
        await updateCommunityModel(modelId, data);
      }
      setModelData(
        (prevData) => ({ ...prevData, ...data }) as ExtendedAboutZoneData,
      );
      setShowToast(true);
      if (!isExistingModel) {
        setActiveZones((prev) => [...prev, "principles"]);
      }
    } catch (error) {
      console.error("Error saving community model:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdatePrinciples = async (
    data: Partial<ExtendedAboutZoneData>,
  ) => {
    if (modelId) {
      try {
        setSavingStatus((prev) => ({ ...prev, principles: "saving" }));
        const updatedModel = await updateCommunityModel(modelId, {
          principles: data.principles,
          requireAuth: data.requireAuth,
          allowContributions: data.allowContributions,
        });
        setModelData((prevData) => {
          if (!prevData) return null;
          const newData = {
            ...prevData,
            ...data,
            polls: [...updatedModel.polls],
          } as ExtendedAboutZoneData;
          console.log("Updated model data:", newData);
          return newData;
        });

        if (updatedModel.polls[0]) {
          await updatePoll(modelId, updatedModel.polls[0]);
        }

        setSavingStatus((prev) => ({ ...prev, principles: "saved" }));
        setTimeout(
          () => setSavingStatus((prev) => ({ ...prev, principles: "idle" })),
          2000,
        );
      } catch (error) {
        console.error("Error updating principles:", error);
        setSavingStatus((prev) => ({ ...prev, principles: "idle" }));
      }
    } else {
      console.error("Cannot update principles: modelId is null");
    }
  };

  const handleComplete = async () => {
    if (modelId && modelData) {
      setIsSaving(true);
      try {
        await updateCommunityModel(modelId, {
          ...modelData,
        });
        router.push(`/community-models/${modelId}`);
      } catch (error) {
        console.error("Error completing community model setup:", error);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const toggleZone = (zone: string) => {
    setActiveZones((prev) =>
      prev.includes(zone) ? prev.filter((z) => z !== zone) : [...prev, zone],
    );
  };

  const saveModelData = async (
    data: Partial<ExtendedAboutZoneData>,
    zone: string,
  ) => {
    if (!modelId) return;
    setSavingStatus((prev) => ({ ...prev, [zone]: "saving" }));
    try {
      await updateCommunityModel(modelId, data);
      setModelData(
        (prevData) => ({ ...prevData, ...data }) as ExtendedAboutZoneData,
      );
      setSavingStatus((prev) => ({ ...prev, [zone]: "saved" }));
      setTimeout(
        () => setSavingStatus((prev) => ({ ...prev, [zone]: "idle" })),
        2000,
      );
    } catch (error) {
      console.error("Error saving community model:", error);
      setSavingStatus((prev) => ({ ...prev, [zone]: "idle" }));
    }
  };

  const debouncedSaveModelData = debounce(saveModelData, 500);

  const handleUpdatePollOptions = useCallback(async (options: {
    minVotesBeforeSubmission?: number;
    maxVotesPerParticipant?: number;
    maxSubmissionsPerParticipant?: number;
    minRequiredSubmissions?: number;
    completionMessage?: string;
  }) => {
    if (!modelId) return;

    try {
      setSavingStatus((prev) => ({ ...prev, advanced: "saving" }));
      
      const updatedPoll = await updatePoll(modelId, {
        ...modelData?.polls?.[0],
        ...options,
      });

      setModelData((prevData) => {
        if (!prevData) return null;
        return {
          ...prevData,
          polls: [updatedPoll, ...(prevData.polls?.slice(1) || [])],
        };
      });

      setSavingStatus((prev) => ({ ...prev, advanced: "saved" }));
      setTimeout(
        () => setSavingStatus((prev) => ({ ...prev, advanced: "idle" })),
        2000,
      );
    } catch (error) {
      console.error("Error updating poll options:", error);
      setSavingStatus((prev) => ({ ...prev, advanced: "idle" }));
    }
  }, [modelId, modelData]);

  if (isPageLoading || isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white/80 z-50">
        <div className="bg-white p-6 rounded-lg shadow-md flex flex-col items-center">
          <Spinner size="large" color="#4A5568" />
          <p className="mt-4 text-gray-600">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">
          {modelData?.name.trim() ? (
            modelData.name
          ) : (
            <span className="font-bold text-2xl">New Community Model</span>
          )}
        </h1>
      </div>

      <div className="space-y-4">
        <div ref={zoneRefs.about} id="about">
          <AboutZone
            isActive={activeZones.includes("about")}
            onSave={handleSaveAbout}
            initialData={modelData || undefined}
            isExistingModel={isExistingModel}
            modelId={modelId || undefined}
            onToggle={() => toggleZone("about")}
            onUpdate={(data) => {
              console.log("Received update in CommunityModelFlow:", data);
              setModelData(
                (prevData) =>
                  ({ ...prevData, ...data }) as ExtendedAboutZoneData,
              );
              if (isExistingModel) {
                debouncedSaveModelData(data, "about");
              }
            }}
            savingStatus={savingStatus.about}
          />
        </div>
        {(modelId || isExistingModel) && modelData && (
          <>
            <div ref={zoneRefs.principles} id="principles">
              <PrinciplesZone
                isActive={activeZones.includes("principles")}
                onComplete={() =>
                  !isExistingModel &&
                  setActiveZones((prev) => [...prev, "poll"])
                }
                modelId={modelId || initialModelId!}
                modelData={{
                  ...modelData,
                  principles: modelData.principles || [],
                  requireAuth: modelData.requireAuth || false,
                  allowContributions: modelData.allowContributions || false,
                }}
                updateModelData={(data) => {
                  handleUpdatePrinciples(data);
                }}
                isExistingModel={isExistingModel}
                onToggle={() => toggleZone("principles")}
                savingStatus={savingStatus.principles}
              />
            </div>
            <div ref={zoneRefs.poll} id="poll">
              <PollZone
                key={modelData?.polls?.[0]?.uid || "no-poll"}
                isActive={activeZones.includes("poll")}
                onComplete={() =>
                  !isExistingModel &&
                  setActiveZones((prev) => [...prev, "communityModel"])
                }
                modelId={modelId || initialModelId!}
                modelData={{
                  name: modelData?.name || "",
                  bio: modelData?.bio || "",
                  principles: modelData?.principles?.map((p) => p.text) || [],
                  requireAuth: modelData?.requireAuth || false,
                  allowContributions: modelData?.allowContributions || false,
                }}
                pollData={modelData?.polls?.[0] as ExtendedPoll}
                isExistingModel={isExistingModel}
                onToggle={() => toggleZone("poll")}
                savingStatus={savingStatus.poll}
                onUpdate={async (updatedPollData) => {
                  if (modelId) {
                    try {
                      setSavingStatus((prev) => ({ ...prev, poll: "saving" }));
                      await updatePoll(modelId, updatedPollData);
                      const fetchedPollData = await fetchPollData(modelId);
                      setModelData((prevData) => {
                        if (!prevData) return null;
                        return {
                          ...prevData,
                          polls: [
                            fetchedPollData,
                            ...(prevData.polls?.slice(1) || []),
                          ],
                        } as ExtendedAboutZoneData;
                      });
                      setSavingStatus((prev) => ({ ...prev, poll: "saved" }));
                      setTimeout(
                        () =>
                          setSavingStatus((prev) => ({
                            ...prev,
                            poll: "idle",
                          })),
                        2000,
                      );
                    } catch (error) {
                      console.error("Error updating poll:", error);
                      setSavingStatus((prev) => ({ ...prev, poll: "idle" }));
                    }
                  }
                }}
              />
            </div>
            <div ref={zoneRefs.communityModel} id="communityModel">
              <ConstitutionZone
                isActive={activeZones.includes("communityModel")}
                modelId={modelId || initialModelId!}
                modelData={{
                  name: modelData?.name || "",
                  bio: modelData?.bio || "",
                  constitutions: modelData?.constitutions || [],
                  activeConstitutionId: modelData?.activeConstitutionId,
                  published: modelData?.published,
                }}
                isExistingModel={isExistingModel}
                onToggle={() => toggleZone("communityModel")}
                onUpdate={(data) => {
                  setModelData((prevData) => {
                    if (!prevData) return null;
                    return {
                      ...prevData,
                      ...data,
                      principles: prevData.principles || [], // Ensure principles are preserved
                      constitutions:
                        data.constitutions || prevData.constitutions || [],
                      activeConstitutionId:
                        data.activeConstitutionId ||
                        prevData.activeConstitutionId,
                    };
                  });
                  if (isExistingModel) {
                    // Only update constitutions and activeConstitutionId
                    const { constitutions, activeConstitutionId, published } =
                      data;
                    if (
                      constitutions ||
                      activeConstitutionId !== undefined ||
                      published !== undefined
                    ) {
                      debouncedSaveModelData(
                        { constitutions, activeConstitutionId, published },
                        "communityModel",
                      );
                    }
                  }
                }}
                savingStatus={savingStatus.communityModel}
              />
            </div>
            {(modelData?.apiEnabled || modelData?.advancedOptionsEnabled) && (
              <div ref={zoneRefs.advanced} id="advanced">
                <AdvancedZone
                  isActive={activeZones.includes("advanced")}
                  modelId={modelId || initialModelId!}
                  ownerId={modelData.owner?.uid || ""}
                  apiKeys={modelData.apiKeys || []}
                  onToggle={() => toggleZone("advanced")}
                  savingStatus={savingStatus.advanced}
                  apiEnabled={modelData.apiEnabled}
                  advancedOptionsEnabled={modelData.advancedOptionsEnabled}
                  pollOptions={{
                    minVotesBeforeSubmission: modelData.polls?.[0]?.minVotesBeforeSubmission ?? undefined,
                    maxVotesPerParticipant: modelData.polls?.[0]?.maxVotesPerParticipant ?? undefined,
                    maxSubmissionsPerParticipant: modelData.polls?.[0]?.maxSubmissionsPerParticipant ?? undefined,
                    minRequiredSubmissions: modelData.polls?.[0]?.minRequiredSubmissions ?? undefined,
                    completionMessage: modelData.polls?.[0]?.completionMessage ?? undefined
                  }}
                  onUpdatePollOptions={handleUpdatePollOptions}
                />
              </div>
            )}
          </>
        )}
      </div>

      {!isExistingModel && activeZones.includes("communityModel") && (
        <button
          onClick={handleComplete}
          className="mt-4 bg-teal text-white px-4 py-2 rounded"
        >
          Complete Setup
        </button>
      )}

      {showToast && (
        <Toast
          message="Changes saved successfully"
          isVisible={showToast}
          onClose={() => setShowToast(false)}
        />
      )}
    </div>
  );
}
