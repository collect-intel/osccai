"use client";

import { useState, useEffect, useCallback } from "react";
import ModelInfoBar from "@/lib/components/chat/ModelInfoBar";
import ConstitutionIcon from "@/lib/components/icons/ConstitutionIcon";
import ChatHistory from "@/lib/components/chat/ChatHistory";
import {
  createNewChatId,
  saveChat,
  clearAllChats,
  saveDraft,
  getDrafts,
  clearDraft,
  clearAllDrafts,
  NEW_CHAT_ID,
  deleteChat,
} from "@/lib/utils/chatStorage";
import ConstitutionalAIChat from "@/lib/components/chat/ConstitutionalAIChat";
import ReactMarkdown from "react-markdown";
import Modal from "@/lib/components/Modal";
import { FaBars } from "react-icons/fa";
import MobileMenu from "@/lib/components/chat/MobileMenu";

export default function PublicModelChatClient({ model }: { model: any }) {
  const [currentChatId, setCurrentChatId] = useState(() => createNewChatId());
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [chatKey, setChatKey] = useState(0);
  const [showConstitutionModal, setShowConstitutionModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setDrafts(getDrafts(model.uid));
  }, [model.uid]);

  const handleDraftChange = useCallback(
    (chatId: string, value: string) => {
      saveDraft(model.uid, chatId, value);
      setDrafts((prev) => ({
        ...prev,
        [chatId]: value,
      }));
    },
    [model.uid],
  );

  const handleChatSelect = useCallback(
    (chatId: string) => {
      const currentDraft = drafts[currentChatId];
      if (currentDraft?.trim()) {
        saveDraft(model.uid, currentChatId, currentDraft);
      }
      setCurrentChatId(chatId);
      setChatKey((prev) => prev + 1);
    },
    [currentChatId, drafts, model.uid],
  );

  const handleNewChat = useCallback(() => {
    const currentDraft = drafts[currentChatId];
    if (currentDraft?.trim()) {
      saveDraft(model.uid, currentChatId, currentDraft);
    }
    const newChatId = createNewChatId();
    setCurrentChatId(newChatId);
    setChatKey((prev) => prev + 1);
  }, [currentChatId, drafts, model.uid]);

  const handleClearAll = useCallback(() => {
    clearAllChats(model.uid);
    clearAllDrafts(model.uid);
    setDrafts({});
    setCurrentChatId(NEW_CHAT_ID);
    setChatKey((prev) => prev + 1);
  }, [model.uid]);

  const handleDeleteChat = useCallback(
    (chatId: string) => {
      if (chatId === currentChatId) {
        handleNewChat();
        setChatKey((prev) => prev + 1);
      }
      clearDraft(model.uid, chatId);
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[chatId];
        return next;
      });
      deleteChat(model.uid, chatId);
    },
    [currentChatId, handleNewChat, model.uid],
  );

  const latestConstitution = model.constitutions[0];

  // Create initial message with constitution details
  const initialMessage = {
    role: "assistant" as const,
    content: `Hi there! I'm an AI assistant guided by ${model.name} (Constitution v${latestConstitution.version}).

---
    
${model.bio}

---

How can I help you today?`,
    isInitialMessage: true,
  };

  return (
    <>
      <div className="flex flex-col w-full h-[calc(100dvh-4rem)] bg-gray-100">
        <ModelInfoBar
          model={model}
          onViewConstitution={() => setShowConstitutionModal(true)}
        />
        <div className="h-[calc(100%-theme(spacing.16))] p-1 md:p-4">
          <div className="flex w-full h-full 2xl:container 2xl:mx-auto gap-2 md:gap-4">
            {/* Chat History Sidebar - HIDDEN on mobile */}
            <div className="hidden md:flex w-80 flex-col bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="p-4 bg-gray-50">
                <h2 className="text-lg font-medium text-gray-900">
                  Chat History
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Saved locally to your browser
                </p>
              </div>
              <div className="flex-1 overflow-hidden">
                <ChatHistory
                  modelId={model.uid}
                  currentChatId={currentChatId}
                  newChatId={NEW_CHAT_ID}
                  onChatSelect={handleChatSelect}
                  onNewChat={handleNewChat}
                  onDeleteChat={handleDeleteChat}
                  onClearAll={handleClearAll}
                />
              </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col bg-white rounded-lg shadow-sm overflow-hidden relative">
              <div className="flex-1 overflow-hidden">
                <ConstitutionalAIChat
                  key={chatKey}
                  modelId={model.uid}
                  chatId={currentChatId}
                  draftInput={drafts[currentChatId] || ""}
                  onInputChange={handleDraftChange}
                  initialMessage={initialMessage}
                  constitution={{
                    text: latestConstitution.content,
                    icon: <ConstitutionIcon />,
                    color: "teal",
                  }}
                  customStyles={{
                    userMessage:
                      "bg-gray-50 rounded-lg p-4 mb-4 shadow-sm border-2 border-[rgba(0,0,0,0.06)]",
                    aiMessage:
                      "bg-teal/95 rounded-lg p-4 mb-4 shadow-sm text-white",
                    infoIcon:
                      "text-teal-600 hover:text-teal-700 transition-colors",
                  }}
                />
              </div>

              {/* Mobile Menu FAB - Only visible on mobile */}
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="md:hidden fixed bottom-20 right-3 w-10 h-10 rounded-full bg-teal-600 text-white shadow-lg flex items-center justify-center active:bg-teal-700 transition-colors z-40"
              >
                <FaBars className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Slide-out Menu */}
        <MobileMenu
          modelId={model.uid}
          isOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          currentChatId={currentChatId}
          onNewChat={handleNewChat}
          onChatSelect={handleChatSelect}
          onDeleteChat={handleDeleteChat}
          onClearAll={handleClearAll}
        />
      </div>

      {/* Constitution Modal */}
      <Modal
        isOpen={showConstitutionModal}
        onClose={() => setShowConstitutionModal(false)}
        fullHeight
      >
        <div className="h-full flex flex-col">
          {/* Header Section */}
          <div className="flex-shrink-0 border-b border-gray-100 p-6 bg-gray-50">
            <div className="flex items-start justify-between">
              <div className="space-y-4">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900">
                    {model.name}
                  </h2>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 font-medium">
                      Constitution v{model.constitutions[0].version}
                    </span>
                    {!model.published && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-yellow-50 text-yellow-700">
                        Preview Mode
                      </span>
                    )}
                  </div>
                </div>

                {/* Model Details Grid */}
                <dl className="grid grid-cols-2 gap-4 text-sm bg-white rounded-lg p-4 shadow-sm">
                  <div>
                    <dt className="text-gray-500">Created by</dt>
                    <dd className="text-gray-900 font-medium mt-1">
                      {model.owner.name}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Last updated</dt>
                    <dd className="text-gray-900 font-medium mt-1">
                      {new Date(model.updatedAt).toLocaleDateString()}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Status</dt>
                    <dd className="text-gray-900 font-medium mt-1">
                      {model.published ? "Published" : "Draft"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Constitution Version</dt>
                    <dd className="text-gray-900 font-medium mt-1">
                      {model.constitutions[0].version}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>

          {/* Main Content - Scrollable */}
          <div className="flex-1 overflow-y-auto p-6">
            <div>
              {/* About Section */}
              <section>
                <h3 className="text-lg font-medium text-gray-900 mb-3">
                  About
                </h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-1">
                      Bio
                    </h4>
                    <p className="text-gray-600">{model.bio}</p>
                  </div>
                  {model.goal && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-1">
                        Goal
                      </h4>
                      <p className="text-gray-600">{model.goal}</p>
                    </div>
                  )}
                </div>
              </section>

              {/* Constitution Section */}
              <section className="mt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-3">
                  Constitution
                </h3>
                <div className="bg-gray-50 rounded-lg p-4 prose max-w-none">
                  <ReactMarkdown>
                    {model.constitutions[0].content}
                  </ReactMarkdown>
                </div>
              </section>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
