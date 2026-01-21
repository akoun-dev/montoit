import { useEffect, useRef } from 'react';
import { Home, ArrowLeft, MoreVertical, Phone, Video, MessageCircle } from 'lucide-react';
import { Message, Conversation, Attachment } from '../services/messaging.service';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { SoundToggle } from './SoundToggle';

interface MessageThreadProps {
  conversation: Conversation;
  messages: Message[];
  currentUserId: string;
  loading: boolean;
  sending: boolean;
  onSend: (receiverId: string, content: string, attachment?: Attachment | null) => Promise<unknown>;
  onBack?: () => void;
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
}: MessageThreadProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

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
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
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

            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isOwn={message.sender_id === currentUserId}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <MessageInput onSend={handleSend} sending={sending} />
    </div>
  );
}
