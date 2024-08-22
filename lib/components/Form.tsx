"use client";

import { createPoll } from "@/lib/actions";
import Button from "./Button";

const creatorId = "1";

export default function Form() {
  return (
    <form
      action={async () => void createPoll(creatorId)}
      className="flex flex-col"
    >
      <Button type="submit" title="New poll" />
    </form>
  );
}
