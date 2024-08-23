"use client";

import { createPoll } from "@/lib/actions";
import Button from "./Button";
import PlusIcon from "./PlusIcon";

export default function Form() {
  return (
    <form action={createPoll} className="flex flex-col">
      <Button
        type="submit"
        title="New poll"
        icon={<PlusIcon className="stroke-white" />}
      />
    </form>
  );
}
