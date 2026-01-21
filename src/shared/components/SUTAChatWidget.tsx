import { useState, useRef, useEffect } from 'react';
import { Send, X, Paperclip, Loader2 } from 'lucide-react';
import sutaAvatar from '@/assets/suta-avatar.jpg';
import { Link } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import {
  getOrCreateConversation,
  getConversationMessages,
  sendMessage,
  getAIResponse,
} from '@/services/chatbotService';
import type { ChatMessage } from '@/types/monToit.types';

// --- TYPES ---

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

interface SUTAChatWidgetProps {
  mode?: 'floating' | 'embedded';
  position?: 'bottom-right' | 'bottom-left';
  className?: string;
}

// --- CONSTANTES ---

const INITIAL_MESSAGE: Message = {
  id: 'init-1',
  text: 'Bonjour ! Je suis SUTA, votre assistant immobilier personnel. Je peux vous aider à trouver un bien, estimer un loyer ou contacter une agence. Que souhaitez-vous faire ?',
  sender: 'ai',
  timestamp: new Date(),
};

const QUICK_ACTIONS = [
  '🏠 Trouver un logement',
  '💰 Estimer mon budget',
  '📞 Parler à un agent',
  '📄 Dossier locataire',
];

const BUBBLE_MESSAGES = [
  "Besoin d'aide ? 👋",
  'Une question ?',
  'Je suis SUTA !',
  'Trouvez votre logement',
  'Parlons immobilier 🏠',
];

// --- COMPOSANT ---

export default function SUTAChatWidget({
  mode = 'floating',
  position = 'bottom-right',
  className = '',
}: SUTAChatWidgetProps) {
  const { user } = useAuth();

  // États
  const [isOpen, setIsOpen] = useState(mode === 'embedded');
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [bubbleMessage, setBubbleMessage] = useState<string | null>(null);
  const [showBubble, setShowBubble] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Mode embedded = toujours ouvert
  useEffect(() => {
    if (mode === 'embedded') setIsOpen(true);
  }, [mode]);

  // Animation bulle de dialogue périodique
  useEffect(() => {
    if (isOpen || mode === 'embedded') {
      setShowBubble(false);
      return;
    }

    let messageIndex = 0;

    // Afficher la première bulle après 3 secondes
    const initialTimeout = setTimeout(() => {
      setBubbleMessage(BUBBLE_MESSAGES[0] ?? null);
      setShowBubble(true);

      // Cacher après 4 secondes
      setTimeout(() => setShowBubble(false), 4000);
    }, 3000);

    // Puis afficher une bulle toutes les 15 secondes
    const interval = setInterval(() => {
      messageIndex = (messageIndex + 1) % BUBBLE_MESSAGES.length;
      setBubbleMessage(BUBBLE_MESSAGES[messageIndex] ?? null);
      setShowBubble(true);

      setTimeout(() => setShowBubble(false), 4000);
    }, 15000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [isOpen, mode]);

  // Charger la conversation et l'historique pour les utilisateurs connectés
  useEffect(() => {
    const loadConversation = async () => {
      if (!user?.id) {
        setIsLoadingHistory(false);
        return;
      }

      setIsLoadingHistory(true);
      try {
        const conversation = await getOrCreateConversation(user.id);
        if (conversation) {
          setConversationId(conversation.id);

          const existingMessages = await getConversationMessages(conversation.id);
          if (existingMessages.length > 0) {
            setMessages(
              existingMessages.map((msg) => ({
                id: msg.id,
                text: msg.content,
                sender: msg.role === 'assistant' ? 'ai' : 'user',
                timestamp: msg.timestamp,
              }))
            );
          }
        }
      } catch (error) {
        console.error('Erreur chargement conversation:', error);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    if (isOpen && user?.id) {
      loadConversation();
    }
  }, [user?.id, isOpen]);

  // --- LOGIQUE IA ---

  const handleSendMessage = async (textOverride?: string) => {
    const textToSend = textOverride || inputValue;
    if (!textToSend.trim() || isTyping) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      text: textToSend,
      sender: 'user',
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    // Persister le message utilisateur
    if (conversationId) {
      await sendMessage(conversationId, textToSend, 'user');
    }

    try {
      const conversationHistory: ChatMessage[] = messages.map((msg) => ({
        id: msg.id,
        conversationId: conversationId || 'widget',
        role: msg.sender === 'ai' ? 'assistant' : 'user',
        content: msg.text,
        timestamp: msg.timestamp,
        metadata: {},
        isRead: true,
      }));

      const response = await getAIResponse({
        userMessage: textToSend,
        conversationHistory,
        userId: user?.id || 'anonymous',
      });

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: response,
        sender: 'ai',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);

      // Persister la réponse IA
      if (conversationId) {
        await sendMessage(conversationId, response, 'assistant');
      }
    } catch (error) {
      let errorText = '❌ Problème technique. Veuillez réessayer.';
      if (error instanceof Error) {
        if (error.message.includes('429')) {
          errorText = '⏳ Trop de demandes, réessayez dans quelques secondes.';
        } else if (error.message.includes('402')) {
          errorText = '💳 Crédit épuisé. Veuillez contacter notre équipe.';
        }
      }

      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: errorText,
        sender: 'ai',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // --- RENDER ---

  const floatingClasses =
    mode === 'floating'
      ? `fixed z-50 ${position === 'bottom-right' ? 'bottom-6 right-6' : 'bottom-6 left-6'}`
      : 'relative w-full h-full';

  if (mode === 'floating' && !isOpen) {
    return (
      <div
        className={`fixed z-50 ${position === 'bottom-right' ? 'bottom-6 right-6' : 'bottom-6 left-6'}`}
      >
        {/* Bulle de dialogue animée */}
        {showBubble && bubbleMessage && (
          <div className="absolute bottom-full right-0 mb-3 animate-fade-in">
            <div className="bg-background rounded-2xl rounded-br-sm shadow-lg px-4 py-2.5 border border-border whitespace-nowrap">
              <span className="text-sm font-medium text-foreground">{bubbleMessage}</span>
            </div>
            {/* Petite flèche pointant vers le bas */}
            <div className="absolute -bottom-1.5 right-5 w-3 h-3 bg-background border-r border-b border-border transform rotate-45"></div>
          </div>
        )}

        {/* Avatar SUTA */}
        <button
          onClick={() => setIsOpen(true)}
          className="w-16 h-16 rounded-full shadow-2xl transition-all hover:scale-110 active:scale-95 overflow-hidden border-2 border-primary relative"
          aria-label="Ouvrir le chat SUTA"
        >
          <img src={sutaAvatar} alt="SUTA Assistant" className="w-full h-full object-cover" />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full border-2 border-background animate-pulse"></span>
        </button>
      </div>
    );
  }

  return (
    <div className={`${floatingClasses} ${className} flex flex-col font-sans`}>
      <div
        className={`flex flex-col bg-background overflow-hidden shadow-2xl ${mode === 'floating' ? 'w-[380px] h-[600px] max-h-[80vh] rounded-3xl' : 'w-full h-full rounded-3xl border border-border'}`}
      >
        {/* HEADER */}
        <div className="p-4 flex items-center justify-between text-white relative overflow-hidden shrink-0 bg-[#2C1810]">
          <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>

          <div className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/30 shadow-lg">
              <img src={sutaAvatar} alt="SUTA Assistant" className="w-full h-full object-cover" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Assistant SUTA</h3>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span className="text-xs text-white/80">En ligne</span>
              </div>
            </div>
          </div>

          {mode === 'floating' && (
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-white/10 rounded-full transition-colors relative z-10"
              aria-label="Fermer le chat"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* MESSAGES AREA */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#FAF7F4] relative">
          {/* Loading History */}
          {isLoadingHistory ? (
            <div className="flex flex-col items-center justify-center h-full gap-2">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
              <span className="text-xs text-muted-foreground">Chargement de l'historique...</span>
            </div>
          ) : (
            <>
              {/* Indication connexion */}
              {!user && (
                <div className="text-center py-2 px-3 bg-amber-50 border border-amber-200 rounded-lg mb-2">
                  <p className="text-xs text-amber-700">
                    <Link to="/connexion" className="underline font-medium hover:text-amber-900">
                      Connectez-vous
                    </Link>{' '}
                    pour sauvegarder vos conversations
                  </p>
                </div>
              )}

              {/* Date separator */}
              <div className="flex justify-center my-2">
                <span className="text-[10px] text-muted-foreground bg-white/50 px-2 py-1 rounded-full">
                  Aujourd'hui
                </span>
              </div>

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-3.5 shadow-sm text-sm leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-primary text-primary-foreground rounded-tr-sm'
                        : 'bg-background text-foreground border border-border rounded-tl-sm'
                    }`}
                  >
                    {msg.text}
                    <p className="text-right mt-1 text-[10px] opacity-60">
                      {msg.timestamp.toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {msg.sender === 'user' && <span className="ml-1 text-sky-400">✓✓</span>}
                    </p>
                  </div>
                </div>
              ))}

              {/* Typing Indicator */}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-background border border-border rounded-2xl rounded-tl-sm p-3 shadow-sm flex gap-1 items-center">
                    <span
                      className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce"
                      style={{ animationDelay: '0ms' }}
                    ></span>
                    <span
                      className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce"
                      style={{ animationDelay: '150ms' }}
                    ></span>
                    <span
                      className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce"
                      style={{ animationDelay: '300ms' }}
                    ></span>
                  </div>
                </div>
              )}
            </>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* QUICK ACTIONS */}
        <div className="bg-[#FAF7F4] px-4 pb-2 flex gap-2 overflow-x-auto no-scrollbar shrink-0">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action}
              onClick={() => handleSendMessage(action)}
              disabled={isTyping || isLoadingHistory}
              className="whitespace-nowrap px-3 py-1.5 bg-background border border-border rounded-full text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary transition-colors shadow-sm flex-shrink-0 disabled:opacity-50"
            >
              {action}
            </button>
          ))}
        </div>

        {/* INPUT AREA */}
        <div className="p-3 bg-background border-t border-border shrink-0">
          <div className="flex items-center gap-2 bg-muted p-2 rounded-2xl border border-border focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 transition-all">
            <button
              className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-background"
              aria-label="Ajouter une pièce jointe"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Écrivez votre message..."
              disabled={isTyping || isLoadingHistory}
              className="flex-1 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground disabled:opacity-50"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputValue.trim() || isTyping || isLoadingHistory}
              className={`p-2 rounded-full transition-all ${
                inputValue.trim() && !isTyping && !isLoadingHistory
                  ? 'bg-primary text-primary-foreground hover:opacity-90 shadow-md'
                  : 'bg-muted-foreground/30 text-muted-foreground cursor-not-allowed'
              }`}
              aria-label="Envoyer le message"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <div className="text-center mt-2">
            <p className="text-[9px] text-muted-foreground uppercase tracking-widest flex items-center justify-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
              Powered by Mon Toit AI
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
