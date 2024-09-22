"use client";

import React, { useState } from "react";
import { Statement } from "@prisma/client";
import Button from "@/lib/components/Button";
import Modal from "@/lib/components/Modal";

interface StatementListProps {
  statements: Statement[];
  onUpdate: (updatedStatements: Statement[]) => void;
}

const StatementList: React.FC<StatementListProps> = ({ statements, onUpdate }) => {
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

  const handleDeleteConfirmation = (statement: Statement) => {
    setStatementToDelete(statement);
    setShowDeleteConfirmation(true);
  };

  const handleDelete = () => {
    if (statementToDelete) {
      const updatedStatements = statements.filter((s) => s.uid !== statementToDelete.uid);
      onUpdate(updatedStatements);
      setShowDeleteConfirmation(false);
      setStatementToDelete(null);
    }
  };

  const handleAddStatement = () => {
    if (newStatementText.trim()) {
      const newStatement: Statement = {
        uid: crypto.randomUUID(),
        text: newStatementText.trim(),
        participantId: "", // You'll need to provide a valid participantId
        pollId: "", // You'll need to provide a valid pollId
        status: "PENDING",
        votes: [],
        flags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        deleted: false,
      };
      onUpdate([...statements, newStatement]);
      setNewStatementText("");
    }
  };

  return (
    <div>
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
                    onClick={() => handleEdit(statement)}
                    variant="secondary"
                    className="mr-2"
                  />
                  <Button
                    title="Delete"
                    onClick={() => handleDeleteConfirmation(statement)}
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
        <Button title="Add" onClick={handleAddStatement} />
      </div>
      <Modal
        isOpen={showDeleteConfirmation}
        onClose={() => setShowDeleteConfirmation(false)}
        onConfirm={handleDelete}
        title="Confirm Delete"
        message="Are you sure you want to delete this statement?"
      />
    </div>
  );
};

export default StatementList;