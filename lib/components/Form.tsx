"use client";
import { useState } from "react";
import { createPoll } from "@/lib/actions";

export default function Form() {
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");

  return (
    <form
      action={async () => {
        await createPoll(title, instructions);
        setTitle("");
        setInstructions("");
      }}
      className="flex flex-col"
    >
      <input
        type="text"
        name="title"
        placeholder="Poll Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <textarea
        name="instructions"
        placeholder="Poll Instructions"
        value={instructions}
        onChange={(e) => setInstructions(e.target.value)}
      />
      <button type="submit">Create New Poll</button>
    </form>
  );
}
