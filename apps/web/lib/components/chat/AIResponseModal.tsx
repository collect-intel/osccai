import React, { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { MessageWithFields } from "../../types";

interface AIResponseModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: MessageWithFields | null;
}

const AIResponseModal: React.FC<AIResponseModalProps> = ({
  isOpen,
  onClose,
  message,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEsc);
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !message) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        ref={modalRef}
        className="bg-white rounded-lg p-6 max-w-2xl max-h-[80vh] overflow-y-auto"
      >
        <h2 className="text-2xl font-bold mb-4">AI Response Details</h2>

        {message.draft_response && (
          <div className="mb-4">
            <h3 className="text-lg font-semibold">Draft Response:</h3>
            <ReactMarkdown className="bg-gray-100 p-2 rounded">
              {message.draft_response}
            </ReactMarkdown>
          </div>
        )}

        {message.response_metrics && (
          <div className="mb-4">
            <h3 className="text-lg font-semibold">Response Metrics:</h3>
            <ReactMarkdown className="bg-gray-100 p-2 rounded">
              {message.response_metrics}
            </ReactMarkdown>
          </div>
        )}

        {message.improvement_strategy && (
          <div className="mb-4">
            <h3 className="text-lg font-semibold">Improvement Strategy:</h3>
            <ReactMarkdown className="bg-gray-100 p-2 rounded">
              {message.improvement_strategy}
            </ReactMarkdown>
          </div>
        )}

        <button
          onClick={onClose}
          className="mt-4 px-4 py-2 bg-teal text-white rounded hover:bg-black"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default AIResponseModal;
