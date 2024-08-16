"use client";
import { useState } from "react";
import { createSurvey } from "@/lib/actions";

export default function Form() {
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");

  return (
    <form
      action={async () => {
        await createSurvey(title, instructions);
        setTitle("");
        setInstructions("");
      }}
      className="flex flex-col"
    >
      <input
        type="text"
        name="title"
        placeholder="Survey Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <textarea
        name="instructions"
        placeholder="Survey Instructions"
        value={instructions}
        onChange={(e) => setInstructions(e.target.value)}
      />
      <button type="submit">Create New Survey</button>
    </form>
  );
}
