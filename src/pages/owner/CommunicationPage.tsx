import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mail,
  MessageSquare,
  Clock,
  Check,
  Bell,
  Search,
  Filter,
  Send,
  FileText,
  Home,
  Users,
  Calendar,
  File,
  Image as ImageIcon,
  X,
  ChevronDown,
  ChevronRight,
  Star,
  Phone,
  Video,
  MoreHorizontal,
  Plus,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  Info,
  FolderOpen,
  RefreshCw,
  Sparkles,
  CreditCard,
  Wrench,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/app/providers/AuthProvider';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import OwnerDashboardLayout from '../../features/owner/components/OwnerDashboardLayout';

interface Conversation {
  id: string;
  participant1_id: string;
  participant2_id: string;
  property_id: string | null;
  subject: string | null;
  updated_at: string;
  messages: any[];
  other_participant?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    phone: string | null;
  };
  property?: {
    id: string;
    title: string;
    city: string | null;
  };
  last_message?: {
    content: string;
    created_at: string;
    sender_id: string;
  };
  unread_count?: number;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
  read_at: string | null;
  attachment_url: string | null;
  attachment_type: 'image' | 'document' | 'other' | null;
}

interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  action_url: string | null;
  is_read: boolean;
  created_at: string;
  data: Record<string, unknown> | null;
}

interface EmailTemplate {
  id: string;
  name: string;
  slug: string;
  subject: string;
  body_html: string;
  body_text: string;
  variables: string[];
  category: 'welcome' | 'rent_reminder' | 'visit_confirmed' | 'renewal' | 'rent_increase' | 'custom';
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface Tenant {
  id: string;
  full_name: string;
  avatar_url: string | null;
  phone: string | null;
  email: string | null;
  trust_score: number | null;
  is_verified: boolean;
}

interface Property {
  id: string;
  title: string;
  city: string | null;
  monthly_rent: number | null;
  status: string;
}

const COLORS = {
  chocolat: '#2C1810',
  sable: '#E8D4C5',
  orange: '#F16522',
  creme: '#FAF7F4',
  grisTexte: '#6B5A4E',
  border: '#EFEBE9',
};

type CommTab = 'messages' | 'templates' | 'notifications';

export default function CommunicationPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<CommTab>('messages');

  // Messages state
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [propertyFilter, setPropertyFilter] = useState<string>('all');

  // Templates state
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [editingTemplate, setEditingTemplate] = useState(false);

  // Notifications state
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationFilter, setNotificationFilter] = useState<'all' | 'unread' | 'read'>('all');

  useEffect(() => {
    if (user) {
      loadConversations();
      loadTemplates();
      loadNotifications();
    }
  }, [user]);

  const loadConversations = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('conversations')
        .select(`
          *,
          properties(id, title, city),
          participant1:profiles!inner(id, full_name, avatar_url, phone),
          participant2:profiles!inner(id, full_name, avatar_url, phone)
        `)
        .or('participant1_id.eq.' + user.id + ',participant2_id.eq.' + user.id)
        .order('updated_at', { ascending: false });

      const conversationsWithMeta = (data || []).map((conv: any) => {
        const otherParticipantId = conv.participant1_id === user.id
          ? conv.participant2_id
          : conv.participant1_id;

        const otherParticipant = conv.participant1_id === user.id
          ? conv.participant2
          : conv.participant1;

        // Get unread count based on which participant the user is
        const unreadCount = conv.participant1_id === user.id
          ? conv.unread_count_participant1 || 0
          : conv.unread_count_participant2 || 0;

        return {
          ...conv,
          other_participant: otherParticipant,
          property: conv.properties,
          last_message: null, // Would need separate query to get last message
          unread_count: unreadCount,
        } as Conversation;
      });

      setConversations(conversationsWithMeta);
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const loadTemplates = async () => {
    try {
      const { data } = await supabase
        .from('email_templates')
        .select('*')
        .order('name', { ascending: true });

      setTemplates((data || []) as EmailTemplate[]);
    } catch (error) {
      console.error('Error loading templates:', error);
      // If table doesn't exist, create default templates
      setTemplates(getDefaultTemplates());
    }
  };

  const loadNotifications = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      setNotifications((data || []) as Notification[]);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      setLoadingMessages(true);
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      setMessages((data || []) as Message[]);

      // Mark unread messages from others as read
      await supabase
        .from('messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .neq('sender_id', user.id)
        .eq('is_read', false);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!selectedConversation || !content.trim() || sendingMessage) return;

    try {
      setSendingMessage(true);

      const otherParticipantId = selectedConversation.participant1_id === user?.id
        ? selectedConversation.participant2_id
        : selectedConversation.participant1_id;

      // Note: receiver_id is not in the original schema, but we'll include it
      // If the column doesn't exist, this will be ignored
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: selectedConversation.id,
          sender_id: user?.id,
          content: content.trim(),
        });

      if (error) throw error;

      // Reload messages
      await loadMessages(selectedConversation.id);
      await loadConversations();
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Erreur lors de l\'envoi du message');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      setNotifications(prev =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    try {
      await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleSendTemplateEmail = async (template: EmailTemplate, recipientId: string) => {
    try {
      // TODO: Implement email sending functionality
      alert(`Envoi de l'email "${template.name}" au destinataire ${recipientId}`);
    } catch (error) {
      console.error('Error sending template email:', error);
    }
  };

  const getDefaultTemplates = (): EmailTemplate[] => [
    {
      id: 'welcome',
      name: 'Bienvenue',
      slug: 'bienvenue',
      subject: 'Bienvenue chez MonToit !',
      body_html: '<p>Bonjour {{prenom}},</p><p>Bienvenue sur MonToit ! Nous sommes ravis de vous compter parmi nous.</p>',
      body_text: 'Bonjour {{prenom}}, Bienvenue sur MonToit !',
      variables: ['prenom', 'nom'],
      category: 'welcome',
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'rent_reminder',
      name: 'Relance Loyer',
      slug: 'relance_loyer',
      subject: 'Rappel de paiement de loyer',
      body_html: '<p>Bonjour {{prenom}},</p><p>Ceci est un rappel pour le paiement de votre loyer de {{montant}} FCFA.</p>',
      body_text: 'Rappel de paiement de loyer',
      variables: ['prenom', 'montant', 'date_echeance'],
      category: 'rent_reminder',
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'visit_confirmed',
      name: 'Visite Confirmée',
      slug: 'visite_confirmee',
      subject: 'Votre visite est confirmée',
      body_html: '<p>Bonjour {{prenom}},</p><p>Votre visite pour {{propriete}} le {{date_visite}} est confirmée.</p>',
      body_text: 'Visite confirmée',
      variables: ['prenom', 'propriete', 'date_visite', 'heure'],
      category: 'visit_confirmed',
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'message':
        return <MessageSquare className="h-5 w-5" />;
      case 'payment':
        return <CreditCard className="h-5 w-5" />;
      case 'visit':
        return <Calendar className="h-5 w-5" />;
      case 'contract':
        return <FileText className="h-5 w-5" />;
      case 'maintenance':
        return <Wrench className="h-5 w-5" />;
      case 'review':
        return <Star className="h-5 w-5" />;
      default:
        return <Bell className="h-5 w-5" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'message':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'payment':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'visit':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'contract':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'maintenance':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'review':
        return 'bg-pink-100 text-pink-700 border-pink-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const renderMessagesTab = () => (
    <div className="space-y-6">
      {/* Search and Filter */}
      <div className="bg-white rounded-2xl border border-[#EFEBE9] p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#6B5A4E]" />
            <input
              type="text"
              placeholder="Rechercher une conversation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#FAF7F4] border border-[#EFEBE9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F16522]/20"
            />
          </div>
          <select
            value={propertyFilter}
            onChange={(e) => setPropertyFilter(e.target.value)}
            className="px-4 py-2.5 bg-[#FAF7F4] border border-[#EFEBE9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F16522]/20"
          >
            <option value="all">Tous les biens</option>
            <option value="active">Contrats actifs</option>
            <option value="past">Anciens contrats</option>
          </select>
        </div>
      </div>

      {/* Conversations List or Message View */}
      {!selectedConversation ? (
        <div className="bg-white rounded-2xl border border-[#EFEBE9] overflow-hidden">
          <div className="divide-y divide-[#EFEBE9]">
            {conversations.length === 0 ? (
              <div className="p-12 text-center">
                <MessageSquare className="w-16 h-16 text-[#6B5A4E] mx-auto mb-4" />
                <h3 className="text-xl font-bold text-[#2C1810] mb-2">Aucune conversation</h3>
                <p className="text-[#6B5A4E]">
                  Vos conversations avec les locataires et candidats apparaîtront ici
                </p>
              </div>
            ) : (
              conversations.map((conv) => {
                const participantName = conv.other_participant?.full_name || 'Utilisateur';
                const avatarUrl = conv.other_participant?.avatar_url;
                const messagePreview = conv.last_message?.content || 'Pas de message';
                const timeAgo = conv.last_message
                  ? format(new Date(conv.last_message.created_at), 'dd MMM', { locale: fr })
                  : '';

                return (
                  <div
                    key={conv.id}
                    onClick={() => {
                      setSelectedConversation(conv);
                      loadMessages(conv.id);
                    }}
                    className="p-4 hover:bg-[#FAF7F4] transition-colors cursor-pointer border-b border-[#EFEBE9] last:border-b-0"
                  >
                    <div className="flex items-start gap-4">
                      <div className="relative">
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt={participantName}
                            className="w-12 h-12 rounded-full object-cover border-2 border-white"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-[#F16522] flex items-center justify-center text-white font-bold text-lg">
                            {participantName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        {conv.unread_count > 0 && (
                          <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#F16522] text-white text-xs rounded-full flex items-center justify-center">
                            {conv.unread_count > 9 ? '9+' : conv.unread_count}
                          </span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-semibold text-[#2C1810] truncate">{participantName}</h4>
                          {conv.property && (
                            <span className="text-xs text-[#6B5A4E] flex items-center gap-1">
                              <Home className="h-3 w-3" />
                              {conv.property.title}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-[#6B5A4E] truncate">{messagePreview}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-[#A69B95]">{timeAgo}</span>
                          {conv.unread_count > 0 && (
                            <span className="text-xs font-medium text-[#F16522]">
                              {conv.unread_count} non lu{conv.unread_count > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#EFEBE9] overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 300px)' }}>
          {/* Conversation Header */}
          <div className="px-6 py-4 border-b border-[#EFEBE9] bg-[#FAF7F4] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setSelectedConversation(null);
                  setMessages([]);
                }}
                className="p-2 hover:bg-white rounded-lg transition-colors"
              >
                <ChevronDown className="h-5 w-5 text-[#6B5A4E]" />
              </button>
              <div>
                <h3 className="font-semibold text-[#2C1810]">
                  {selectedConversation.other_participant?.full_name}
                </h3>
                {selectedConversation.property && (
                  <p className="text-xs text-[#6B5A4E]">
                    {selectedConversation.property.title}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 hover:bg-white rounded-lg transition-colors" title="Appel vocal">
                <Phone className="h-4 w-4 text-[#6B5A4E]" />
              </button>
              <button className="p-2 hover:bg-white rounded-lg transition-colors" title="Visio">
                <Video className="h-4 w-4 text-[#6B5A4E]" />
              </button>
              <button className="p-2 hover:bg-white rounded-lg transition-colors" title="Plus d'options">
                <MoreHorizontal className="h-4 w-4 text-[#6B5A4E]" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {loadingMessages ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#F16522] border-t-transparent" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <MessageSquare className="w-16 h-16 text-[#6B5A4E] mx-auto mb-4" />
                <p className="text-[#6B5A4E] font-medium">Aucun message</p>
                <p className="text-sm text-[#A69B95] mt-1">Commencez la conversation !</p>
              </div>
            ) : (
              messages.map((message) => {
                const isOwn = message.sender_id === user?.id;
                return (
                  <div
                    key={message.id}
                    className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                        isOwn
                          ? 'bg-[#F16522] text-white rounded-br-2xl'
                          : 'bg-white border border-[#EFEBE9] rounded-bl-2xl'
                      }`}
                    >
                      {!isOwn && (
                        <p className="text-xs text-[#6B5A4E] mb-1">
                          {message.other_participant?.full_name || 'Locataire'}
                        </p>
                      )}
                      <p className={isOwn ? 'text-white' : 'text-[#2C1810]'}>{message.content}</p>
                      <p className={`text-xs mt-1 ${isOwn ? 'text-white/70' : 'text-[#6B5A4E]'}`}>
                        {format(new Date(message.created_at), 'p', { locale: fr })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Input */}
          <div className="p-4 border-t border-[#EFEBE9] bg-[#FAF7F4]">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Écrivez votre message..."
                className="flex-1 px-4 py-3 bg-white border border-[#EFEBE9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F16522]/20"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
                    handleSendMessage(e.target.value);
                    e.target.value = '';
                  }
                }}
              />
              <button
                onClick={() => {
                  const input = document.querySelector('input[placeholder*="message"]') as HTMLInputElement;
                  if (input) {
                    handleSendMessage(input.value);
                    input.value = '';
                  }
                }}
                disabled={sendingMessage}
                className="px-4 py-3 bg-[#F16522] hover:bg-[#d9571d] text-white rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {sendingMessage ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white" />
                    Envoi...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Envoyer
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderTemplatesTab = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#F16522] to-[#d9571d] rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Mail className="h-6 w-6" />
              Templates d'Emails
            </h2>
            <p className="text-white/90 text-sm mt-1">
              Créez et gérez vos modèles d'emails automatiques
            </p>
          </div>
          <button
            onClick={() => {
              // TODO: Open create template modal
              alert('Créer un template - fonctionnalité à implémenter');
            }}
            className="px-4 py-2 bg-white text-[#F16522] font-semibold rounded-xl hover:bg-white/90 transition-colors flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Nouveau
          </button>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => (
          <div
            key={template.id}
            className="bg-white rounded-2xl border border-[#EFEBE9] overflow-hidden hover:shadow-lg transition-shadow"
          >
            <div className="p-4 border-b border-[#EFEBE9] bg-[#FAF7F4]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-[#F16522]" />
                  <h3 className="font-semibold text-[#2C1810]">{template.name}</h3>
                </div>
                <button
                  onClick={() => {
                    setSelectedTemplate(template);
                    setEditingTemplate(!editingTemplate);
                  }}
                  className="p-1.5 hover:bg-white rounded-lg transition-colors"
                >
                  <MoreHorizontal className="h-4 w-4 text-[#6B5A4E]" />
                </button>
              </div>
              <p className="text-xs text-[#6B5A4E] mt-1">{template.subject}</p>
            </div>
            <div className="p-4">
              <p className="text-sm text-[#6B5A4E] line-clamp-2 mb-3">
                {template.body_text}
              </p>
              <div className="flex flex-wrap gap-1">
                {template.variables.map((variable) => (
                  <span
                    key={variable}
                    className="text-xs px-2 py-1 bg-[#F16522]/10 text-[#F16522] rounded-full"
                  >
                    {`${'{}{'}${variable}${'}'}'}`}
                  </span>
                ))}
              </div>
            </div>
            <div className="p-4 border-t border-[#EFEBE9] bg-[#FAF7F4] flex items-center justify-between">
              <span className={`text-xs px-2 py-1 rounded-full ${
                template.active
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {template.active ? 'Actif' : 'Inactif'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderNotificationsTab = () => {
    const filteredNotifications = notifications.filter((notif) => {
      if (notificationFilter === 'unread') return !notif.is_read;
      if (notificationFilter === 'read') return notif.is_read;
      return true;
    });

    return (
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div
            className="bg-white rounded-xl p-4 border border-[#EFEBE9] cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setNotificationFilter('all')}
          >
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-[#6B5A4E]" />
              <div>
                <p className="text-2xl font-bold text-[#2C1810]">{notifications.length}</p>
                <p className="text-xs text-[#6B5A4E]">Total</p>
              </div>
            </div>
          </div>

          <div
            className="bg-white rounded-xl p-4 border border-[#EFEBE9] cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setNotificationFilter('unread')}
          >
            <div className="flex items-center gap-3">
              <EyeOff className="h-5 w-5 text-[#F16522]" />
              <div>
                <p className="text-2xl font-bold text-[#F16522]">
                  {notifications.filter((n) => !n.is_read).length}
                </p>
                <p className="text-xs text-[#6B5A4E]">Non lus</p>
              </div>
            </div>
          </div>

          <div
            className="bg-white rounded-xl p-4 border border-[#EFEBE9] cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setNotificationFilter('read')}
          >
            <div className="flex items-center gap-3">
              <Eye className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {notifications.filter((n) => n.is_read).length}
                </p>
                <p className="text-xs text-[#6B5A4E]">Lus</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-[#EFEBE9]">
            <div className="flex items-center gap-3">
              <RefreshCw className="h-5 w-5 text-[#6B5A4E]" />
              <button
                onClick={() => loadNotifications()}
                className="text-sm text-[#F16522] hover:underline font-medium"
              >
                Actualiser
              </button>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-2xl border border-[#EFEBE9] p-2">
          <div className="flex gap-2">
            <button
              onClick={() => setNotificationFilter('all')}
              className={`px-4 py-2 rounded-xl font-medium transition-all text-sm ${
                notificationFilter === 'all'
                  ? 'bg-[#F16522] text-white'
                  : 'text-[#6B5A4E] hover:bg-[#FAF7F4]'
              }`}
            >
              Toutes
            </button>
            <button
              onClick={() => setNotificationFilter('unread')}
              className={`px-4 py-2 rounded-xl font-medium transition-all text-sm ${
                notificationFilter === 'unread'
                  ? 'bg-[#F16522] text-white'
                  : 'text-[#6B5A4E] hover:bg-[#FAF7F4]'
              }`}
            >
              Non lus
            </button>
            <button
              onClick={() => setNotificationFilter('read')}
              className={`px-4 py-2 rounded-xl font-medium transition-all text-sm ${
                notificationFilter === 'read'
                  ? 'bg-[#F16522] text-white'
                  : 'text-[#6B5A4E] hover:bg-[#FAF7F4]'
              }`}
            >
              Lus
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="bg-white rounded-2xl border border-[#EFEBE9] overflow-hidden">
          {filteredNotifications.length === 0 ? (
            <div className="p-12 text-center">
              <Bell className="w-16 h-16 text-[#6B5A4E] mx-auto mb-4" />
              <h3 className="text-xl font-bold text-[#2C1810] mb-2">
                {notificationFilter === 'unread' ? 'Aucune notification non lue' : 'Aucune notification'}
              </h3>
              <p className="text-[#6B5A4E]">
                {notificationFilter === 'unread'
                  ? 'Toutes vos notifications ont été lues'
                  : 'Vous n\'avez pas encore de notifications'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#EFEBE9]">
              {filteredNotifications.map((notif) => {
                const Icon = getNotificationIcon(notif.type);
                const color = getNotificationColor(notif.type);

                return (
                  <div
                    key={notif.id}
                    className={`p-4 hover:bg-[#FAF7F4] transition-colors flex items-start gap-4 ${
                      !notif.is_read ? 'bg-[#FAF7F4]/50' : ''
                    }`}
                  >
                    <div className={`p-2.5 rounded-lg ${color} flex-shrink-0`}>
                      <Icon className="h-5 w-5" />
                    </div>

                    <div className="flex-1 min-w-0 flex-1">
                      <p className="font-semibold text-[#2C1810]">{notif.title}</p>
                      <p className="text-sm text-[#6B5A4E] mt-1">{notif.message}</p>
                      <p className="text-xs text-[#A69B95] mt-1">
                        {format(new Date(notif.created_at), 'Pp', { locale: fr })}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!notif.is_read && (
                        <button
                          onClick={() => handleMarkAsRead(notif.id)}
                          className="p-2 hover:bg-white rounded-lg transition-colors"
                          title="Marquer comme lu"
                        >
                          <Check className="h-4 w-4 text-[#6B5A4E]" />
                        </button>
                      )}
                      {notif.action_url && (
                        <a
                          href={notif.action_url}
                          onClick={() => handleMarkAsRead(notif.id)}
                          className="p-2 hover:bg-white rounded-lg transition-colors"
                          title="Voir"
                        >
                          <ChevronRight className="h-4 w-4 text-[#6B5A4E]" />
                        </a>
                      )}
                      <button
                        onClick={() => handleDeleteNotification(notif.id)}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                        title="Supprimer"
                      >
                        <X className="h-4 w-4 text-[#6B5A4E]" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bulk Actions */}
        {notifications.length > 0 && (
          <div className="flex justify-center gap-3 mt-4">
            <button
              onClick={() => {
                notifications.filter((n) => !n.is_read).forEach((n) => handleMarkAsRead(n.id));
              }}
              className="px-6 py-2 bg-[#F16522] hover:bg-[#d9571d] text-white font-semibold rounded-xl transition-colors"
            >
              Tout marquer comme lu
            </button>
            <button
              onClick={() => {
                notifications.forEach((n) => handleDeleteNotification(n.id));
              }}
              className="px-6 py-2 border border-red-200 text-red-600 hover:bg-red-50 font-semibold rounded-xl transition-colors"
            >
              Tout supprimer
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <OwnerDashboardLayout title="Communication">
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-[#2C1810] rounded-[20px] p-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-[#F16522] flex items-center justify-center">
              <Mail className="h-6 w-6 text-white" />
            </div>
            <span>Communication Centralisée</span>
          </h1>
          <p className="text-[#E8D4C5] text-lg ml-15">
            Gérez vos communications avec les locataires
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-2xl border border-[#EFEBE9] p-2">
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setActiveTab('messages')}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all text-sm ${
                activeTab === 'messages'
                  ? 'bg-[#F16522] text-white shadow-lg'
                  : 'text-[#6B5A4E] hover:bg-[#FAF7F4]'
              }`}
            >
              <MessageSquare className="h-5 w-5" />
              Messagerie
              {notifications.filter((n) => !n.is_read).length > 0 && (
                <span className="ml-2 w-5 h-5 bg-[#F16522] text-white text-xs rounded-full flex items-center justify-center">
                  {notifications.filter((n) => !n.is_read).length > 9 ? '9+' : notifications.filter((n) => !n.is_read).length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('templates')}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all text-sm ${
                activeTab === 'templates'
                  ? 'bg-[#F16522] text-white shadow-lg'
                  : 'text-[#6B5A4E] hover:bg-[#FAF7F4]'
              }`}
            >
              <Mail className="h-5 w-5" />
              Templates
            </button>
            <button
              onClick={() => setActiveTab('notifications')}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all text-sm ${
                activeTab === 'notifications'
                  ? 'bg-[#F16522] text-white shadow-lg'
                  : 'text-[#6B5A4E] hover:bg-[#FAF7F4]'
              }`}
            >
              <Bell className="h-5 w-5" />
              Notifications
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'messages' && renderMessagesTab()}
        {activeTab === 'templates' && renderTemplatesTab()}
        {activeTab === 'notifications' && renderNotificationsTab()}
      </div>
    </OwnerDashboardLayout>
  );
}
