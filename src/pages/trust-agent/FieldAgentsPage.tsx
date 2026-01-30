import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  UserPlus,
  Users,
  Mail,
  Phone,
  MapPin,
  Edit,
  Trash2,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Badge } from '@/shared/ui/badge';
import Input from '@/shared/ui/Input';
import { Textarea } from '@/shared/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/shared/useSafeToast';
import { useAuth } from '@/app/providers/AuthProvider';

interface FieldAgent {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  status: 'active' | 'inactive';
  missions_count: number;
  created_at: string;
}

const STATUS_CONFIG = {
  active: { label: 'Actif', variant: 'default' as const, color: 'bg-green-100 text-green-700' },
  inactive: { label: 'Inactif', variant: 'secondary' as const, color: 'bg-gray-100 text-gray-700' },
};

export default function FieldAgentsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [agents, setAgents] = useState<FieldAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingAgent, setEditingAgent] = useState<FieldAgent | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    notes: '',
  });

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('field_agents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAgents((data || []) as FieldAgent[]);
    } catch (error) {
      console.error('Error loading agents:', error);
      toast.error('Erreur lors du chargement des agents');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      full_name: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      notes: '',
    });
    setEditingAgent(null);
  };

  const handleCreate = async () => {
    // Validation
    if (!formData.full_name.trim()) {
      toast.error('Le nom complet est requis');
      return;
    }
    if (!formData.email.trim()) {
      toast.error('L\'email est requis');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('field_agents').insert({
        full_name: formData.full_name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim() || null,
        address: formData.address.trim() || null,
        city: formData.city.trim() || null,
        status: 'active',
        created_by: user?.id,
      });

      if (error) throw error;

      toast.success('Agent créé avec succès');
      setShowCreateDialog(false);
      resetForm();
      loadAgents();
    } catch (error) {
      console.error('Error creating agent:', error);
      toast.error('Erreur lors de la création de l\'agent');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingAgent) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('field_agents')
        .update({
          full_name: formData.full_name.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.trim() || null,
          address: formData.address.trim() || null,
          city: formData.city.trim() || null,
        })
        .eq('id', editingAgent.id);

      if (error) throw error;

      toast.success('Agent mis à jour avec succès');
      setShowEditDialog(false);
      resetForm();
      loadAgents();
    } catch (error) {
      console.error('Error updating agent:', error);
      toast.error('Erreur lors de la mise à jour de l\'agent');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (agentId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet agent ?')) return;

    try {
      const { error } = await supabase.from('field_agents').delete().eq('id', agentId);
      if (error) throw error;
      toast.success('Agent supprimé avec succès');
      loadAgents();
    } catch (error) {
      console.error('Error deleting agent:', error);
      toast.error('Erreur lors de la suppression de l\'agent');
    }
  };

  const handleToggleStatus = async (agent: FieldAgent) => {
    try {
      const newStatus = agent.status === 'active' ? 'inactive' : 'active';
      const { error } = await supabase
        .from('field_agents')
        .update({ status: newStatus })
        .eq('id', agent.id);

      if (error) throw error;
      toast.success(`Agent ${newStatus === 'active' ? 'activé' : 'désactivé'}`);
      loadAgents();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Erreur lors de la mise à jour du statut');
    }
  };

  const openEditDialog = (agent: FieldAgent) => {
    setEditingAgent(agent);
    setFormData({
      full_name: agent.full_name,
      email: agent.email,
      phone: agent.phone || '',
      address: agent.address || '',
      city: agent.city || '',
      notes: '',
    });
    setShowEditDialog(true);
  };

  const activeCount = agents.filter((a) => a.status === 'active').length;
  const inactiveCount = agents.filter((a) => a.status === 'inactive').length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="small"
                className="p-2 h-auto w-auto"
                onClick={() => navigate('/trust-agent/dashboard')}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-semibold">Agents de Terrain</h1>
                <p className="text-sm text-muted-foreground">
                  Gérez vos agents sur le terrain
                </p>
              </div>
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Nouvel Agent
            </Button>
          </div>
        </div>
      </header>

      <main className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Agents</p>
                  <p className="text-2xl font-bold">{agents.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-xl">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Agents Actifs</p>
                  <p className="text-2xl font-bold">{activeCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gray-100 rounded-xl">
                  <Users className="h-6 w-6 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Agents Inactifs</p>
                  <p className="text-2xl font-bold">{inactiveCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Agents List */}
        <Card>
          <CardHeader>
            <CardTitle>Liste des Agents</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : agents.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-muted-foreground mb-4">Aucun agent de terrain</p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Créer le premier agent
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {agents.map((agent) => {
                  const statusConfig = STATUS_CONFIG[agent.status];
                  return (
                    <div
                      key={agent.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                          <Users className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">{agent.full_name}</p>
                            <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {agent.email}
                            </span>
                            {agent.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {agent.phone}
                              </span>
                            )}
                            {agent.city && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {agent.city}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="small"
                          variant="outline"
                          onClick={() => handleToggleStatus(agent)}
                        >
                          {agent.status === 'active' ? 'Désactiver' : 'Activer'}
                        </Button>
                        <Button
                          size="small"
                          variant="ghost"
                          onClick={() => openEditDialog(agent)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="small"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDelete(agent.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Créer un Agent de Terrain</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nom complet *</label>
              <Input
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="Jean Kouassi"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email *</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="jean.kouassi@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Téléphone</label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+225 01 02 03 04 05"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Adresse</label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Rue et numéro"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Ville</label>
              <Input
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Abidjan, Cocody"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreateDialog(false); resetForm(); }}>
              Annuler
            </Button>
            <Button onClick={handleCreate} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier l'Agent</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nom complet *</label>
              <Input
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="Jean Kouassi"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email *</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="jean.kouassi@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Téléphone</label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+225 01 02 03 04 05"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Adresse</label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Rue et numéro"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Ville</label>
              <Input
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Abidjan, Cocody"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowEditDialog(false); resetForm(); }}>
              Annuler
            </Button>
            <Button onClick={handleUpdate} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
