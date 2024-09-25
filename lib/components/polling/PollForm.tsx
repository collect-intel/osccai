"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Poll, Statement, StatementStatus } from "@prisma/client";
import Input from "@/lib/components/Input";
import Textarea from "@/lib/components/Textarea";
import Button from "@/lib/components/Button";
import { updatePoll, createPoll, deleteStatement } from "@/lib/actions"; // Add deleteStatement
import StatementList from "@/lib/components/polling/StatementList";
import Toggle from "@/lib/components/Toggle";

interface PollFormProps {
  poll: Partial<Poll & { statements: Statement[] }>; // Make poll partial
  communityModelId: string;
}

export default function PollForm({ poll, communityModelId }: PollFormProps) {
  const [title, setTitle] = useState(poll?.title || "");
  const [description, setDescription] = useState(poll?.description || "");
  const [statements, setStatements] = useState<Statement[]>(
    poll?.statements?.filter((s) => !s.deleted) || [],
  );
  const [requireAuth, setRequireAuth] = useState(poll?.requireAuth || false);
  const [allowParticipantStatements, setAllowParticipantStatements] = useState(
    poll?.allowParticipantStatements || false,
  );
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const pollData = {
      title,
      description,
      statements: statements.map(
        ({
          uid,
          text,
          participantId,
          pollId,
          status,
          createdAt,
          updatedAt,
          deleted,
        }) => ({
          uid,
          text,
          participantId,
          pollId: poll.uid || "",
          status: status as StatementStatus,
          createdAt,
          updatedAt,
          deleted,
        }),
      ),
      requireAuth,
      allowParticipantStatements,
      published: true,
    };

    if (poll.uid) {
      await updatePoll(poll.uid, pollData);
      router.push(`/polls/${poll.uid}`);
    } else {
      const newPoll = await createPoll(communityModelId, pollData);
      router.push(`/polls/${newPoll.uid}`);
    }
  };

  const handleDeleteStatement = async (statementId: string) => {
    try {
      await deleteStatement(statementId);
      setStatements((prevStatements) =>
        prevStatements.filter((s) => s.uid !== statementId),
      );
    } catch (error) {
      console.error("Failed to delete statement:", error);
      // Optionally, show an error message to the user
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Input
        label="Title"
        value={title}
        setValue={setTitle} // Change onChange to setValue
        description=""
      />
      <Textarea
        label="Description"
        value={description}
        setValue={setDescription} // Change onChange to setValue
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
        onDelete={handleDeleteStatement}
      />
      <div className="flex justify-end">
        <Button onClick={handleSubmit}>
          {" "}
          {/* Remove type="submit" */}
          {poll.uid ? "Save Changes" : "Create Poll"}
        </Button>
      </div>
    </form>
  );
}
