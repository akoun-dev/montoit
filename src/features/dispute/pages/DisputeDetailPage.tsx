import { useState, useEffect, useRef, ChangeEvent, KeyboardEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Button, Textarea } from '@/shared/ui';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Send,
  Clock,
  CheckCircle,
  MessageSquare,
  User,
  Star,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Dispute {
  id: string;
  dispute_number: string;
  category: string;
  subject: string;
  description: string;
  status: string | null;
  priority: string | null;
  resolution: string | null;
  resolution_type: string | null;
  created_at: string | null;
  resolved_at: string | null;
  complainant_id: string;
  respondent_id: string;
  assigned_agent_id: string | null;
  satisfaction_complainant: number | null;
  satisfaction_respondent: number | null;
}

interface DisputeMessage {
  id: string;
  sender_id: string;
  sender_role: string;
  content: string;
  created_at: string | null;
  is_internal: boolean | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  open: { label: 'Ouvert', color: 'text-blue-800', bgColor: 'bg-blue-100' },
  under_review: { label: 'En examen', color: 'text-yellow-800', bgColor: 'bg-yellow-100' },
  mediation: { label: 'En médiation', color: 'text-orange-800', bgColor: 'bg-orange-100' },
  resolved: { label: 'Résolu', color: 'text-green-800', bgColor: 'bg-green-100' },
  escalated: { label: 'Escaladé', color: 'text-red-800', bgColor: 'bg-red-100' },
  closed: { label: 'Fermé', color: 'text-gray-800', bgColor: 'bg-gray-100' },
};

export default function DisputeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [messages, setMessages] = useState<DisputeMessage[]>([]);
  const [profiles, setProfiles] = useState<
    Record<string, { full_name: string; avatar_url: string | null }>
  >({});
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(0);

  const loadDispute = async () => {
    if (!id) return;

    const { data, error } = await supabase.from('disputes').select('*').eq('id', id).single();

    if (error) {
      console.error('Erreur chargement litige:', error);
      toast.error('Litige non trouvé');
      navigate('/mes-litiges');
      return;
    }

    setDispute(data);

    // Load profiles
    const userIds = [data.complainant_id, data.respondent_id];
    if (data.assigned_agent_id) userIds.push(data.assigned_agent_id);

    const { data: profilesData } = await supabase.rpc('get_public_profiles_safe', {
      profile_user_ids: userIds,
    });

    if (profilesData) {
      const profilesMap: Record<string, { full_name: string; avatar_url: string | null }> = {};
      profilesData.forEach(
        (p: { user_id: string; full_name: string; avatar_url: string | null }) => {
          profilesMap[p.user_id] = { full_name: p.full_name, avatar_url: p.avatar_url };
        }
      );
      setProfiles(profilesMap);
    }

    // Check if should show rating
    if (data.status === 'resolved' && user) {
      const isComplainant = data.complainant_id === user.id;
      const hasRated = isComplainant ? data.satisfaction_complainant : data.satisfaction_respondent;
      setShowRating(!hasRated);
    }

    setIsLoading(false);
  };

  const loadMessages = async () => {
    if (!id) return;

    const { data, error } = await supabase
      .from('dispute_messages')
      .select('*')
      .eq('dispute_id', id)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMessages(data);
    }
  };

  useEffect(() => {
    if (id && user) {
      loadDispute();
      loadMessages();
    }
  }, [id, user, loadDispute, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user || !dispute) return;

    setIsSending(true);
    const isComplainant = dispute.complainant_id === user.id;

    try {
      const { error } = await supabase.from('dispute_messages').insert({
        dispute_id: dispute.id,
        sender_id: user.id,
        sender_role: isComplainant ? 'complainant' : 'respondent',
        content: newMessage.trim(),
        is_internal: false,
      });

      if (error) throw error;

      setNewMessage('');
      loadMessages();
    } catch (error) {
      console.error('Erreur envoi message:', error);
      toast.error("Erreur lors de l'envoi du message");
    } finally {
      setIsSending(false);
    }
  };

  const handleRating = async (stars: number) => {
    if (!dispute || !user) return;

    const isComplainant = dispute.complainant_id === user.id;
    const updateField = isComplainant ? 'satisfaction_complainant' : 'satisfaction_respondent';

    try {
      const { error } = await supabase
        .from('disputes')
        .update({ [updateField]: stars })
        .eq('id', dispute.id);

      if (error) throw error;

      setRating(stars);
      setShowRating(false);
      toast.success('Merci pour votre évaluation !');
      loadDispute();
    } catch (error) {
      console.error('Erreur notation:', error);
      toast.error('Erreur lors de la notation');
    }
  };

  const handleTextareaChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF7F4] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#F16522]" />
      </div>
    );
  }

  if (!dispute) return null;

  const statusConfig = STATUS_CONFIG[dispute.status || 'open'] ?? STATUS_CONFIG['open'];
  const isComplainant = dispute.complainant_id === user?.id;
  const canSendMessage = ['open', 'under_review', 'mediation'].includes(dispute.status || '');

  return (
    <div className="min-h-screen bg-[#FAF7F4]">
      <div className="w-full mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/mes-litiges')}
            className="inline-flex items-center gap-2 mb-4 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Retour aux litiges</span>
          </button>

          <div className="bg-white rounded-2xl border border-[#EFEBE9] p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-sm font-mono text-muted-foreground">
                    {dispute.dispute_number}
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${statusConfig?.bgColor ?? ''} ${statusConfig?.color ?? ''}`}
                  >
                    {statusConfig?.label ?? 'Inconnu'}
                  </span>
                  {dispute.priority === 'urgent' && (
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                      Urgent
                    </span>
                  )}
                </div>
                <h1 className="text-2xl font-bold text-[#2C1810]">{dispute.subject}</h1>
              </div>
            </div>

            <p className="text-muted-foreground mb-4">{dispute.description}</p>

            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>
                  Créé le{' '}
                  {dispute.created_at &&
                    format(new Date(dispute.created_at), 'dd MMMM yyyy', { locale: fr })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className={isComplainant ? 'text-blue-600' : 'text-orange-600'}>
                  {isComplainant ? 'Vous êtes le plaignant' : 'Vous êtes mis en cause'}
                </span>
              </div>
              {dispute.assigned_agent_id && profiles[dispute.assigned_agent_id] && (
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-muted-foreground" />
                  <span>
                    Médiateur: {profiles[dispute.assigned_agent_id]?.full_name || 'Agent'}
                  </span>
                </div>
              )}
            </div>

            {/* Resolution */}
            {dispute.status === 'resolved' && dispute.resolution && (
              <div className="mt-4 p-4 bg-green-50 rounded-xl border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-semibold text-green-800">Résolution</span>
                </div>
                <p className="text-green-700">{dispute.resolution}</p>
              </div>
            )}
          </div>
        </div>

        {/* Rating Modal */}
        {showRating && (
          <div className="bg-white rounded-2xl border border-[#EFEBE9] p-6 mb-6">
            <h3 className="font-semibold text-[#2C1810] mb-4">
              Comment évaluez-vous la résolution de ce litige ?
            </h3>
            <div className="flex gap-2 mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => handleRating(star)}
                  className="p-2 hover:scale-110 transition-transform"
                >
                  <Star
                    className={`w-8 h-8 ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="bg-white rounded-2xl border border-[#EFEBE9] overflow-hidden">
          <div className="p-4 border-b border-[#EFEBE9]">
            <h2 className="font-semibold text-[#2C1810]">Historique de la médiation</h2>
          </div>

          <div className="h-[400px] overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p>Aucun message pour le moment</p>
              </div>
            ) : (
              messages.map((message) => {
                const isOwnMessage = message.sender_id === user?.id;
                const isSystem = message.sender_role === 'system';
                const isMediator = message.sender_role === 'mediator';
                const senderProfile = profiles[message.sender_id];

                if (isSystem) {
                  return (
                    <div key={message.id} className="text-center">
                      <span className="inline-block px-4 py-2 bg-[#EFEBE9] rounded-full text-sm text-muted-foreground">
                        {message.content}
                      </span>
                    </div>
                  );
                }

                return (
                  <div
                    key={message.id}
                    className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[70%] ${isOwnMessage ? 'order-2' : 'order-1'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-muted-foreground">
                          {senderProfile?.full_name || 'Utilisateur'}
                          {isMediator && ' (Médiateur)'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {message.created_at &&
                            format(new Date(message.created_at), 'HH:mm', { locale: fr })}
                        </span>
                      </div>
                      <div
                        className={`rounded-2xl px-4 py-3 ${
                          isOwnMessage
                            ? 'bg-[#F16522] text-white rounded-tr-sm'
                            : isMediator
                              ? 'bg-blue-100 text-blue-900 rounded-tl-sm'
                              : 'bg-[#EFEBE9] text-[#2C1810] rounded-tl-sm'
                        }`}
                      >
                        {message.content}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          {canSendMessage ? (
            <div className="p-4 border-t border-[#EFEBE9]">
              <div className="flex gap-3">
                <Textarea
                  placeholder="Écrivez votre message..."
                  value={newMessage}
                  onChange={handleTextareaChange}
                  rows={2}
                  className="resize-none"
                  onKeyDown={handleKeyDown}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || isSending}
                  className="bg-[#F16522] hover:bg-[#F16522]/90 self-end"
                >
                  {isSending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-4 border-t border-[#EFEBE9] text-center text-muted-foreground">
              Ce litige est {dispute.status === 'resolved' ? 'résolu' : 'fermé'}. Vous ne pouvez
              plus envoyer de messages.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
