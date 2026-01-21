import { Search, MessageSquare } from 'lucide-react';
import { useState } from 'react';
import { Conversation } from '../services/messaging.service';
import { ConversationItem } from './ConversationItem';

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (conversation: Conversation) => void;
  loading: boolean;
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  loading,
}: ConversationListProps) {
  const [search, setSearch] = useState('');

  const filteredConversations = conversations.filter((conv) => {
    if (!search.trim()) return true;
    const searchLower = search.toLowerCase();
    return (
      conv.other_participant?.full_name?.toLowerCase().includes(searchLower) ??
      conv.property?.title?.toLowerCase().includes(searchLower) ??
      conv.subject?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header Premium Ivorian */}
      <div className="p-6 border-b border-[#EFEBE9]">
        <h1 className="text-2xl font-bold text-[#2C1810] mb-4">Messages</h1>
        <div className="relative">
          <Search className="absolute left-4 top-3.5 w-4 h-4 text-[#A69B95]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une conversation..."
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#FAF7F4] border-transparent focus:bg-white focus:border-[#F16522] focus:ring-2 focus:ring-[#F16522]/10 transition-all text-sm font-medium text-[#2C1810] placeholder:text-[#A69B95] outline-none"
          />
        </div>
      </div>

      {/* Liste */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse p-4">
                <div className="w-12 h-12 bg-[#EFEBE9] rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-[#EFEBE9] rounded w-3/4" />
                  <div className="h-3 bg-[#EFEBE9] rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-[#FAF7F4] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="h-8 w-8 text-[#A69B95]" />
            </div>
            <p className="text-[#6B5A4E] font-medium">
              {search ? 'Aucune conversation trouvée' : 'Aucune conversation'}
            </p>
            <p className="text-[#A69B95] text-sm mt-1">
              Démarrez une conversation depuis une annonce
            </p>
          </div>
        ) : (
          filteredConversations.map((conv) => (
            <ConversationItem
              key={conv.id}
              conversation={conv}
              isSelected={selectedId === conv.id}
              onClick={() => onSelect(conv)}
            />
          ))
        )}
      </div>
    </div>
  );
}
