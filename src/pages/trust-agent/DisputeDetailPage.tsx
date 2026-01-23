import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Scale,
  DollarSign,
  Home,
  AlertCircle,
  MessageSquare,
  CheckCircle2,
  Clock,
  Send,
  Paperclip,
  Download,
  User,
  FileText,
  AlertTriangle,
  ArrowUpCircle,
  Calendar,
  MapPin,
  Phone,
  Mail,
  ThumbsUp,
  ThumbsDown,
  Gavel,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/Button';
import Input from '@/shared/ui/Input';
import { Textarea } from '@/shared/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/app/providers/AuthProvider';
import { toast } from '@/hooks/shared/useSafeToast';

type DisputeType = 'deposit' | 'damage' | 'rent' | 'noise' | 'other';
type DisputeStatus = 'assigned' | 'under_mediation' | 'awaiting_response' | 'resolved' | 'escalated';
type DisputePriority = 'low' | 'medium' | 'high';

interface Dispute {
  id: string;
  contract_id: string | null;
  type: DisputeType;
  status: DisputeStatus;
  priority: DisputePriority;
  title: string;
  description: string;
  created_by: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  resolution_notes: string | null;
  // Related data
  contract?: {
    property: {
      title: string;
      address: string;
      city: string;
    };
    tenant: {
      full_name: string;
      email: string;
      phone: string | null;
    };
    owner: {
      full_name: string;
      email: string;
      phone: string | null;
    };
  };
}

interface DisputeMessage {
  id: string;
  dispute_id: string;
  sender_id: string;
  sender_role: 'tenant' | 'owner' | 'trust_agent' | 'admin';
  content: string;
  attachments: string[] | null;
  created_at: string;
  read_at: string | null;
}

interface DisputeEvidence {
  id: string;
  dispute_id: string;
  uploaded_by: string;
  uploader_role: 'tenant' | 'owner' | 'trust_agent';
  file_name: string;
  file_url: string;
  file_type: string;
  description: string | null;
  created_at: string;
}

interface ResolutionProposal {
  id: string;
  dispute_id: string;
  proposed_by: string;
  proposal_type: 'refund' | 'compensation' | 'payment_plan' | 'other';
  amount: number | null;
  description: string;
  tenant_accepted: boolean | null;
  owner_accepted: boolean | null;
  created_at: string;
  expires_at: string | null;
}

const STATUS_CONFIG: Record<DisputeStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; color: string; icon: React.ElementType }> = {
  assigned: { label: 'Assigné', variant: 'outline', color: 'bg-blue-100 text-blue-700', icon: Clock },
  under_mediation: { label: 'En médiation', variant: 'default', color: 'bg-orange-100 text-orange-700', icon: Gavel },
  awaiting_response: { label: 'En attente de réponse', variant: 'outline', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  resolved: { label: 'Résolu', variant: 'secondary', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  escalated: { label: 'Escaladé', variant: 'outline', color: 'bg-red-100 text-red-700', icon: ArrowUpCircle },
};

const TYPE_CONFIG: Record<DisputeType, { label: string; icon: React.ElementType; color: string }> = {
  deposit: { label: 'Dépôt de garantie', icon: DollarSign, color: 'bg-purple-100 text-purple-700' },
  damage: { label: 'Dommages', icon: Home, color: 'bg-orange-100 text-orange-700' },
  rent: { label: 'Loyer impayé', icon: DollarSign, color: 'bg-red-100 text-red-700' },
  noise: { label: 'Bruit', icon: AlertCircle, color: 'bg-amber-100 text-amber-700' },
  other: { label: 'Autre', icon: MessageSquare, color: 'bg-gray-100 text-gray-700' },
};

const MEDIATION_STAGES = [
  { id: 'reception', label: 'Réception', icon: MessageSquare, description: 'Litige reçu' },
  { id: 'analysis', label: 'Analyse', icon: FileText, description: 'Analyse des documents' },
  { id: 'negotiation', label: 'Négociation', icon: Gavel, description: 'Discussion entre parties' },
  { id: 'proposal', label: 'Proposition', icon: Send, description: 'Proposition de solution' },
  { id: 'resolution', label: 'Résolution', icon: CheckCircle2, description: 'Accord trouvé' },
];

export default function DisputeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Messages
  const [messages, setMessages] = useState<DisputeMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');

  // Evidence
  const [evidence, setEvidence] = useState<DisputeEvidence[]>([]);

  // Proposals
  const [proposals, setProposals] = useState<ResolutionProposal[]>([]);

  // Dialog states
  const [showProposalDialog, setShowProposalDialog] = useState(false);
  const [showEscalateDialog, setShowEscalateDialog] = useState(false);
  const [showResolveDialog, setShowResolveDialog] = useState(false);

  // Proposal form
  const [proposalType, setProposalType] = useState<'refund' | 'compensation' | 'payment_plan' | 'other'>('refund');
  const [proposalAmount, setProposalAmount] = useState('');
  const [proposalDescription, setProposalDescription] = useState('');

  // Resolution notes
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [escalationReason, setEscalationReason] = useState('');

  useEffect(() => {
    if (id) {
      loadDispute(id);
      loadMessages(id);
      loadEvidence(id);
      loadProposals(id);
    }
  }, [id]);

  const loadDispute = async (disputeId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('disputes' as never)
        .select('*')
        .eq('id', disputeId)
        .single() as unknown as { data: Dispute; error: { code?: string; message?: string } | null };

      if (error) {
        if (error.code === 'PGRST116') {
          toast.error('Litige introuvable');
          navigate('/trust-agent/disputes');
          return;
        }
        throw error;
      }

      setDispute(data);
    } catch (error) {
      console.error('Error loading dispute:', error);
      toast.error('Erreur lors du chargement du litige');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (disputeId: string) => {
    try {
      const { data, error } = await supabase
        .from('dispute_messages' as never)
        .select('*')
        .eq('dispute_id', disputeId)
        .order('created_at', { ascending: true }) as unknown as { data: DisputeMessage[]; error: { code?: string; message?: string } | null };

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading messages:', error);
      }

      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const loadEvidence = async (disputeId: string) => {
    try {
      const { data, error } = await supabase
        .from('dispute_evidence' as never)
        .select('*')
        .eq('dispute_id', disputeId)
        .order('created_at', { ascending: false }) as unknown as { data: DisputeEvidence[]; error: { code?: string; message?: string } | null };

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading evidence:', error);
      }

      setEvidence(data || []);
    } catch (error) {
      console.error('Error loading evidence:', error);
    }
  };

  const loadProposals = async (disputeId: string) => {
    try {
      const { data, error } = await supabase
        .from('dispute_proposals' as never)
        .select('*')
        .eq('dispute_id', disputeId)
        .order('created_at', { ascending: false }) as unknown as { data: ResolutionProposal[]; error: { code?: string; message?: string } | null };

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading proposals:', error);
      }

      setProposals(data || []);
    } catch (error) {
      console.error('Error loading proposals:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !dispute) return;

    try {
      const { error } = await supabase
        .from('dispute_messages' as never)
        .insert({
          dispute_id: dispute.id,
          sender_id: user?.id,
          sender_role: 'trust_agent',
          content: newMessage,
          attachments: [],
        }) as unknown as { error: { code?: string; message?: string } | null };

      if (error) throw error;

      setNewMessage('');
      toast.success('Message envoyé');
      loadMessages(dispute.id);

      // Update dispute status if it was in awaiting_response
      if (dispute.status === 'awaiting_response') {
        await updateDisputeStatus('under_mediation');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Erreur lors de l\'envoi du message');
    }
  };

  const updateDisputeStatus = async (status: DisputeStatus) => {
    if (!dispute) return;

    try {
      const { error } = await supabase
        .from('disputes' as never)
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', dispute.id) as unknown as { error: { code?: string; message?: string } | null };

      if (error) throw error;

      loadDispute(dispute.id);
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleCreateProposal = async () => {
    if (!dispute || !proposalDescription.trim()) return;

    try {
      const { error } = await supabase
        .from('dispute_proposals' as never)
        .insert({
          dispute_id: dispute.id,
          proposed_by: user?.id,
          proposal_type: proposalType,
          amount: proposalAmount ? parseFloat(proposalAmount) : null,
          description: proposalDescription,
          tenant_accepted: null,
          owner_accepted: null,
        }) as unknown as { error: { code?: string; message?: string } | null };

      if (error) throw error;

      toast.success('Proposition créée');
      setShowProposalDialog(false);
      setProposalType('refund');
      setProposalAmount('');
      setProposalDescription('');
      loadProposals(dispute.id);
      await updateDisputeStatus('awaiting_response');
    } catch (error) {
      console.error('Error creating proposal:', error);
      toast.error('Erreur lors de la création de la proposition');
    }
  };

  const handleResolve = async () => {
    if (!dispute || !resolutionNotes.trim()) return;

    try {
      const { error } = await supabase
        .from('disputes' as never)
        .update({
          status: 'resolved',
          resolution_notes: resolutionNotes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', dispute.id) as unknown as { error: { code?: string; message?: string } | null };

      if (error) throw error;

      toast.success('Litige résolu');
      setShowResolveDialog(false);
      setResolutionNotes('');
      loadDispute(dispute.id);
    } catch (error) {
      console.error('Error resolving dispute:', error);
      toast.error('Erreur lors de la résolution');
    }
  };

  const handleEscalate = async () => {
    if (!dispute || !escalationReason.trim()) return;

    try {
      const { error } = await supabase
        .from('disputes' as never)
        .update({
          status: 'escalated',
          resolution_notes: `Escaladé: ${escalationReason}`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', dispute.id) as unknown as { error: { code?: string; message?: string } | null };

      if (error) throw error;

      toast.success('Litige escaladé');
      setShowEscalateDialog(false);
      setEscalationReason('');
      loadDispute(dispute.id);
    } catch (error) {
      console.error('Error escalating dispute:', error);
      toast.error('Erreur lors de l\'escalade');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!dispute) {
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-card border-b sticky top-0 z-10">
          <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="small" className="p-2 h-auto w-auto" onClick={() => navigate('/trust-agent/disputes')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-xl font-semibold">Litige introuvable</h1>
            </div>
          </div>
        </header>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[dispute.status];
  const StatusIcon = statusConfig.icon;
  const typeConfig = TYPE_CONFIG[dispute.type];
  const TypeIcon = typeConfig.icon;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b sticky top-0 z-10">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="small" className="p-2 h-auto w-auto" onClick={() => navigate('/trust-agent/disputes')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${typeConfig.color}`}>
                    <TypeIcon className="h-5 w-5" />
                  </div>
                  <h1 className="text-xl font-semibold">{dispute.title}</h1>
                  <Badge variant={statusConfig.variant} className={statusConfig.color}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {statusConfig.label}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {typeConfig.label} • Créé le {new Date(dispute.created_at).toLocaleDateString('fr-FR')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {dispute.status === 'assigned' && (
                <Button onClick={() => updateDisputeStatus('under_mediation')}>
                  <Gavel className="h-4 w-4 mr-2" />
                  Démarrer la médiation
                </Button>
              )}
              {dispute.status === 'under_mediation' && (
                <>
                  <Button variant="outline" onClick={() => setShowEscalateDialog(true)} className="text-red-600 border-red-200 hover:bg-red-50">
                    <ArrowUpCircle className="h-4 w-4 mr-2" />
                    Escalader
                  </Button>
                  <Button variant="outline" onClick={() => setShowProposalDialog(true)}>
                    <Send className="h-4 w-4 mr-2" />
                    Faire une proposition
                  </Button>
                  <Button onClick={() => setShowResolveDialog(true)}>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Résoudre
                  </Button>
                </>
              )}
              {dispute.status === 'awaiting_response' && (
                <>
                  <Button variant="outline" onClick={() => setShowEscalateDialog(true)} className="text-red-600 border-red-200 hover:bg-red-50">
                    <ArrowUpCircle className="h-4 w-4 mr-2" />
                    Escalader
                  </Button>
                  <Button onClick={() => setShowResolveDialog(true)}>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Résoudre
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">
                  <FileText className="h-4 w-4 mr-2" />
                  Vue d'ensemble
                </TabsTrigger>
                <TabsTrigger value="messages">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Messages
                  {messages.length > 0 && (
                    <Badge variant="secondary" className="ml-1">{messages.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="evidence">
                  <Paperclip className="h-4 w-4 mr-2" />
                  Preuves
                </TabsTrigger>
                <TabsTrigger value="proposals">
                  <Send className="h-4 w-4 mr-2" />
                  Propositions
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                {/* Dispute Details */}
                <Card>
                  <CardHeader>
                    <CardTitle>Détails du litige</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Description</p>
                      <p className="text-sm">{dispute.description}</p>
                    </div>

                    {/* Mediation Workflow */}
                    <div className="pt-4 border-t">
                      <p className="text-sm font-medium mb-4">Workflow de médiation</p>
                      <div className="grid grid-cols-5 gap-2">
                        {MEDIATION_STAGES.map((stage, index) => {
                          const StageIcon = stage.icon;
                          const isActive = dispute.status === 'under_mediation' || dispute.status === 'awaiting_response';
                          const isCompleted = dispute.status === 'resolved';
                          const isCurrent = isActive && index === 2;

                          return (
                            <div key={stage.id} className="relative">
                              <div className={`flex flex-col items-center p-3 rounded-lg border-2 ${
                                isCurrent ? 'border-orange-400 bg-orange-50' :
                                isCompleted ? 'border-green-400 bg-green-50' :
                                'border-gray-200 bg-gray-50'
                              }`}>
                                <StageIcon className={`h-5 w-5 ${
                                  isCurrent ? 'text-orange-600' :
                                  isCompleted ? 'text-green-600' :
                                  'text-gray-400'
                                }`} />
                                <p className="text-xs font-medium mt-1">{stage.label}</p>
                              </div>
                              {index < MEDIATION_STAGES.length - 1 && (
                                <div className="hidden sm:block absolute top-1/2 -right-1 w-2 h-0.5 bg-gray-300" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Parties Involved */}
                {dispute.contract && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Parties impliquées</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50">
                        <User className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium text-sm">Locataire</p>
                          <p className="text-sm">{dispute.contract.tenant.full_name}</p>
                          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {dispute.contract.tenant.email}
                            </span>
                            {dispute.contract.tenant.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {dispute.contract.tenant.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-3 rounded-lg bg-orange-50">
                        <Home className="h-5 w-5 text-orange-600 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium text-sm">Propriétaire</p>
                          <p className="text-sm">{dispute.contract.owner.full_name}</p>
                          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {dispute.contract.owner.email}
                            </span>
                            {dispute.contract.owner.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {dispute.contract.owner.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="p-3 rounded-lg bg-gray-50">
                        <p className="text-xs text-muted-foreground mb-1">Propriété concernée</p>
                        <p className="font-medium text-sm">{dispute.contract.property.title}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3" />
                          {dispute.contract.property.address}, {dispute.contract.property.city}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Messages Tab */}
              <TabsContent value="messages" className="space-y-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="space-y-4 max-h-[500px] overflow-y-auto mb-4">
                      {messages.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>Aucun message pour le moment</p>
                        </div>
                      ) : (
                        messages.map((message) => {
                          const isAgent = message.sender_role === 'trust_agent';
                          return (
                            <div key={message.id} className={`flex ${isAgent ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[80%] p-3 rounded-lg ${
                                isAgent
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted'
                              }`}>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-medium">
                                    {message.sender_role === 'tenant' ? 'Locataire' :
                                     message.sender_role === 'owner' ? 'Propriétaire' :
                                     message.sender_role === 'trust_agent' ? 'Agent de confiance' :
                                     'Admin'}
                                  </span>
                                  <span className="text-xs opacity-70">
                                    {new Date(message.created_at).toLocaleString('fr-FR')}
                                  </span>
                                </div>
                                <p className="text-sm">{message.content}</p>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Input
                        placeholder="Écrivez votre message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        className="flex-1"
                      />
                      <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Evidence Tab */}
              <TabsContent value="evidence" className="space-y-4">
                {evidence.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                      <Paperclip className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Aucune preuve documentée</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {evidence.map((item) => (
                      <Card key={item.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-muted">
                              <FileText className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-sm">{item.file_name}</p>
                              <p className="text-xs text-muted-foreground">
                                Ajouté par {item.uploader_role === 'tenant' ? 'le locataire' : 'le propriétaire'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(item.created_at).toLocaleDateString('fr-FR')}
                              </p>
                              {item.description && (
                                <p className="text-sm mt-2">{item.description}</p>
                              )}
                            </div>
                            <Button
                              size="small"
                              variant="outline"
                              onClick={() => window.open(item.file_url, '_blank')}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                    }
                  </div>
                )}
              </TabsContent>

              {/* Proposals Tab */}
              <TabsContent value="proposals" className="space-y-4">
                {proposals.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                      <Send className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Aucune proposition pour le moment</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {proposals.map((proposal) => (
                      <Card key={proposal.id} className="border-l-4 border-l-purple-500">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline">
                                  {proposal.proposal_type === 'refund' ? 'Remboursement' :
                                   proposal.proposal_type === 'compensation' ? 'Indemnisation' :
                                   proposal.proposal_type === 'payment_plan' ? 'Échelonnement' :
                                   'Autre'}
                                </Badge>
                                {proposal.amount && (
                                  <span className="font-semibold text-green-600">
                                    {proposal.amount.toLocaleString()} FCFA
                                  </span>
                                )}
                              </div>
                              <p className="text-sm">{proposal.description}</p>
                              <p className="text-xs text-muted-foreground mt-2">
                                Proposé le {new Date(proposal.created_at).toLocaleDateString('fr-FR')}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                              <div className="text-center">
                                <div className={`p-2 rounded-full ${
                                  proposal.tenant_accepted === true ? 'bg-green-100' :
                                  proposal.tenant_accepted === false ? 'bg-red-100' :
                                  'bg-gray-100'
                                }`}>
                                  <User className="h-4 w-4 text-gray-600" />
                                </div>
                                <p className="text-xs mt-1">Locataire</p>
                                {proposal.tenant_accepted === true && <ThumbsUp className="h-3 w-3 text-green-600 mx-auto" />}
                                {proposal.tenant_accepted === false && <ThumbsDown className="h-3 w-3 text-red-600 mx-auto" />}
                              </div>
                              <div className="text-center">
                                <div className={`p-2 rounded-full ${
                                  proposal.owner_accepted === true ? 'bg-green-100' :
                                  proposal.owner_accepted === false ? 'bg-red-100' :
                                  'bg-gray-100'
                                }`}>
                                  <Home className="h-4 w-4 text-gray-600" />
                                </div>
                                <p className="text-xs mt-1">Propriétaire</p>
                                {proposal.owner_accepted === true && <ThumbsUp className="h-3 w-3 text-green-600 mx-auto" />}
                                {proposal.owner_accepted === false && <ThumbsDown className="h-3 w-3 text-red-600 mx-auto" />}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Actions rapides</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {dispute.status === 'assigned' && (
                  <Button className="w-full justify-start" onClick={() => updateDisputeStatus('under_mediation')}>
                    <Gavel className="h-4 w-4 mr-2" />
                    Démarrer la médiation
                  </Button>
                )}
                {(dispute.status === 'under_mediation' || dispute.status === 'awaiting_response') && (
                  <>
                    <Button variant="outline" className="w-full justify-start" onClick={() => setShowProposalDialog(true)}>
                      <Send className="h-4 w-4 mr-2" />
                      Faire une proposition
                    </Button>
                    <Button variant="outline" className="w-full justify-start" onClick={() => setShowResolveDialog(true)}>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Résoudre le litige
                    </Button>
                    <Button variant="outline" className="w-full justify-start text-red-600" onClick={() => setShowEscalateDialog(true)}>
                      <ArrowUpCircle className="h-4 w-4 mr-2" />
                      Escalader
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Historique</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-2" />
                    <div>
                      <p className="text-sm font-medium">Litige créé</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(dispute.created_at).toLocaleString('fr-FR')}
                      </p>
                    </div>
                  </div>
                  {dispute.status !== 'assigned' && (
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 rounded-full bg-orange-500 mt-2" />
                      <div>
                        <p className="text-sm font-medium">Médiation démarrée</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(dispute.updated_at).toLocaleString('fr-FR')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Proposal Dialog */}
      <Dialog open={showProposalDialog} onOpenChange={setShowProposalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Faire une proposition de résolution</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Type de proposition</label>
              <select
                value={proposalType}
                onChange={(e) => setProposalType(e.target.value as typeof proposalType)}
                className="w-full mt-1 px-3 py-2 border rounded-lg bg-background"
              >
                <option value="refund">Remboursement</option>
                <option value="compensation">Indemnisation</option>
                <option value="payment_plan">Échelonnement de paiement</option>
                <option value="other">Autre</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Montant (FCFA)</label>
              <Input
                type="number"
                value={proposalAmount}
                onChange={(e) => setProposalAmount(e.target.value)}
                placeholder="Entrez le montant"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={proposalDescription}
                onChange={(e) => setProposalDescription(e.target.value)}
                placeholder="Décrivez votre proposition..."
                rows={4}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProposalDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreateProposal} disabled={!proposalDescription.trim()}>
              <Send className="h-4 w-4 mr-2" />
              Envoyer la proposition
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resolve Dialog */}
      <Dialog open={showResolveDialog} onOpenChange={setShowResolveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Résoudre le litige</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg">
              <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-green-900">Confirmer la résolution</p>
                <p className="text-sm text-green-700 mt-1">
                  Vous êtes sur le point de marquer ce litige comme résolu. Cette action sera visible par toutes les parties impliquées.
                </p>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Notes de résolution</label>
              <Textarea
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Décrivez comment le litige a été résolu..."
                rows={4}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResolveDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleResolve} disabled={!resolutionNotes.trim()} className="bg-green-600 hover:bg-green-700">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Résoudre le litige
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Escalate Dialog */}
      <Dialog open={showEscalateDialog} onOpenChange={setShowEscalateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Escalader le litige</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-900">Attention</p>
                <p className="text-sm text-red-700 mt-1">
                  L'escalade transférera ce litige à un administrateur pour une révision supérieure. Cette action est irréversible.
                </p>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Raison de l'escalade</label>
              <Textarea
                value={escalationReason}
                onChange={(e) => setEscalationReason(e.target.value)}
                placeholder="Expliquez pourquoi ce litige doit être escaladé..."
                rows={4}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEscalateDialog(false)}>
              Annuler
            </Button>
            <Button variant="danger" onClick={handleEscalate} disabled={!escalationReason.trim()}>
              <ArrowUpCircle className="h-4 w-4 mr-2" />
              Escalader
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
