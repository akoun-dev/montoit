/**
 * Page de gestion des tickets de support pour les utilisateurs
 *
 * Permet de voir, suivre et gérer ses tickets de support
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Ticket,
  Plus,
  Search,
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  MessageSquare,
  Loader2,
  ExternalLink,
  Calendar,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  supportService,
  SupportTicket,
  TicketStats,
  SupportTicketStatus,
} from '@/services/support/support.service';

type StatusFilter = 'all' | SupportTicketStatus;

const statusConfig = {
  open: {
    label: 'Ouvert',
    color: 'bg-blue-100 text-blue-700',
    icon: AlertCircle,
  },
  in_progress: {
    label: 'En cours',
    color: 'bg-yellow-100 text-yellow-700',
    icon: Clock,
  },
  waiting_customer: {
    label: 'En attente',
    color: 'bg-purple-100 text-purple-700',
    icon: MessageSquare,
  },
  resolved: {
    label: 'Résolu',
    color: 'bg-green-100 text-green-700',
    icon: CheckCircle,
  },
  closed: {
    label: 'Fermé',
    color: 'bg-gray-100 text-gray-700',
    icon: XCircle,
  },
};

const categoryConfig = {
  technical: { label: 'Technique', icon: '🔧' },
  billing: { label: 'Facturation', icon: '💳' },
  account: { label: 'Compte', icon: '👤' },
  property: { label: 'Propriété', icon: '🏠' },
  booking: { label: 'Réservation', icon: '📅' },
  payment: { label: 'Paiement', icon: '💰' },
  verification: { label: 'Vérification', icon: '✓' },
  other: { label: 'Autre', icon: '❓' },
};

const priorityConfig = {
  low: { label: 'Faible', color: 'bg-gray-100 text-gray-600' },
  medium: { label: 'Moyen', color: 'bg-blue-100 text-blue-600' },
  high: { label: 'Élevé', color: 'bg-orange-100 text-orange-600' },
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-600' },
};

export default function SupportTicketsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [stats, setStats] = useState<TicketStats>({
    total: 0,
    open: 0,
    in_progress: 0,
    waiting: 0,
    resolved: 0,
    closed: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [showMessages, setShowMessages] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const [ticketsData, statsData] = await Promise.all([
        supportService.getUserTickets(user.id),
        supportService.getUserTicketStats(user.id),
      ]);

      setTickets(ticketsData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading tickets:', error);
      toast.error('Erreur lors du chargement des tickets');
    } finally {
      setLoading(false);
    }
  }, [user, setLoading, setTickets, setStats]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, loadData]);

  const loadMessages = async (ticketId: string) => {
    try {
      const messagesData = await supportService.getTicketMessages(ticketId);
      setMessages(messagesData);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleViewTicket = async (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setShowMessages(true);
    await loadMessages(ticket.id);
  };

  const handleSendMessage = async () => {
    if (!selectedTicket || !user || !newMessage.trim()) return;

    setSendingMessage(true);
    try {
      await supportService.addTicketMessage(
        selectedTicket.id,
        user.id,
        newMessage.trim(),
        false
      );
      setNewMessage('');
      await loadMessages(selectedTicket.id);
      toast.success('Message envoyé');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Erreur lors de l\'envoi du message');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleReopenTicket = async (ticketId: string) => {
    if (!user) return;

    try {
      await supportService.reopenTicket(ticketId, user.id);
      toast.success('Ticket rouvert');
      await loadData();
    } catch (error) {
      console.error('Error reopening ticket:', error);
      toast.error('Erreur lors de la réouverture');
    }
  };

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch =
      searchTerm === '' ||
      ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.ticket_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <Ticket className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-neutral-900 mb-2">Connexion requise</h2>
          <p className="text-neutral-600">Veuillez vous connecter pour accéder à vos tickets</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <div className="bg-[#2C1810] rounded-2xl shadow-sm mb-8">
        <div className="px-4 sm:px-6 lg:px-8 xl:px-12 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-[#F16522] flex items-center justify-center">
                <Ticket className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white">Tickets de Support</h1>
                <p className="text-[#E8D4C5]">Suivez et gérez vos demandes d'assistance</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/contact')}
              className="bg-[#F16522] hover:bg-[#e55a1d] text-white font-semibold py-3 px-6 rounded-xl transition-colors flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">Nouveau ticket</span>
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 xl:px-12">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border border-neutral-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-neutral-100 rounded-lg flex items-center justify-center">
                <Ticket className="w-5 h-5 text-neutral-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900">{stats.total}</p>
                <p className="text-xs text-neutral-500">Total</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-neutral-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900">{stats.open}</p>
                <p className="text-xs text-neutral-500">Ouverts</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-neutral-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-50 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900">{stats.in_progress}</p>
                <p className="text-xs text-neutral-500">En cours</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-neutral-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900">{stats.waiting}</p>
                <p className="text-xs text-neutral-500">Attente</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-neutral-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900">{stats.resolved}</p>
                <p className="text-xs text-neutral-500">Résolus</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-neutral-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <XCircle className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900">{stats.closed}</p>
                <p className="text-xs text-neutral-500">Fermés</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-neutral-200 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-neutral-400" />
              <input
                type="text"
                placeholder="Rechercher par numéro, sujet..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="all">Tous les statuts</option>
              <option value="open">Ouverts</option>
              <option value="in_progress">En cours</option>
              <option value="waiting_customer">En attente</option>
              <option value="resolved">Résolus</option>
              <option value="closed">Fermés</option>
            </select>
          </div>
        </div>

        {/* Tickets List */}
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          {filteredTickets.length === 0 ? (
            <div className="p-12 text-center">
              <Ticket className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-neutral-700 mb-2">
                {searchTerm || statusFilter !== 'all' ? 'Aucun ticket trouvé' : 'Aucun ticket'}
              </h3>
              <p className="text-neutral-500 mb-6">
                {searchTerm || statusFilter !== 'all'
                  ? 'Essayez de modifier vos filtres'
                  : 'Vous n\'avez pas encore créé de ticket de support'}
              </p>
              <button
                onClick={() => navigate('/contact')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#F16522] text-white font-semibold rounded-lg hover:bg-[#e55a1d] transition-colors"
              >
                <Plus className="w-5 h-5" />
                Créer un ticket
              </button>
            </div>
          ) : (
            <div className="divide-y divide-neutral-200">
              {filteredTickets.map((ticket) => {
                const StatusIcon = statusConfig[ticket.status].icon;
                const isExpanded = expandedTicket === ticket.id;

                return (
                  <div key={ticket.id} className="divide-y divide-neutral-200">
                    <div
                      className="p-6 hover:bg-neutral-50 transition-colors cursor-pointer"
                      onClick={() => setExpandedTicket(isExpanded ? null : ticket.id)}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-mono text-sm font-semibold text-[#F16522]">
                              #{ticket.ticket_number}
                            </span>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusConfig[ticket.status].color}`}>
                              <StatusIcon className="w-3 h-3 inline mr-1" />
                              {statusConfig[ticket.status].label}
                            </span>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${priorityConfig[ticket.priority].color}`}>
                              {priorityConfig[ticket.priority].label}
                            </span>
                          </div>
                          <h3 className="text-lg font-semibold text-neutral-900 mb-1">
                            {ticket.subject}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-neutral-500 mb-2">
                            <span className="flex items-center gap-1">
                              {categoryConfig[ticket.category].icon} {categoryConfig[ticket.category].label}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(ticket.created_at), 'dd MMM yyyy', { locale: fr })}
                            </span>
                          </div>
                          <p className="text-sm text-neutral-600 line-clamp-2">
                            {ticket.description}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewTicket(ticket);
                            }}
                            className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
                            title="Voir les détails"
                          >
                            <ExternalLink className="w-4 h-4 text-neutral-600" />
                          </button>
                          <ChevronDown
                            className={`w-5 h-5 text-neutral-400 transition-transform ${
                              isExpanded ? 'transform rotate-180' : ''
                            }`}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="p-6 bg-neutral-50 border-t border-neutral-200">
                        <div className="space-y-4">
                          <div>
                            <h4 className="text-sm font-medium text-neutral-700 mb-2">Description</h4>
                            <p className="text-sm text-neutral-600">{ticket.description}</p>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-neutral-500">Catégorie</span>
                              <p className="font-medium text-neutral-900">
                                {categoryConfig[ticket.category].label}
                              </p>
                            </div>
                            <div>
                              <span className="text-neutral-500">Priorité</span>
                              <p className="font-medium text-neutral-900">
                                {priorityConfig[ticket.priority].label}
                              </p>
                            </div>
                            <div>
                              <span className="text-neutral-500">Créé le</span>
                              <p className="font-medium text-neutral-900">
                                {format(new Date(ticket.created_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                              </p>
                            </div>
                            <div>
                              <span className="text-neutral-500">Dernière mise à jour</span>
                              <p className="font-medium text-neutral-900">
                                {format(new Date(ticket.updated_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                              </p>
                            </div>
                          </div>

                          {ticket.resolution && (
                            <div>
                              <h4 className="text-sm font-medium text-neutral-700 mb-2">Résolution</h4>
                              <p className="text-sm text-neutral-600">{ticket.resolution}</p>
                            </div>
                          )}

                          <div className="flex gap-3 pt-2">
                            <button
                              onClick={() => handleViewTicket(ticket)}
                              className="flex items-center gap-2 px-4 py-2 bg-[#F16522] text-white text-sm font-medium rounded-lg hover:bg-[#e55a1d] transition-colors"
                            >
                              <MessageSquare className="w-4 h-4" />
                              Voir les messages
                            </button>
                            {(ticket.status === 'resolved' || ticket.status === 'closed') && (
                              <button
                                onClick={() => handleReopenTicket(ticket.id)}
                                className="flex items-center gap-2 px-4 py-2 border border-neutral-300 text-neutral-700 text-sm font-medium rounded-lg hover:bg-neutral-50 transition-colors"
                              >
                                <Plus className="w-4 h-4" />
                                Rouvrir
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Messages Modal */}
      {showMessages && selectedTicket && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-neutral-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-sm font-semibold text-[#F16522]">
                      #{selectedTicket.ticket_number}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusConfig[selectedTicket.status].color}`}>
                      {statusConfig[selectedTicket.status].label}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-neutral-900">{selectedTicket.subject}</h3>
                </div>
                <button
                  onClick={() => {
                    setShowMessages(false);
                    setSelectedTicket(null);
                    setMessages([]);
                  }}
                  className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
                >
                  <XCircle className="w-5 h-5 text-neutral-600" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center text-neutral-500 py-8">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
                  <p>Aucun message pour le moment</p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        message.sender_id === user?.id
                          ? 'bg-[#F16522] text-white'
                          : 'bg-neutral-100 text-neutral-900'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium opacity-80">{message.sender?.full_name}</span>
                        <span className="text-xs opacity-60">
                          {format(new Date(message.created_at), 'HH:mm', { locale: fr })}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Input */}
            <div className="p-6 border-t border-neutral-200">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
                  placeholder="Écrivez votre message..."
                  className="flex-1 px-4 py-3 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  disabled={sendingMessage}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || sendingMessage}
                  className="px-6 py-3 bg-[#F16522] text-white rounded-xl hover:bg-[#e55a1d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {sendingMessage ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
