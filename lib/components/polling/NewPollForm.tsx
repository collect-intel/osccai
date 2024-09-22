"use client";

import { createPoll } from "@/lib/actions";
import Button from "@/lib/components/Button";
import PlusIcon from "@/lib/components/icons/PlusIcon";

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
