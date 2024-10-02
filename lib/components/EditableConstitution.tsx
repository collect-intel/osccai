"use client";

import React, { useState } from "react";
import { updateConstitution } from "@/lib/actions";

interface EditableConstitutionProps {
  constitutionId: string;
  initialContent: string;
}

export default function EditableConstitution({
  constitutionId,
  initialContent,
}: EditableConstitutionProps) {
  const [content, setContent] = useState(initialContent);
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = async () => {
    await updateConstitution(constitutionId, content);
    setIsEditing(false);
  };

  return (
    <div>
      <div className="mb-2">
        {isEditing ? (
          <div>
            <button
              onClick={handleSave}
              className="bg-teal text-white px-4 py-2 rounded hover:bg-slate-900 mr-2"
            >
              Save
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="bg-gray-300 text-black px-4 py-2 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="bg-teal text-white px-4 py-2 rounded hover:bg-slate-900"
          >
            Edit Constitution
          </button>
        )}
      </div>
      {isEditing ? (
        <textarea
          className="w-full h-64 p-2 border rounded"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
      ) : (
        <div className="mt-2 p-4 bg-gray-100 rounded whitespace-pre-wrap">
          {content}
        </div>
      )}
    </div>
  );
}
