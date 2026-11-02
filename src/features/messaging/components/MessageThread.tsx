import { useEffect, useRef, useState } from 'react';
import { Home, ArrowLeft, MoreVertical, Phone, Video, MessageCircle, AlertCircle, ChevronUp, MoreHorizontal, Search } from 'lucide-react';
import { Message, Conversation, Attachment } from '../services/messaging.service';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { SoundToggle } from './SoundToggle';
import { typingIndicatorService } from '../services/typingIndicator.service';
import { MessageSearch } from './MessageSearch';

interface MessageThreadProps {
  conversation: Conversation;
  messages: Message[];
  currentUserId: string;
  loading: boolean;
  sending: boolean;
  onSend: (receiverId: string, content: string, attachment?: Attachment | null) => Promise<unknown>;
  onBack?: () => void;
  hasMore?: boolean;
  onLoadMore?: () => void;
  isError?: boolean;
  onEditMessage?: (messageId: string, newContent: string) => Promise<void>;
  onDeleteMessage?: (messageId: string) => Promise<void>;
}

function getDefaultAvatar(name: string | null) {
  const letter = (name?.trim()?.[0] || 'U').toUpperCase();
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='128' height='128'>
    <rect width='100%' height='100%' rx='64' fill='%23F16522'/>
    <text x='50%' y='55%' text-anchor='middle' dominant-baseline='middle' font-family='Inter, Arial, sans-serif' font-size='56' fill='white'>${letter}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function MessageThread({
  conversation,
  messages,
  currentUserId,
  loading,
  sending,
  onSend,
  onBack,
  hasMore = false,
  onLoadMore,
  isError = false,
}: MessageThreadProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredMessages, setFilteredMessages] = useState<Message[]>([]);
  const [isSearchActive, setIsSearchActive] = useState(false);

  const handleEditMessage = async (messageId: string, newContent: string) => {
    if (onEditMessage) {
      await onEditMessage(messageId, newContent);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (onDeleteMessage) {
      await onDeleteMessage(messageId);
    }
  };

  // Search handler
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setIsSearchActive(query.length > 0);

    if (query) {
      const filtered = messages.filter((msg) =>
        msg.content?.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredMessages(filtered);
    } else {
      setFilteredMessages([]);
    }
  };

  // Messages to display (filtered or all)
  const displayMessages = isSearchActive ? filteredMessages : messages;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowScrollToBottom(false);
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const { scrollTop, scrollHeight, clientHeight } = target;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 200;
    setShowScrollToBottom(!isNearBottom);
  };

  // Subscribe to typing indicators
  useEffect(() => {
    typingIndicatorService.subscribeToTyping(conversation.id, {
      onTypingStart: (userId) => {
        setTypingUsers(prev => new Set(prev).add(userId));
      },
      onTypingStop: (userId) => {
        setTypingUsers(prev => {
          const next = new Set(prev);
          next.delete(userId);
          return next;
        });
      },
    });

    return () => {
      typingIndicatorService.unsubscribe(conversation.id);
    };
  }, [conversation.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const otherParticipantId =
    conversation.participant1_id === currentUserId
      ? conversation.participant2_id
      : conversation.participant1_id;

  const handleSend = async (content: string, attachment?: Attachment | null) => {
    if (!otherParticipantId) return;
    await onSend(otherParticipantId, content, attachment);
  };

  const participantName = conversation.other_participant?.full_name ?? 'Utilisateur';

  const handleVideoCall = () => {
    console.log('Initiate video call with', otherParticipantId);
    // TODO: intégrer avec un service de visioconférence (ex: Daily.co, Twilio)
    alert("Fonctionnalité d'appel vidéo à implémenter");
  };

  const handleVoiceCall = () => {
    console.log('Initiate voice call with', otherParticipantId);
    // TODO: intégrer avec un service de téléphonie VoIP
    alert("Fonctionnalité d'appel vocal à implémenter");
  };

  const handleMoreActions = () => {
    console.log('More actions menu');
    // TODO: ouvrir un menu déroulant avec options supplémentaires
  };

  const formatPhoneNumberForWhatsApp = (phone: string | null | undefined): string => {
    if (!phone) return '';

    // Remove all non-numeric characters
    let cleaned = phone.replace(/\D/g, '');

    // If number starts with 0 (local format), replace with country code for Côte d'Ivoire
    if (cleaned.startsWith('0')) {
      cleaned = '225' + cleaned.substring(1);
    }

    // If number doesn't have country code, add Côte d'Ivoire code
    if (!cleaned.startsWith('225') && cleaned.length === 10) {
      cleaned = '225' + cleaned;
    }

    return cleaned;
  };

  const handleWhatsAppReply = () => {
    const phone = conversation.other_participant?.phone;
    if (!phone) {
      alert('Ce contact n\'a pas de numéro de téléphone enregistré.');
      return;
    }

    const formattedPhone = formatPhoneNumberForWhatsApp(phone);
    const whatsappUrl = `https://wa.me/${formattedPhone}`;
    window.open(whatsappUrl, '_blank');
  };

  const hasWhatsApp = conversation.other_participant?.phone &&
    formatPhoneNumberForWhatsApp(conversation.other_participant.phone).length >= 10;

  return (
    <div className="flex flex-col h-full bg-[#FAF7F4]/50 relative z-10">
      {/* Header Premium */}
      <div className="px-6 py-4 bg-white/80 backdrop-blur-md border-b border-[#EFEBE9] flex items-center gap-4 sticky top-0 z-20">
        {onBack && (
          <button
            onClick={onBack}
            className="p-2 hover:bg-[#FAF7F4] rounded-full transition-colors md:hidden"
          >
            <ArrowLeft className="h-5 w-5 text-[#6B5A4E]" />
          </button>
        )}

        <img
          src={conversation.other_participant?.avatar_url ?? getDefaultAvatar(participantName)}
          alt={participantName}
          className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
        />

        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-[#2C1810] truncate">{participantName}</h3>
          <span className="text-xs text-[#F16522] font-medium bg-[#F16522]/10 px-2 py-0.5 rounded-full inline-block">
            Contact
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          <MessageSearch
            messages={messages}
            onSearch={handleSearch}
            resultCount={filteredMessages.length}
          />
          <SoundToggle />
          {hasWhatsApp && (
            <button
              onClick={handleWhatsAppReply}
              className="p-2.5 hover:bg-[#25D366]/10 rounded-full text-[#25D366] transition-colors"
              title="Répondre via WhatsApp"
            >
              <MessageCircle className="h-5 w-5" />
            </button>
          )}
          <button
            onClick={handleVideoCall}
            className="p-2.5 hover:bg-[#FAF7F4] rounded-full text-[#6B5A4E] transition-colors"
            title="Appel vidéo"
          >
            <Video className="h-5 w-5" />
          </button>
          <button
            onClick={handleVoiceCall}
            className="p-2.5 hover:bg-[#FAF7F4] rounded-full text-[#6B5A4E] transition-colors"
            title="Appel vocal"
          >
            <Phone className="h-5 w-5" />
          </button>
          <button
            onClick={handleMoreActions}
            className="p-2.5 hover:bg-[#FAF7F4] rounded-full text-[#6B5A4E] transition-colors"
            title="Plus d'actions"
          >
            <MoreVertical className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4" onScroll={handleScroll}>
        {/* Error State */}
        {isError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-900">Erreur de chargement</p>
              <p className="text-xs text-red-700">Impossible de charger les messages. Réessayez...</p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="text-xs font-medium text-red-700 hover:text-red-900 underline"
            >
              Réessayer
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#F16522] border-t-transparent" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4">
              <Home className="h-8 w-8 text-[#F16522]" />
            </div>
            <p className="text-[#6B5A4E] font-medium">Aucun message</p>
            <p className="text-[#A69B95] text-sm mt-1">Commencez la conversation !</p>
          </div>
        ) : (
          <>
            {/* Load More Button (at top) */}
            {hasMore && onLoadMore && (
              <div className="flex justify-center mb-4">
                <button
                  onClick={onLoadMore}
                  disabled={loading}
                  className="px-4 py-2 bg-white border border-[#EFEBE9] rounded-full text-sm font-medium text-[#6B5A4E] hover:bg-[#FAF7F4] transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#F16522] border-t-transparent" />
                      Chargement...
                    </>
                  ) : (
                    <>
                      <ChevronUp className="h-4 w-4" />
                      Charger plus de messages
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Subject banner */}
            {conversation.subject && (
              <div className="bg-[#F16522]/10 rounded-xl p-3 text-center mx-auto max-w-md mb-4">
                <p className="text-xs text-[#2C1810] font-medium">{conversation.subject}</p>
              </div>
            )}

            {/* Property context banner */}
            {conversation.property && (
              <div className="bg-white rounded-xl p-4 mx-auto max-w-md mb-4 flex items-center gap-3 border border-[#EFEBE9] shadow-sm">
                <div className="w-12 h-12 bg-[#F16522]/10 rounded-lg flex items-center justify-center">
                  <Home className="h-6 w-6 text-[#F16522]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#2C1810] truncate">
                    {conversation.property.title}
                  </p>
                  <p className="text-xs text-[#6B5A4E]">Bien immobilier</p>
                </div>
              </div>
            )}

            {displayMessages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isOwn={message.sender_id === currentUserId}
                onEdit={handleEditMessage}
                onDelete={handleDeleteMessage}
                currentUserId={currentUserId}
              />
            ))}

            {isSearchActive && displayMessages.length === 0 && (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-[#FAF7F4] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="h-8 w-8 text-[#A69B95]" />
                </div>
                <p className="text-[#6B5A4E] font-medium">Aucun résultat</p>
                <p className="text-sm text-[#A69B95] mt-1">
                  Essayez d'autres mots-clés
                </p>
              </div>
            )}

            {isSearchActive && displayMessages.length > 0 && (
              <div className="text-center py-4">
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setIsSearchActive(false);
                    setFilteredMessages([]);
                  }}
                  className="text-sm text-[#F16522] font-medium hover:underline"
                >
                  Afficher tous les messages
                </button>
              </div>
            )}

            {/* Typing indicator */}
            {typingUsers.size > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 bg-[#FAF7F4] rounded-full mx-auto max-w-fit">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-[#F16522] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-[#F16522] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-[#F16522] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-xs text-[#6B5A4E] font-medium">
                  {typingUsers.size === 1
                    ? `${conversation.other_participant?.full_name || 'Quelqu\'un'} est en train d'écrire...`
                    : `${typingUsers.size} personnes sont en train d'écrire...`}
                  </span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Scroll to Bottom Button */}
      {showScrollToBottom && messages.length > 0 && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-24 right-6 p-3 bg-[#F16522] text-white rounded-full shadow-lg hover:bg-[#d9571d] transition-colors"
          title="Descendre en bas"
        >
          <ChevronUp className="h-5 w-5 rotate-180" />
        </button>
      )}

      {/* Input */}
      <MessageInput onSend={handleSend} sending={sending} conversationId={conversation.id} />
    </div>
  );
}
