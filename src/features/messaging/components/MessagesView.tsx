import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { useConversations } from '@/hooks/messaging';
import { useMessages } from '@/hooks/messaging';
import { ConversationList } from './ConversationList';
import { MessageThread } from './MessageThread';
import { EmptyConversation } from './EmptyConversation';
import { Conversation } from '../services/messaging.service';
import { messagingService } from '../services/messaging.service';

/**
 * Layout-agnostic messaging view component
 * Can be wrapped by any actor-specific layout (Tenant, Owner, Agency)
 */
export function MessagesView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, loading: authLoading, profile } = useAuth();

  const {
    conversations,
    loading: loadingConversations,
    getOrCreateConversation,
    refetch: refetchConversations,
  } = useConversations();

  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [showMobileThread, setShowMobileThread] = useState(false);

  const {
    messages,
    loading: loadingMessages,
    sending,
    sendMessage,
    hasMore,
    loadMore,
    isError: messagesError,
    editMessage,
    deleteMessage,
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

  // Refresh conversations list when messages change (to update preview/order)
  useEffect(() => {
    if (selectedConversation) {
      refetchConversations();
    }
  }, [messages, selectedConversation, refetchConversations]);

  const handleSendMessage = useCallback(
    async (receiverId: string, content: string, attachment?: any) => {
      const result = await sendMessage(receiverId, content, attachment);
      if (result) {
        refetchConversations();
      }
      return result;
    },
    [sendMessage, refetchConversations]
  );

  const handleBack = () => {
    setShowMobileThread(false);
  };

  // Handle scroll to bottom for loading more messages
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const isNearTop = target.scrollTop < 100;
    if (isNearTop && hasMore && !loadingMessages) {
      loadMore();
    }
  }, [hasMore, loadingMessages, loadMore]);

  const handleEditMessage = useCallback(async (messageId: string, newContent: string) => {
    if (!user?.id) return;
    await editMessage(messageId, newContent);
    refetchConversations(); // Refresh to update preview
  }, [user?.id, editMessage, refetchConversations]);

  const handleDeleteMessage = useCallback(async (messageId: string) => {
    if (!user?.id) return;
    await deleteMessage(messageId);
    refetchConversations(); // Refresh to update preview
  }, [user?.id, deleteMessage, refetchConversations]);

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
    <div className="min-h-[75vh] bg-[#FAF7F4] px-2 sm:px-4 pb-4 pt-6 lg:pt-2 flex gap-4 lg:gap-6">
      {/* Conversations List */}
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

      {/* Message Thread */}
      <div
        className={`flex-1 bg-white rounded-[24px] border border-[#EFEBE9] shadow-sm flex flex-col overflow-hidden relative ${
          !showMobileThread ? 'hidden md:flex' : 'flex'
        }`}
        onScroll={handleScroll}
      >
        <div className="absolute inset-0 opacity-[0.02] bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] pointer-events-none" />

        {selectedConversation ? (
          <MessageThread
            conversation={selectedConversation}
            messages={messages}
            currentUserId={user.id}
            loading={loadingMessages}
            sending={sending}
            onSend={handleSendMessage}
            onBack={handleBack}
            hasMore={hasMore}
            onLoadMore={loadMore}
            isError={messagesError}
            onEditMessage={handleEditMessage}
            onDeleteMessage={handleDeleteMessage}
          />
        ) : (
          <EmptyConversation />
        )}
      </div>
    </div>
  );
}

// Default export for lazy loading
export default MessagesView;
