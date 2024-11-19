import { useState, useMemo, useEffect } from 'react';
import { SavedChat, formatTimeAgo, getChats, createNewChatId } from '@/lib/utils/chatStorage';
import { FaPlus, FaTrash, FaComments } from 'react-icons/fa';
import Modal from '@/lib/components/Modal';

interface ChatHistoryProps {
  currentChatId: string;
  newChatId: string;
  onChatSelect: (chatId: string) => void;
  onNewChat: () => void;
  onDeleteChat: (chatId: string) => void;
  onClearAll: () => void;
}

const ChatHistory: React.FC<ChatHistoryProps> = ({
  currentChatId,
  newChatId: propNewChatId,
  onChatSelect,
  onNewChat,
  onDeleteChat,
  onClearAll,
}) => {
  const [chats, setChats] = useState<Record<string, SavedChat>>({});
  const [isClient, setIsClient] = useState(false);
  const [newChatId, setNewChatId] = useState(propNewChatId);
  const [chatToDelete, setChatToDelete] = useState<string | null>(null);
  const [showClearAllModal, setShowClearAllModal] = useState(false);

  useEffect(() => {
    setChats(getChats());
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    const handleStorage = () => {
      setChats(getChats());
    };

    window.addEventListener('storage', handleStorage);
    const interval = setInterval(handleStorage, 1000);

    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, [isClient]);

  useEffect(() => {
    if (currentChatId && chats[currentChatId]) {
      setNewChatId(createNewChatId());
    } else if (currentChatId) {
      setNewChatId(currentChatId);
    }
  }, [currentChatId, chats]);

  useEffect(() => {
    setNewChatId(propNewChatId);
  }, [propNewChatId]);

  const sortedChats = useMemo(() => {
    const savedChats = Object.values(chats)
      .filter(chat => chat.id !== newChatId)
      .sort((a, b) => b.lastUpdated - a.lastUpdated);
    
    return [{ 
      id: newChatId, 
      title: "New Chat", 
      messages: [], 
      lastUpdated: 0,
      isPseudoEntry: true
    }, ...savedChats];
  }, [chats, newChatId]);

  const handleDeleteChat = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setChatToDelete(chatId);
  };

  const handleConfirmDelete = () => {
    if (chatToDelete) {
      onDeleteChat(chatToDelete);
      setChatToDelete(null);
    }
  };

  const handleConfirmClearAll = () => {
    onClearAll();
    setShowClearAllModal(false);
  };

  if (!isClient) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4">
          <div className="flex gap-2 mb-2">
            <div className="flex-1 h-10 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse" />
          </div>
        </div>
        <div className="flex-1 p-2">
          <div className="h-16 bg-gray-100 dark:bg-gray-800 rounded-md animate-pulse mb-2" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        {sortedChats.length === 0 ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            No chat history yet
          </div>
        ) : (
          <div className="space-y-0.5 p-2">
            {sortedChats.map((chat) => (
              <div
                key={`chat-${chat.id}`}
                className={`group flex items-center gap-3 p-3 mx-2 rounded-lg cursor-pointer
                             transition-all duration-200
                             ${chat.id === currentChatId 
                               ? 'bg-teal/10 text-teal-700 dark:text-teal-300' 
                               : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                             }`}
                onClick={() => onChatSelect(chat.id)}
              >
                <FaComments className={`w-4 h-4 flex-shrink-0
                                     ${chat.id === currentChatId 
                                       ? 'text-teal-600' 
                                       : 'text-gray-400 group-hover:text-gray-500'
                                     }`} 
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {chat.title}
                  </div>
                  {!chat.isPseudoEntry && ( // Only show timestamp for real entries
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {formatTimeAgo(chat.lastUpdated)}
                    </div>
                  )}
                </div>
                {!chat.isPseudoEntry && ( // Only show delete button for real entries
                  <button
                    onClick={(e) => handleDeleteChat(chat.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 
                             text-gray-400 hover:text-red-500 
                             rounded-md hover:bg-gray-200 dark:hover:bg-gray-600
                             transition-all duration-200"
                    title="Delete chat"
                  >
                    <FaTrash className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {Object.keys(chats).length > 0 && (
        <div className="p-4 mt-2 bg-gray-50">
          <button
            onClick={() => setShowClearAllModal(true)}
            className="w-full px-3 py-2 text-sm font-medium text-red-600 
                     hover:text-red-700 bg-white rounded-md
                     hover:bg-red-50 transition-colors duration-200
                     flex items-center justify-center gap-2 shadow-sm"
          >
            <FaTrash className="w-3.5 h-3.5" />
            Clear All Chats
          </button>
        </div>
      )}

      {/* Delete Single Chat Modal */}
      <Modal
        isOpen={chatToDelete !== null}
        onClose={() => setChatToDelete(null)}
      >
        <div className="text-center">
          <FaTrash className="w-12 h-12 mx-auto text-red-500 mb-4" />
          <h2 className="text-xl font-semibold mb-4">Delete Chat</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Are you sure you want to delete this chat? This action cannot be undone.
          </p>
          <div className="flex justify-center gap-4">
            <button
              onClick={() => setChatToDelete(null)}
              className="px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmDelete}
              className="px-4 py-2 text-white bg-red-500 rounded-md hover:bg-red-600 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>

      {/* Clear All Chats Modal */}
      <Modal
        isOpen={showClearAllModal}
        onClose={() => setShowClearAllModal(false)}
      >
        <div className="text-center">
          <FaTrash className="w-12 h-12 mx-auto text-red-500 mb-4" />
          <h2 className="text-xl font-semibold mb-4">Clear All Chats</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Are you sure you want to delete all chats? This action cannot be undone.
          </p>
          <div className="flex justify-center gap-4">
            <button
              onClick={() => setShowClearAllModal(false)}
              className="px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmClearAll}
              className="px-4 py-2 text-white bg-red-500 rounded-md hover:bg-red-600 transition-colors"
            >
              Delete All
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ChatHistory; 