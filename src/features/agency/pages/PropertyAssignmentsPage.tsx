import { useState, useEffect, ChangeEvent } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/app/providers/AuthProvider';
import {
  Button,
  Input,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui';
import { toast } from 'sonner';
import { Building2, Search, Plus, UserPlus, X, Home, MapPin, Coins, User } from 'lucide-react';

interface Assignment {
  id: string;
  property_id: string;
  agent_id: string;
  assignment_type: string | null;
  status: string | null;
  start_date: string | null;
  commission_override: number | null;
  properties: {
    id: string;
    title: string;
    city: string | null;
    neighborhood: string | null;
    monthly_rent: number;
    main_image: string | null;
  } | null;
  agent: {
    id: string;
    email: string | null;
    profiles: {
      full_name: string | null;
      avatar_url: string | null;
    } | null;
  } | null;
}

interface Agent {
  id: string;
  email: string | null;
  profiles: {
    full_name: string | null;
  } | null;
}

interface Property {
  id: string;
  title: string;
  city: string | null;
  monthly_rent: number;
}

export default function PropertyAssignmentsPage() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [unassignedProperties, setUnassignedProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [agencyId, setAgencyId] = useState<string | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  const [selectedAgent, setSelectedAgent] = useState<string>('');

  useEffect(() => {
    loadAgency();
  }, [user]);

  const loadAgency = async () => {
    if (!user) return;

    const { data: agency } = await supabase
      .from('agencies')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (agency) {
      setAgencyId(agency.id);
      await Promise.all([
        loadAssignments(agency.id),
        loadAgents(agency.id),
        loadUnassignedProperties(agency.id),
      ]);
    }
    setLoading(false);
  };

  const loadAssignments = async (agencyIdParam: string) => {
    const { data, error } = await supabase
      .from('property_assignments')
      .select(
        `
        *,
        properties:property_id(id, title, city, neighborhood, monthly_rent, main_image),
        agent:agent_id(id, email, profiles:user_id(full_name, avatar_url))
      `
      )
      .eq('agency_id', agencyIdParam)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading assignments:', error);
      return;
    }

    setAssignments((data as Assignment[]) || []);
  };

  const loadAgents = async (agencyIdParam: string) => {
    const { data } = await supabase
      .from('agency_agents')
      .select('id, email, profiles:user_id(full_name)')
      .eq('agency_id', agencyIdParam)
      .eq('status', 'active');

    setAgents((data as Agent[]) || []);
  };

  const loadUnassignedProperties = async (agencyIdParam: string) => {
    // Get properties managed by agency that aren't assigned
    const { data: mandates } = await supabase
      .from('agency_mandates')
      .select('property_id')
      .eq('agency_id', agencyIdParam)
      .eq('status', 'active');

    const propertyIds =
      mandates?.map((m) => m.property_id).filter((id): id is string => id !== null) || [];

    if (propertyIds.length === 0) {
      setUnassignedProperties([]);
      return;
    }

    const { data: assigned } = await supabase
      .from('property_assignments')
      .select('property_id')
      .eq('agency_id', agencyIdParam)
      .eq('status', 'active');

    const assignedIds = assigned?.map((a) => a.property_id) || [];
    const unassignedIds = propertyIds.filter((id) => !assignedIds.includes(id));

    if (unassignedIds.length === 0) {
      setUnassignedProperties([]);
      return;
    }

    const { data: properties } = await supabase
      .from('properties_with_monthly_rent')
      .select('id, title, city, monthly_rent')
      .in('id', unassignedIds);

    setUnassignedProperties(properties || []);
  };

  const handleAssign = async () => {
    if (!agencyId || !selectedProperty || !selectedAgent) {
      toast.error('Veuillez sélectionner une propriété et un agent');
      return;
    }

    try {
      const { error } = await supabase.from('property_assignments').insert({
        agency_id: agencyId,
        property_id: selectedProperty,
        agent_id: selectedAgent,
        assigned_by: user?.id,
        assignment_type: 'exclusive',
        status: 'active',
      });

      if (error) throw error;

      toast.success('Propriété assignée avec succès');
      setShowAssignModal(false);
      setSelectedProperty('');
      setSelectedAgent('');

      await Promise.all([loadAssignments(agencyId), loadUnassignedProperties(agencyId)]);
    } catch (error) {
      console.error('Error assigning:', error);
      toast.error("Erreur lors de l'assignation");
    }
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    if (!agencyId) return;

    try {
      const { error } = await supabase
        .from('property_assignments')
        .update({ status: 'terminated' })
        .eq('id', assignmentId);

      if (error) throw error;

      toast.success('Assignation retirée');
      await Promise.all([loadAssignments(agencyId), loadUnassignedProperties(agencyId)]);
    } catch (error) {
      console.error('Error removing:', error);
      toast.error('Erreur');
    }
  };

  const filteredAssignments = assignments.filter(
    (a) =>
      a.properties?.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.properties?.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.agent?.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF7F4] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F4] py-8">
      <div className="w-full mx-auto px-4 w-fullxl">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#2C1810]">Attributions des propriétés</h1>
            <p className="text-[#2C1810]/60 mt-1">Gérez l'assignation des propriétés aux agents</p>
          </div>
          <Button
            onClick={() => setShowAssignModal(true)}
            className="bg-[#F16522] hover:bg-[#D14E12]"
            disabled={unassignedProperties.length === 0 || agents.length === 0}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle assignation
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-white border-[#EFEBE9]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <Building2 className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#2C1810]">{assignments.length}</p>
                  <p className="text-sm text-[#2C1810]/60">Assignées</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-[#EFEBE9]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-100">
                  <Home className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#2C1810]">{unassignedProperties.length}</p>
                  <p className="text-sm text-[#2C1810]/60">Non assignées</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-[#EFEBE9]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100">
                  <User className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#2C1810]">{agents.length}</p>
                  <p className="text-sm text-[#2C1810]/60">Agents actifs</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-[#EFEBE9]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#F16522]/10">
                  <Coins className="w-5 h-5 text-[#F16522]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#2C1810]">
                    {assignments
                      .reduce((sum, a) => sum + (a.properties?.monthly_rent || 0), 0)
                      .toLocaleString()}
                  </p>
                  <p className="text-sm text-[#2C1810]/60">Loyers/mois</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#2C1810]/40" />
          <Input
            placeholder="Rechercher une propriété ou un agent..."
            value={searchQuery}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            className="pl-10 border-[#EFEBE9]"
          />
        </div>

        {/* Assignments Grid */}
        {filteredAssignments.length === 0 ? (
          <Card className="bg-white border-[#EFEBE9]">
            <CardContent className="p-12 text-center">
              <Building2 className="w-12 h-12 mx-auto text-[#2C1810]/20 mb-4" />
              <h3 className="text-lg font-semibold text-[#2C1810] mb-2">Aucune assignation</h3>
              <p className="text-[#2C1810]/60 mb-4">Assignez des propriétés à vos agents</p>
              {unassignedProperties.length > 0 && agents.length > 0 && (
                <Button onClick={() => setShowAssignModal(true)} variant="outline">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Première assignation
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAssignments.map((assignment) => (
              <Card key={assignment.id} className="bg-white border-[#EFEBE9] overflow-hidden">
                <div className="h-40 bg-[#FAF7F4] relative">
                  {assignment.properties?.main_image ? (
                    <img
                      src={assignment.properties.main_image}
                      alt={assignment.properties.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Home className="w-12 h-12 text-[#2C1810]/20" />
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="small"
                    className="absolute top-2 right-2 bg-white/80 hover:bg-white p-2 min-h-0"
                    onClick={() => handleRemoveAssignment(assignment.id)}
                  >
                    <X className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-[#2C1810] mb-1">
                    {assignment.properties?.title}
                  </h3>
                  <div className="flex items-center gap-1 text-sm text-[#2C1810]/60 mb-3">
                    <MapPin className="w-3 h-3" />
                    {assignment.properties?.city}
                    {assignment.properties?.neighborhood &&
                      `, ${assignment.properties.neighborhood}`}
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-[#EFEBE9]">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[#F16522]/10 flex items-center justify-center">
                        {assignment.agent?.profiles?.avatar_url ? (
                          <img
                            src={assignment.agent.profiles.avatar_url}
                            alt=""
                            className="w-8 h-8 rounded-full"
                          />
                        ) : (
                          <User className="w-4 h-4 text-[#F16522]" />
                        )}
                      </div>
                      <span className="text-sm text-[#2C1810]">
                        {assignment.agent?.profiles?.full_name || assignment.agent?.email}
                      </span>
                    </div>
                    <span className="font-semibold text-[#F16522]">
                      {assignment.properties?.monthly_rent.toLocaleString()} F
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Assign Modal */}
        <Dialog open={showAssignModal} onOpenChange={setShowAssignModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Assigner une propriété</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-[#2C1810] mb-2 block">Propriété</label>
                <Select value={selectedProperty} onValueChange={setSelectedProperty}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une propriété" />
                  </SelectTrigger>
                  <SelectContent>
                    {unassignedProperties.map((property) => (
                      <SelectItem key={property.id} value={property.id}>
                        {property.title} - {property.city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-[#2C1810] mb-2 block">Agent</label>
                <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un agent" />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.profiles?.full_name || agent.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAssignModal(false)}>
                Annuler
              </Button>
              <Button onClick={handleAssign} className="bg-[#F16522] hover:bg-[#D14E12]">
                Assigner
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
