"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createCommunityModel } from "@/lib/actions";

export default function NewCommunityModelForm() {
  const [name, setName] = useState("");
  const [initialIdea, setInitialIdea] = useState("");
  const router = useRouter();

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const modelId = await createCommunityModel(name, initialIdea);
        router.push(`/community-models/${modelId}`);
      }}
      className="flex flex-col"
    >
      <input
        type="text"
        placeholder="Community Model Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        name="name"
        className="mb-4 p-2 border"
        required
      />
      <textarea
        placeholder="Initial Idea"
        value={initialIdea}
        onChange={(e) => setInitialIdea(e.target.value)}
        name="initialIdea"
        className="mb-4 p-2 border"
        required
      />
      <button type="submit" className="bg-teal text-white p-2 rounded">
        Create Community Model
      </button>
    </form>
  );
}
