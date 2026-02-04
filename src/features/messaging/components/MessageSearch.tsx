import { useState, useEffect, useRef } from 'react';
import { Search, X, ChevronDown, ChevronUp } from 'lucide-react';

interface MessageSearchProps {
  messages: any[];
  onSearch: (query: string) => void;
  resultCount: number;
}

export function MessageSearch({ messages, onSearch, resultCount }: MessageSearchProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredMessages = query
    ? messages.filter((msg) =>
        msg.content?.toLowerCase().includes(query.toLowerCase())
      )
    : messages;

  // Debounced search
  useEffect(() => {
    const timeout = setTimeout(() => {
      onSearch(query);
    }, 300);

    return () => clearTimeout(timeout);
  }, [query, onSearch]);

  const handleClear = () => {
    setQuery('');
    onSearch('');
    if (inputRef.current) inputRef.current.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div className="relative">
      {/* Search button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
          }
        }}
        className={`p-2 hover:bg-[#FAF7F4] rounded-lg transition-colors ${
          isOpen ? 'bg-[#FAF7F4]' : ''
        }`}
        title="Rechercher dans la conversation"
      >
        <Search className="h-4 w-4 text-[#6B5A4E]" />
      </button>

      {/* Search panel */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-lg border border-[#EFEBE9] overflow-hidden z-20 min-w-[300px]">
          {/* Input */}
          <div className="p-3 border-b border-[#EFEBE9]">
            <div className="relative flex items-center gap-2">
              <Search className="h-4 w-4 text-[#A69B95] absolute left-3" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onKeyDown={handleKeyDown}
                placeholder="Rechercher des messages..."
                className="w-full pl-9 pr-8 py-2 bg-[#FAF7F4] border border-[#EFEBE9] rounded-lg text-sm text-[#2C1810] placeholder-[#A69B95] focus:outline-none focus:ring-2 focus:ring-[#F16522]/20"
              autoFocus
              />
              {query && (
                <button
                  onClick={handleClear}
                  className="absolute right-2 text-[#A69B95] hover:text-[#6B5A4E] transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Results count */}
            {query && (
              <p className="text-xs text-[#A69B95] mt-2">
                {resultCount} message{resultCount !== 1 ? 's' : ''} trouvé{resultCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          {/* Results preview */}
          {query && filteredMessages.length > 0 && (
            <div className="max-h-60 overflow-y-auto">
              {filteredMessages.slice(0, 5).map((msg) => (
                <div
                  key={msg.id}
                  className="px-3 py-2 hover:bg-[#FAF7F4] cursor-pointer border-b border-[#EFEBE9] last:border-0 text-xs"
                  onClick={() => {
                    // Scroll to message
                    document.getElementById(`message-${msg.id}`)?.scrollIntoView({
                      behavior: 'smooth',
                      block: 'center',
                    });
                    setIsOpen(false);
                  }}
                >
                  <p className="text-[#2C1810] line-clamp-2">
                    {msg.content}
                  </p>
                  <p className="text-[10px text-[#A69B95] mt-1">
                    {new Date(msg.created_at).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              ))}
              {filteredMessages.length > 5 && (
                <div className="px-3 py-2 text-xs text-[#F16522] text-center font-medium border-t border-[#EFEBE9]">
                  {filteredMessages.length - 5} autres résultats...
                </div>
              )}
            </div>
          )}

          {query && filteredMessages.length === 0 && (
            <div className="px-3 py-6 text-center">
              <p className="text-sm text-[#A69B95]">Aucun résultat trouvé</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
