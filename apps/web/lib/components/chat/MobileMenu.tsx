import { FaTimes } from "react-icons/fa";
import ChatHistory from "./ChatHistory";
import { NEW_CHAT_ID } from "@/lib/utils/chatStorage";
import { useEffect } from "react";

interface MobileMenuProps {
  modelId: string;
  isOpen: boolean;
  onClose: () => void;
  currentChatId: string;
  onNewChat: () => void;
  onChatSelect: (chatId: string) => void;
  onDeleteChat: (chatId: string) => void;
  onClearAll: () => void;
}

export default function MobileMenu({
  modelId,
  isOpen,
  onClose,
  currentChatId,
  onNewChat,
  onChatSelect,
  onDeleteChat,
  onClearAll,
}: MobileMenuProps) {
  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  return (
    <div
      className={`fixed inset-0 bg-black bg-opacity-50 z-[100] transition-opacity duration-200 ${
        isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
      onClick={onClose}
    >
      <div
        className={`absolute right-0 top-0 h-full w-[min(80vw,320px)] bg-white transform transition-transform duration-200 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col h-full">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="text-lg font-medium">Chat History</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <FaTimes className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <ChatHistory
              modelId={modelId}
              currentChatId={currentChatId}
              newChatId={NEW_CHAT_ID}
              onChatSelect={(chatId) => {
                onChatSelect(chatId);
                onClose();
              }}
              onNewChat={() => {
                onNewChat();
                onClose();
              }}
              onDeleteChat={onDeleteChat}
              onClearAll={onClearAll}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
