"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { editPoll } from "@/lib/actions";
import Input from "@/lib/components/Input";
import Textarea from "@/lib/components/Textarea";
import Button from "@/lib/components/Button";

export default function PollCreate({ poll }: { poll: any }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const router = useRouter();

  return (
    <>
      <Input
        label="Title"
        description="What is this poll about?"
        value={title}
        setValue={setTitle}
      />
      <Textarea
        label="Description"
        description="Help participants understand what you hope to achieve through this poll."
        value={description}
        setValue={setDescription}
      />
      <div className="ml-auto mt-6">
        <Button
          title="Continue"
          onClick={async () => {
            const updatedPoll = await editPoll(poll.uid, {
              title,
              description,
            });
            router.push(`/${updatedPoll.uid}/${updatedPoll.urlSlug}/setings`);
          }}
        />
      </div>
    </>
  );
}
