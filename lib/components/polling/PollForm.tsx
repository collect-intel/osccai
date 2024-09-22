"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Poll, Statement } from "@prisma/client";
import Input from "@/lib/components/Input";
import Textarea from "@/lib/components/Textarea";
import Button from "@/lib/components/Button";
import { updatePoll, createPoll } from "@/lib/actions"; // Add createPoll
import StatementList from "@/lib/components/polling/StatementList";
import Toggle from "@/lib/components/Toggle";

interface PollFormProps {
  poll: Partial<Poll & { statements: Statement[] }>; // Make poll partial
  communityModelId: string;
}

export default function PollForm({ poll, communityModelId }: PollFormProps) {
  const [title, setTitle] = useState(poll?.title || "");
  const [description, setDescription] = useState(poll?.description || "");
  const [statements, setStatements] = useState<Statement[]>(poll?.statements || []);
  const [requireAuth, setRequireAuth] = useState(poll?.requireAuth || false);
  const [allowParticipantStatements, setAllowParticipantStatements] = useState(poll?.allowParticipantStatements || false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const pollData = { 
      title, 
      description, 
      statements,
      requireAuth,
      allowParticipantStatements,
      communityModelId
    };

    if (poll.uid) {
      await updatePoll(poll.uid, pollData);
      router.push(`/polls/${poll.uid}`);
    } else {
      const newPoll = await createPoll(pollData);
      router.push(`/polls/${newPoll.uid}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Input
        label="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        description=""
      />
      <Textarea
        label="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        description=""
      />
      <Toggle
        label="Require Authentication"
        enabled={requireAuth}
        setEnabled={setRequireAuth}
        details=""
      />
      <Toggle
        label="Allow Participant Statements"
        enabled={allowParticipantStatements}
        setEnabled={setAllowParticipantStatements}
        details=""
      />
      <StatementList
        statements={statements}
        onUpdate={(updatedStatements) => setStatements(updatedStatements)}
      />
      <div className="flex justify-end">
        <Button type="submit">
          {poll.uid ? "Save Changes" : "Create Poll"}
        </Button>
      </div>
    </form>
  );
}