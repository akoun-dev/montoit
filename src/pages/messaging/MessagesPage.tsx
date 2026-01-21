import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { useConversations } from '../../hooks/messaging/useConversations';
import { useMessages } from '../../hooks/messaging/useMessages';
import { ConversationList } from '../../features/messaging/components/ConversationList';
import { MessageThread } from '../../features/messaging/components/MessageThread';
import { EmptyConversation } from '../../features/messaging/components/EmptyConversation';
import { Conversation } from '../../features/messaging/services/messaging.service';

export default function MessagesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  const {
    conversations,
    loading: loadingConversations,
    getOrCreateConversation,
  } = useConversations();

  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [showMobileThread, setShowMobileThread] = useState(false);

  const {
    messages,
    loading: loadingMessages,
    sending,
    sendMessage,
  } = useMessages(selectedConversation?.id ?? null);

  // Handle URL parameters for creating new conversation
  useEffect(() => {
    const toUserId = searchParams.get('to');
    const propertyId = searchParams.get('property');
    const subject = searchParams.get('subject');

    if (toUserId && user?.id) {
      getOrCreateConversation(toUserId, propertyId, subject).then((conv) => {
        if (conv) {
          setSelectedConversation(conv);
          setShowMobileThread(true);
          setSearchParams({});
        }
      });
    }
  }, [searchParams, user?.id, getOrCreateConversation, setSearchParams]);

  // Update selected conversation when conversations list updates
  useEffect(() => {
    if (selectedConversation && conversations.length > 0) {
      const updated = conversations.find((c) => c.id === selectedConversation.id);
      if (updated) {
        setSelectedConversation(updated);
      }
    }
  }, [conversations, selectedConversation]);

  const handleSelectConversation = (conv: Conversation) => {
    setSelectedConversation(conv);
    setShowMobileThread(true);
  };

  const handleBack = () => {
    setShowMobileThread(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#FAF7F4] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F16522]"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#FAF7F4] flex items-center justify-center">
        <p className="text-[#6B5A4E]">Veuillez vous connecter pour accéder aux messages.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F4] pt-20 pb-4 px-4 flex gap-6">
      {/* --- SIDEBAR : LISTE DES CONVERSATIONS --- */}
      <div
        className={`w-full md:w-80 lg:w-96 bg-white rounded-[24px] border border-[#EFEBE9] shadow-sm flex flex-col overflow-hidden ${
          showMobileThread ? 'hidden md:flex' : 'flex'
        }`}
      >
        <ConversationList
          conversations={conversations}
          selectedId={selectedConversation?.id ?? null}
          onSelect={handleSelectConversation}
          loading={loadingConversations}
        />
      </div>

      {/* --- ZONE PRINCIPALE : CHAT --- */}
      <div
        className={`flex-1 bg-white rounded-[24px] border border-[#EFEBE9] shadow-sm flex flex-col overflow-hidden relative ${
          !showMobileThread ? 'hidden md:flex' : 'flex'
        }`}
      >
        {/* Texture de fond subtile */}
        <div className="absolute inset-0 opacity-[0.02] bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] pointer-events-none" />

        {selectedConversation ? (
          <MessageThread
            conversation={selectedConversation}
            messages={messages}
            currentUserId={user.id}
            loading={loadingMessages}
            sending={sending}
            onSend={sendMessage}
            onBack={handleBack}
          />
        ) : (
          <EmptyConversation />
        )}
      </div>
    </div>
  );
}
