"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createCommunityModel } from "@/lib/actions";
import { getAnonymousId } from "@/lib/client_utils/getAnonymousId";

export default function NewCommunityModelForm() {
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const router = useRouter();

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const modelId = await createCommunityModel({
          name,
          goal,
          logoUrl: "",
        });
        router.push(`/community-models/flow/${modelId}`);
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
        value={goal}
        onChange={(e) => setGoal(e.target.value)}
        name="goal"
        className="mb-4 p-2 border"
        required
      />
      <button type="submit" className="bg-teal text-white p-2 rounded">
        Create Community Model
      </button>
    </form>
  );
}
