"use client";

import React, { useState } from "react";
import { Statement } from "@prisma/client";
import Button from "@/lib/components/Button";
import Modal from "@/lib/components/Modal";

interface StatementListProps {
  statements: Statement[];
  onUpdate: (updatedStatements: Statement[]) => void;
  onDelete: (statementId: string) => Promise<void>;
}

const StatementList: React.FC<StatementListProps> = ({ statements, onUpdate, onDelete }) => {
  const [editingStatement, setEditingStatement] = useState<Statement | null>(null);
  const [newStatementText, setNewStatementText] = useState("");
  const [editStatementText, setEditStatementText] = useState("");
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [statementToDelete, setStatementToDelete] = useState<Statement | null>(null);

  const handleEdit = (statement: Statement) => {
    setEditingStatement(statement);
    setEditStatementText(statement.text);
  };

  const handleUpdate = (statement: Statement, newText: string) => {
    const updatedStatements = statements.map((s) =>
      s.uid === statement.uid ? { ...s, text: newText } : s
    );
    onUpdate(updatedStatements);
    setEditingStatement(null);
    setEditStatementText("");
  };

  const handleDeleteConfirmation = (e: React.MouseEvent, statement: Statement) => {
    e.preventDefault();
    e.stopPropagation();
    setStatementToDelete(statement);
    setShowDeleteConfirmation(true);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (statementToDelete) {
      try {
        await onDelete(statementToDelete.uid); // Call the parent's onDelete function
        setShowDeleteConfirmation(false);
        setStatementToDelete(null);
      } catch (error) {
        console.error("Failed to delete statement:", error);
        // Optionally, show an error message to the user?
      }
    }
  };

  const handleAddStatement = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault(); // Prevent form submission
    if (newStatementText.trim()) {
      const newStatement: Statement = {
        uid: crypto.randomUUID(),
        text: newStatementText.trim(),
        participantId: "", // This will be set server-side
        pollId: "", // This will be set server-side
        status: "PENDING",
        createdAt: new Date(),
        updatedAt: new Date(),
        deleted: false,
      };
      onUpdate([...statements, newStatement]);
      setNewStatementText("");
    }
  };

  return (
    <div onClick={(e) => e.stopPropagation()}> {/* Add this wrapper */}
      <h3 className="text-lg font-semibold mb-4">Statements</h3>
      <ul className="space-y-2">
        {statements.map((statement) => (
          <li key={statement.uid} className="flex items-center justify-between bg-gray-100 rounded-md px-4 py-2">
            {editingStatement?.uid === statement.uid ? (
              <div className="flex items-center">
                <input
                  type="text"
                  value={editStatementText}
                  onChange={(e) => setEditStatementText(e.target.value)}
                  className="border border-gray-300 rounded px-2 py-1 mr-2 w-full"
                />
                <Button
                  title="Update"
                  onClick={() => handleUpdate(statement, editStatementText)}
                  className="mr-2"
                />
                <Button
                  title="Cancel"
                  onClick={() => setEditingStatement(null)}
                  variant="secondary"
                />
              </div>
            ) : (
              <div className="flex items-center w-full">
                <span className="mr-4">{statement.text}</span>
                <div className="ml-auto flex">
                  <Button
                    title="Edit"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleEdit(statement);
                    }}
                    variant="secondary"
                    className="mr-2"
                  />
                  <Button
                    title="Delete"
                    onClick={(e) => handleDeleteConfirmation(e, statement)}
                    variant="danger"
                  />
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
      <div className="mt-4 flex items-center">
        <input
          type="text"
          value={newStatementText}
          onChange={(e) => setNewStatementText(e.target.value)}
          placeholder="Add a new statement..."
          className="border border-gray-300 rounded px-2 py-1 mr-2 w-full"
        />
        <Button 
          title="Add" 
          onClick={handleAddStatement}
        />
      </div>
      <Modal
        isOpen={showDeleteConfirmation}
        onClose={() => setShowDeleteConfirmation(false)}
      >
        <div> {/* Add this wrapper */}
          <h2 className="text-xl font-bold mb-4">Confirm Delete</h2>
          <p className="mb-4">Are you sure you want to delete this statement?</p>
          <div className="flex justify-end space-x-2">
            <Button
              onClick={(e) => {
                e.preventDefault(); // Prevent form submission
                setShowDeleteConfirmation(false);
              }}
              variant="secondary"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              variant="danger"
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default StatementList;