import React, { useState, useRef, useEffect } from "react";
import { FaTrash, FaCheck } from "react-icons/fa";
import Modal from "./Modal";

interface PrincipleProps {
  text: string;
  isLoading: boolean;
  gacScore?: number;
  onUpdate: (value: string) => void;
  onDelete: () => void;
  isEditing: boolean;
  setIsEditing: (isEditing: boolean) => void;
}

const Principle: React.FC<PrincipleProps> = ({
  text,
  isLoading,
  onUpdate,
  onDelete,
  isEditing,
  setIsEditing,
}) => {
  const [editedText, setEditedText] = useState(text);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [editedText, text]);

  useEffect(() => {
    setEditedText(text);
  }, [text]);

  useEffect(() => {
    window.addEventListener("resize", adjustTextareaHeight);
    return () => {
      window.removeEventListener("resize", adjustTextareaHeight);
    };
  }, []);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      // Move cursor to the end of the text
      textareaRef.current.setSelectionRange(
        editedText.length,
        editedText.length,
      );
    }
  }, [isEditing, editedText.length]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmedText = editedText.trim();
    if (trimmedText !== "") {
      onUpdate(trimmedText);
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditedText(e.target.value);
  };

  return (
    <div className="flex items-start bg-white p-3 rounded-md shadow">
      <div className="flex-shrink-0 mr-2">
        {isEditing && (
          <button
            onClick={handleSubmit}
            className="text-green-500 hover:text-green-700"
          >
            <FaCheck />
          </button>
        )}
      </div>
      <div className="flex-grow relative">
        <textarea
          ref={textareaRef}
          value={editedText}
          onChange={handleTextareaChange}
          onKeyDown={handleKeyDown}
          disabled={!isEditing}
          className={`w-full border-none p-0 resize-none overflow-hidden bg-transparent focus:outline-none transition-shadow duration-200`}
          rows={1}
        />
      </div>
      {!isLoading && (
        <div className="flex items-center space-x-2 ml-2">
          <button
            onClick={() => setShowDeleteModal(true)}
            className="text-red-500 hover:text-red-700"
          >
            <FaTrash />
          </button>
        </div>
      )}
      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)}>
        <div className="p-4">
          <h2 className="text-xl font-bold mb-4">Confirm Deletion</h2>
          <p className="mb-4">
            Are you sure you want to delete this principle?
          </p>
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => setShowDeleteModal(false)}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onDelete();
                setShowDeleteModal(false);
              }}
              className="px-4 py-2 bg-red-500 text-white rounded"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Principle;
