"use client";

import { createPoll } from "@/lib/actions";
import Button from "./Button";

export default function Form() {
  return (
    <form action={createPoll} className="flex flex-col">
      <Button type="submit" title="New poll" />
    </form>
  );
}
