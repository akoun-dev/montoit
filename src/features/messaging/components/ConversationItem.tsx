import { format, isToday, isYesterday } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Home, CheckCheck } from 'lucide-react';
import { Conversation } from '../services/messaging.service';

interface ConversationItemProps {
  conversation: Conversation;
  isSelected: boolean;
  onClick: () => void;
}

function getDefaultAvatar(name: string | null) {
  const letter = (name?.trim()?.[0] || 'U').toUpperCase();
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='128' height='128'>
    <rect width='100%' height='100%' rx='64' fill='%23F16522'/>
    <text x='50%' y='55%' text-anchor='middle' dominant-baseline='middle' font-family='Inter, Arial, sans-serif' font-size='56' fill='white'>${letter}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function formatMessageTime(dateString: string | null): string {
  if (!dateString) return '';
  const date = new Date(dateString);

  if (isToday(date)) {
    return format(date, 'HH:mm');
  }
  if (isYesterday(date)) {
    return 'Hier';
  }
  return format(date, 'dd/MM/yyyy', { locale: fr });
}

export function ConversationItem({ conversation, isSelected, onClick }: ConversationItemProps) {
  const { other_participant, property, last_message_preview, last_message_at, unread_count } =
    conversation;
  const participantName = other_participant?.full_name ?? 'Utilisateur';
  const hasUnread = (unread_count ?? 0) > 0;

  return (
    <button
      onClick={onClick}
      className={`w-full px-3 py-3 text-left transition-colors rounded-xl ${
        isSelected ? 'bg-[#F16522]/10 border border-[#F16522]/30 shadow-sm' : 'hover:bg-[#FAF7F4]'
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <img
          src={other_participant?.avatar_url ?? getDefaultAvatar(participantName)}
          alt={participantName}
          className="w-12 h-12 rounded-full object-cover flex-shrink-0"
        />

        {/* Content */}
        <div className="flex-1 min-w-0 border-b border-[#EFEBE9] pb-3">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-semibold text-[#2C1810] truncate">{participantName}</h4>
            <span
              className={`text-xs flex-shrink-0 ${hasUnread ? 'text-[#F16522]' : 'text-[#A69B95]'}`}
            >
              {formatMessageTime(last_message_at)}
            </span>
          </div>

          {/* Property context */}
          {property && (
            <div className="flex items-center gap-1 text-xs text-[#F16522] mt-0.5">
              <Home className="h-3 w-3" />
              <span className="truncate">{property.title}</span>
            </div>
          )}

          {/* Last message preview */}
          <div className="flex items-center justify-between gap-2 mt-1">
            <div className="flex items-center gap-1 flex-1 min-w-0">
              {/* Checkmarks for sent messages */}
              <CheckCheck className="h-4 w-4 text-[#F16522] flex-shrink-0" />
              <p className={`text-sm truncate ${hasUnread ? 'text-[#2C1810]' : 'text-[#6B5A4E]'}`}>
                {last_message_preview ?? 'Aucun message'}
              </p>
            </div>

            {/* Unread badge - WhatsApp green */}
            {hasUnread && (
              <span className="flex-shrink-0 bg-[#F16522] text-white text-xs font-medium rounded-full h-5 min-w-[20px] px-1.5 flex items-center justify-center">
                {unread_count}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
