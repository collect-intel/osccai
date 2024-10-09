import React, { useState, useRef, useEffect } from "react";
import { FaPencilAlt, FaTrash, FaCheck } from "react-icons/fa";
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
  gacScore,
  onUpdate,
  onDelete,
  isEditing,
  setIsEditing,
}) => {
  const [editedText, setEditedText] = useState(text);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditedText(text);
  }, [text]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmedText = editedText.trim();
    console.log("trimmedText", trimmedText);
    if (trimmedText !== "") {
      onUpdate(trimmedText);
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col space-y-2 bg-white p-4 rounded-md shadow">
      {isEditing ? (
        <form onSubmit={handleSubmit} className="flex-grow">
          <input
            ref={inputRef}
            type="text"
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full p-2 border rounded"
          />
        </form>
      ) : (
        <p className="flex-grow text-lg">{editedText}</p>
      )}
      {!isLoading && (
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center space-x-2">
            {isEditing ? (
              <button
                onClick={handleSubmit}
                className="text-green-500 hover:text-green-700 p-1"
              >
                <FaCheck />
              </button>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="text-blue-500 hover:text-blue-700 p-1"
              >
                <FaPencilAlt />
              </button>
            )}
            <button
              onClick={() => setShowDeleteModal(true)}
              className="text-red-500 hover:text-red-700 p-1"
            >
              <FaTrash />
            </button>
          </div>
          {gacScore !== undefined && (
            <span className="text-sm text-gray-500">Score: {gacScore}</span>
          )}
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
