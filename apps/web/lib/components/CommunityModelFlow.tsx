"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AboutZone from "./flow/AboutZone";
import PrinciplesZone from "./flow/PrinciplesZone";
import PollZone from "./flow/PollZone";
import ConstitutionZone from "./flow/ConstitutionZone";
import AdvancedZone from "./flow/AdvancedZone";
import {
  createCommunityModel,
  updateCommunityModel,
  createPoll,
  updatePoll,
  fetchPollData,
} from "@/lib/actions";
import { getCommunityModel } from "@/lib/data";
import { AboutZoneData } from "./flow/AboutZone";
import Toast from "./Toast";
import { debounce } from "lodash";
import { Constitution, Poll, Statement, ApiKey, Vote } from "@prisma/client";
import Spinner from "./Spinner";
import type { ExtendedPoll, Principle } from "@/lib/types";
import { AdminModeIndicator, ImpersonationBanner } from "./AdminComponents";

interface ExtendedAboutZoneData extends AboutZoneData {
  uid?: string;
  principles: Principle[];
  requireAuth: boolean;
  allowContributions: boolean;
  constitutions: Constitution[];
  activeConstitutionId?: string | null;
  polls: Poll[];
  published?: boolean;
  apiEnabled?: boolean;
  advancedOptionsEnabled?: boolean;
  autoCreateConstitution?: boolean;
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

export default function CommunityModelFlow({
  initialModelId,
}: CommunityModelFlowProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAdminMode = searchParams.get("admin") === "true";
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

  // Load model data from localStorage on initial render
  useEffect(() => {
    // Only attempt to load from localStorage if we're not already loading from the server
    if (initialModelId && !isLoading) {
      const cachedData = localStorage.getItem(`model_data_${initialModelId}`);
      if (cachedData) {
        try {
          const parsedData = JSON.parse(cachedData);
          console.log(
            "Loaded model data from localStorage on initial render:",
            parsedData,
          );

          // Only set the data if it matches the current modelId and we don't already have data
          if (
            parsedData.uid === initialModelId &&
            (!modelData || modelData.uid !== initialModelId)
          ) {
            setModelData(parsedData);
            // Set active zones based on cached data
            setActiveZones([
              "about",
              "principles",
              "poll",
              "communityModel",
              "advanced",
            ]);
          }
        } catch (error) {
          console.error("Error parsing cached model data:", error);
        }
      }
    }

    // Cleanup function to remove localStorage data when component unmounts
    return () => {
      if (initialModelId) {
        // We keep the data for a short time to handle page transitions
        // but set a timeout to clean it up after a few minutes
        setTimeout(
          () => {
            localStorage.removeItem(`model_data_${initialModelId}`);
          },
          5 * 60 * 1000,
        ); // 5 minutes
      }
    };
  }, [initialModelId, isLoading, modelData]);

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
      // Skip fetching if we already have model data for this modelId
      if (modelId) {
        setIsLoading(true);
        try {
          console.log("Fetching model data for ID:", modelId);

          // Fetch fresh data from server instead of relying on potentially stale cache
          const fetchedModelData = await getCommunityModel(modelId);
          console.log("Loaded model data from server:", fetchedModelData);

          if (fetchedModelData) {
            // Create a complete model data object from the fetched data
            const newData: ExtendedAboutZoneData = {
              uid: fetchedModelData.uid,
              name: fetchedModelData.name || "Default Name",
              bio: fetchedModelData.bio || "",
              goal: fetchedModelData.goal || "",
              logoUrl: fetchedModelData.logoUrl || "",
              principles: fetchedModelData.principles.map((p) => ({
                id: p.id,
                text: p.text,
                gacScore: p.gacScore,
              })),
              requireAuth: fetchedModelData.requireAuth || false,
              allowContributions: fetchedModelData.allowContributions || false,
              constitutions: fetchedModelData.constitutions || [],
              activeConstitutionId:
                fetchedModelData.activeConstitutionId || undefined,
              polls: fetchedModelData.polls || [],
              published: fetchedModelData.published || false,
              apiEnabled: fetchedModelData.apiEnabled || false,
              advancedOptionsEnabled:
                fetchedModelData.advancedOptionsEnabled || false,
              autoCreateConstitution:
                fetchedModelData.autoCreateConstitution || false,
              // Handle optional/custom properties
              apiKeys: (fetchedModelData as any).apiKeys || [],
              owner: {
                uid: fetchedModelData.owner.uid,
                name: fetchedModelData.owner.name,
                clerkUserId: fetchedModelData.owner.clerkUserId || "",
              },
            };

            // Update cache with this fresh data
            localStorage.setItem(
              `model_data_${modelId}`,
              JSON.stringify(newData)
            );

            setModelData(newData);
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
          setIsPageLoading(false);
        }
      } else {
        setIsPageLoading(false);
      }
    }

    fetchModelData();
  }, [modelId, router, handleHashChange]);

  const handleAboutSubmit = async (data: Partial<ExtendedAboutZoneData>) => {
    setSavingStatus((prev) => ({ ...prev, about: "saving" }));
    setIsSaving(true);
    try {
      if (!modelId) {
        const newModelId = await createCommunityModel({
          name: data.name || "",
          bio: data.bio || "",
          goal: data.goal || "",
          principles: data.principles?.map((p) => ({
            id: p.id,
            text: p.text,
            gacScore: p.gacScore ?? null,
          })),
        });

        // Create complete model data
        const updatedData = {
          uid: newModelId,
          name: data.name || "",
          bio: data.bio || "",
          goal: data.goal || "",
          logoUrl: data.logoUrl || "",
          principles: data.principles || [],
          requireAuth: false,
          allowContributions: false,
          constitutions: [],
          activeConstitutionId: undefined,
          polls: [],
          published: false,
          apiEnabled: false,
          advancedOptionsEnabled: false,
          autoCreateConstitution: false,
          apiKeys: [],
        } as ExtendedAboutZoneData;

        // Update state before navigation
        setModelData(updatedData);
        setModelId(newModelId);

        // Cache the model data in localStorage before navigation
        localStorage.setItem(
          `model_data_${newModelId}`,
          JSON.stringify(updatedData),
        );

        // Use router.replace instead of push to avoid full page reload
        // This helps maintain state during navigation
        router.replace(`/community-models/flow/${newModelId}`);

        // Set active zones after navigation
        setActiveZones((prev) => [...prev, "principles"]);
      } else {
        await updateCommunityModel(modelId, data);

        // Update the model data in state
        const updatedData = {
          ...modelData,
          ...data,
          uid: modelId, // Ensure the uid is preserved
        } as ExtendedAboutZoneData;

        setModelData(updatedData);

        // Update the cached data
        localStorage.setItem(
          `model_data_${modelId}`,
          JSON.stringify(updatedData),
        );
      }

      setSavingStatus((prev) => ({ ...prev, about: "saved" }));
      setTimeout(
        () => setSavingStatus((prev) => ({ ...prev, about: "idle" })),
        2000,
      );

      setShowToast(true);
      if (!isExistingModel && modelId) {
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
        const updatedPrinciples = data.principles
          ? data.principles.map((p) => ({
              id: p.id,
              text: p.text,
              gacScore: p.gacScore ?? 0,
            }))
          : [];

        // Include toggle settings when updating principles
        await updateCommunityModel(modelId, {
          principles: updatedPrinciples,
          requireAuth: data.requireAuth !== undefined ? data.requireAuth : modelData?.requireAuth,
          allowContributions: data.allowContributions !== undefined ? data.allowContributions : modelData?.allowContributions,
        });

        // Update the model data in state
        const updatedData = {
          ...modelData,
          principles: updatedPrinciples,
          requireAuth: data.requireAuth !== undefined ? data.requireAuth : modelData?.requireAuth,
          allowContributions: data.allowContributions !== undefined ? data.allowContributions : modelData?.allowContributions,
        } as ExtendedAboutZoneData;

        setModelData(updatedData);

        // Update the cached data in localStorage
        localStorage.setItem(
          `model_data_${modelId}`,
          JSON.stringify(updatedData),
        );

        setSavingStatus((prev) => ({ ...prev, principles: "saved" }));
        setTimeout(
          () => setSavingStatus((prev) => ({ ...prev, principles: "idle" })),
          2000,
        );
      } catch (error) {
        console.error("Error updating principles:", error);
        setSavingStatus((prev) => ({ ...prev, principles: "idle" }));
      }
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

    try {
      setSavingStatus((prev) => ({ ...prev, [zone]: "saving" }));
      
      // Preserve existing principles if they're not included in the update
      // This prevents accidental deletion of principles when updating other fields
      let dataToUpdate = { ...data };
      
      // If we're not specifically updating principles and the current modelData has principles,
      // ensure we include them in the update to prevent deletion
      if (!data.principles && modelData?.principles && zone !== 'principles') {
        dataToUpdate.principles = modelData.principles.map(p => ({
          id: p.id,
          text: p.text,
          gacScore: p.gacScore ?? 0
        }));
      }
      
      await updateCommunityModel(modelId, dataToUpdate);

      // Update the model data in state
      const updatedData = {
        ...modelData,
        ...dataToUpdate,
      } as ExtendedAboutZoneData;

      setModelData(updatedData);

      // Update the cached data in localStorage
      localStorage.setItem(
        `model_data_${modelId}`,
        JSON.stringify(updatedData),
      );

      setSavingStatus((prev) => ({ ...prev, [zone]: "saved" }));
      setTimeout(
        () => setSavingStatus((prev) => ({ ...prev, [zone]: "idle" })),
        2000,
      );
    } catch (error) {
      console.error(`Error saving ${zone}:`, error);
      setSavingStatus((prev) => ({ ...prev, [zone]: "idle" }));
    }
  };

  const debouncedSaveModelData = debounce(saveModelData, 500);

  const handleUpdatePollOptions = useCallback(
    async (options: {
      minVotesBeforeSubmission: number | null;
      maxVotesPerParticipant: number | null;
      maxSubmissionsPerParticipant: number | null;
      minRequiredSubmissions: number | null;
      completionMessage: string | null;
    }) => {
      if (!modelId) return;

      try {
        setSavingStatus((prev) => ({ ...prev, advanced: "saving" }));

        const updatedPoll = await updatePoll(modelId, {
          ...modelData?.polls?.[0],
          ...options,
        });

        // Update the model data in state
        const updatedData = {
          ...modelData,
          polls: [updatedPoll, ...(modelData?.polls?.slice(1) || [])],
        } as ExtendedAboutZoneData;

        setModelData(updatedData);

        // Update the cached data in localStorage
        localStorage.setItem(
          `model_data_${modelId}`,
          JSON.stringify(updatedData),
        );

        setSavingStatus((prev) => ({ ...prev, advanced: "saved" }));
        setTimeout(
          () => setSavingStatus((prev) => ({ ...prev, advanced: "idle" })),
          2000,
        );
      } catch (error) {
        console.error("Error updating poll options:", error);
      }
    },
    [modelId, modelData],
  );

  if (isPageLoading || isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white/80 z-50">
        <div className="bg-white p-6 rounded-lg shadow-md flex flex-col items-center">
          <Spinner size="large" color="#4A5568" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 md:py-8">
      {isAdminMode && (
        <>
          <AdminModeIndicator />
          {modelData?.owner && (
            <ImpersonationBanner
              user={
                {
                  uid: modelData.owner.uid,
                  name: modelData.owner.name,
                  email: "user@example.com", // Placeholder since email is required but not in our data
                  clerkUserId: modelData.owner.clerkUserId || "",
                  createdAt: new Date(),
                  updatedAt: new Date(),
                  participantId: null,
                } as any
              } // Type assertion to avoid type errors
              onExit={() => router.push("/admin")}
            />
          )}
        </>
      )}

      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">
          {modelData?.name && modelData.name.trim() ? (
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
            onSave={handleAboutSubmit}
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
                  const transformedData = {
                    ...data,
                    principles: data.principles
                      ? ((data.principles as Partial<Principle>[]).map((p) => ({
                          id: p.id!,
                          text: p.text!,
                          gacScore: p.gacScore ?? 0,
                        })) as Principle[])
                      : undefined,
                  };
                  handleUpdatePrinciples(transformedData);
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
                  ownerId={modelData?.owner?.uid || ""}
                  apiKeys={modelData.apiKeys || []}
                  onToggle={() => toggleZone("advanced")}
                  savingStatus={savingStatus.advanced}
                  apiEnabled={modelData.apiEnabled}
                  advancedOptionsEnabled={modelData.advancedOptionsEnabled}
                  autoCreateConstitution={modelData.autoCreateConstitution}
                  onUpdateAutoCreateConstitution={(enabled) => {
                    setModelData((prevData) => {
                      if (!prevData) return null;
                      return {
                        ...prevData,
                        autoCreateConstitution: enabled,
                      } as ExtendedAboutZoneData;
                    });
                    debouncedSaveModelData(
                      { autoCreateConstitution: enabled },
                      "advanced",
                    );
                  }}
                  pollOptions={
                    modelData.polls?.[0] || {
                      minVotesBeforeSubmission: null,
                      maxVotesPerParticipant: null,
                      maxSubmissionsPerParticipant: null,
                      minRequiredSubmissions: null,
                      completionMessage: null,
                    }
                  }
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
