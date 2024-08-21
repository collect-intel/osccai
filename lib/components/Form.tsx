"use client";

import { createPoll } from "@/lib/actions";

const creatorId = "1";

export default function Form() {
  return (
    <form
      action={async () => void createPoll(creatorId)}
      className="flex flex-col"
    >
      <button type="submit">Create New Poll</button>
    </form>
  );
}
