import React, { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import ZoneWrapper from "./ZoneWrapper";
import LogoUploader from "../LogoUploader";

export interface AboutZoneData {
  name: string;
  bio: string;
  goal: string;
  logoUrl: string | null;
}

interface AboutZoneProps {
  isActive: boolean;
  onSave: (data: AboutZoneData) => Promise<void>;
  initialData?: AboutZoneData;
  isExistingModel: boolean;
  modelId?: string;
  onToggle: () => void;
  onUpdate: (data: Partial<AboutZoneData>) => void;
  savingStatus: "idle" | "saving" | "saved";
}

export default function AboutZone({
  isActive,
  onSave,
  initialData,
  isExistingModel,
  modelId,
  onToggle,
  onUpdate,
  savingStatus,
}: AboutZoneProps) {
  const [name, setName] = useState(initialData?.name || "");
  const [bio, setBio] = useState(initialData?.bio || "");
  const [goal, setGoal] = useState(initialData?.goal || "");
  const [logoUrl, setLogoUrl] = useState<string | null>(
    initialData?.logoUrl || null,
  );
  const [isSaveDisabled, setIsSaveDisabled] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [localStorageKey, setLocalStorageKey] = useState<string>("");
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const key = isExistingModel ? `cm_${modelId}_` : `cm_new_${uuidv4()}_`;
    setLocalStorageKey(key);

    // Load data from localStorage
    const storedName = localStorage.getItem(`${key}name`);
    const storedBio = localStorage.getItem(`${key}bio`);
    const storedGoal = localStorage.getItem(`${key}goal`);
    const storedLogoUrl = localStorage.getItem(`${key}logoUrl`);

    if (storedName) setName(storedName);
    if (storedBio) setBio(storedBio);
    if (storedGoal) setGoal(storedGoal);
    if (storedLogoUrl) setLogoUrl(storedLogoUrl);

    // Clean up function to remove localStorage items when component unmounts
    return () => {
      if (!isExistingModel) {
        localStorage.removeItem(`${key}name`);
        localStorage.removeItem(`${key}bio`);
        localStorage.removeItem(`${key}goal`);
        localStorage.removeItem(`${key}logoUrl`);
      }
    };
  }, [isExistingModel, modelId]);

  useEffect(() => {
    setIsSaveDisabled(
      name.trim() === "" || bio.trim() === "" || goal.trim() === "",
    );
  }, [name, bio, goal]);

  useEffect(() => {
    if (localStorageKey && isClient) {
      localStorage.setItem(`${localStorageKey}name`, name);
      localStorage.setItem(`${localStorageKey}bio`, bio);
      localStorage.setItem(`${localStorageKey}goal`, goal);
      if (logoUrl) localStorage.setItem(`${localStorageKey}logoUrl`, logoUrl);
    }
  }, [localStorageKey, name, bio, goal, logoUrl, isClient]);

  const handleChange = (field: keyof AboutZoneData, value: string | null) => {
    const newData = { ...{ name, bio, goal, logoUrl }, [field]: value };
    if (field === "name") setName(value as string);
    if (field === "bio") setBio(value as string);
    if (field === "goal") setGoal(value as string);
    if (field === "logoUrl") setLogoUrl(value as string);

    // Call onUpdate for every change if it's a new model
    if (!isExistingModel) {
      onUpdate(newData);
    }
  };

  const handleBlur = (field: keyof AboutZoneData) => {
    if (isExistingModel) {
      const data = {
        [field]:
          field === "logoUrl"
            ? logoUrl
            : field === "name"
              ? name
              : field === "bio"
                ? bio
                : goal,
      };
      if (data[field] && data[field].trim() !== "") {
        console.log("Updating on blur:", field, data[field]); // Add this log
        onUpdate(data);
      }
    }
  };

  const handleLogoUpload = (file: { name: string; url: string } | null) => {
    setLogoUrl(file ? file.url : null);
  };

  const handleLogoUploadError = (error: string) => {
    console.error("Logo upload error:", error);
  };

  const handleSave = async () => {
    if (!isSaveDisabled) {
      setIsSaving(true);
      try {
        await onSave({ name, bio, goal, logoUrl });
        // Clear local storage after successful save
        localStorage.removeItem(`${localStorageKey}name`);
        localStorage.removeItem(`${localStorageKey}bio`);
        localStorage.removeItem(`${localStorageKey}goal`);
        localStorage.removeItem(`${localStorageKey}logoUrl`);
      } catch (error) {
        console.error("Error saving community model:", error);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const getCharCountColor = (current: number, max: number) => {
    if (current === max) return "text-red-500";
    if (current >= max * 0.9) return "text-amber-500";
    return "text-gray-500";
  };

  if (!isClient) {
    return null; // or a loading spinner
  }

  return (
    <ZoneWrapper
      title="About"
      subtitle="Tell us about your community and what you hope to achieve with your AI model."
      isActive={isActive}
      onToggle={onToggle}
      savingStatus={savingStatus}
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            What is your community called?
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => handleChange("name", e.target.value)}
            onBlur={() => handleBlur("name")}
            maxLength={50}
            className="mt-1 bg-off-white block w-full rounded-md border-gray-300 shadow-sm focus:border-teal focus:ring-teal"
            required
          />
          <p
            className={`text-sm mt-1 text-right ${getCharCountColor(name.length, 50)}`}
          >
            {name.length}/50
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload your community logo
          </label>
          <LogoUploader
            initialLogo={logoUrl}
            onLogoUpload={(file) => {
              handleChange("logoUrl", file ? file.url : null);
              handleBlur("logoUrl");
            }}
            onUploadError={handleLogoUploadError}
          />
        </div>
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700">
            Add your community bio
          </label>
          <textarea
            value={bio}
            onChange={(e) => handleChange("bio", e.target.value)}
            onBlur={() => handleBlur("bio")}
            rows={3}
            maxLength={2000}
            className="mt-1 bg-off-white block w-full rounded-md border-gray-300 shadow-sm focus:border-teal focus:ring-teal"
            required
          />
          <p
            className={`text-sm mt-1 text-right absolute bottom-2 right-2 bg-off-white px-1 ${getCharCountColor(bio.length, 2000)}`}
          >
            {bio.length}/2000
          </p>
        </div>
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700">
            What do you hope to achieve with your community AI model?
          </label>
          <textarea
            value={goal}
            onChange={(e) => handleChange("goal", e.target.value)}
            onBlur={() => handleBlur("goal")}
            rows={3}
            maxLength={2000}
            className="mt-1 bg-off-white block w-full rounded-md border-gray-300 shadow-sm focus:border-teal focus:ring-teal"
            required
          />
          <p
            className={`text-sm mt-1 text-right absolute bottom-2 right-2 bg-off-white px-1 ${getCharCountColor(goal.length, 2000)}`}
          >
            {goal.length}/2000
          </p>
        </div>
        {!isExistingModel && (
          <button
            onClick={handleSave}
            className={`bg-teal text-white px-4 py-2 rounded flex items-center ${isSaveDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
            disabled={isSaveDisabled || isSaving}
          >
            {isSaving ? "Saving..." : "Save and begin defining principles"}
          </button>
        )}
      </div>
    </ZoneWrapper>
  );
}
