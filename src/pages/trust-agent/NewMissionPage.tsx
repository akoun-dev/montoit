import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ClipboardList,
  Camera,
  FileCheck,
  Home,
  Calendar,
  MapPin,
  User,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Badge } from '@/shared/ui/badge';
import Input from '@/shared/ui/Input';
import { Textarea } from '@/shared/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/shared/useSafeToast';
import { AddressValue, formatAddress } from '@/shared/utils/address';

// Types
interface Property {
  id: string;
  title: string;
  address: AddressValue;
  city: string;
  owner_id: string;
}

interface FieldAgent {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  missions_count: number;
}

const MISSION_TYPES = [
  { value: 'cev_complete', label: 'CEV Complète', icon: ClipboardList, description: 'Vérification complète du bien' },
  { value: 'cev_property', label: 'CEV Propriété', icon: Home, description: 'Vérification de la propriété' },
  { value: 'cev_tenant', label: 'CEV Locataire', icon: User, description: 'Vérification du locataire' },
  { value: 'photos', label: 'Vérification Photos', icon: Camera, description: 'Capture de photos du bien' },
  { value: 'documents', label: 'Validation Documents', icon: FileCheck, description: 'Vérification des documents' },
  { value: 'etat_lieux', label: 'État des Lieux', icon: Home, description: 'État des lieux entrant/sortant' },
];

const URGENCY_LEVELS = [
  { value: 'low', label: 'Basse', color: 'text-gray-600', description: 'Pas urgent' },
  { value: 'medium', label: 'Moyenne', color: 'text-amber-600', description: 'Traitement normal' },
  { value: 'high', label: 'Haute', color: 'text-orange-600', description: 'Prioritaire' },
  { value: 'urgent', label: 'Urgente', color: 'text-red-600', description: 'Immédiat' },
];

export default function NewMissionPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [missionType, setMissionType] = useState<string>('cev_complete');
  const [urgency, setUrgency] = useState<string>('medium');
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [scheduledDate, setScheduledDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Data
  const [properties, setProperties] = useState<Property[]>([]);
  const [agents, setAgents] = useState<FieldAgent[]>([]);

  useEffect(() => {
    loadProperties();
    loadAgents();
  }, []);

  const loadProperties = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('id, title, address, city, owner_id')
        .eq('status', 'disponible')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProperties((data || []) as Property[]);
    } catch (error) {
      console.error('Error loading properties:', error);
      toast.error('Erreur lors du chargement des propriétés');
    }
  };

  const loadAgents = async () => {
    try {
      // Load field agents from the field_agents table
      const { data, error } = await supabase
        .from('field_agents')
        .select('id, full_name, email, phone, status')
        .eq('status', 'active')
        .order('full_name');

      if (error) throw error;
      setAgents((data || []) as FieldAgent[]);
    } catch (error) {
      console.error('Error loading agents:', error);
      toast.error('Erreur lors du chargement des agents');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!selectedProperty) {
      toast.error('Veuillez sélectionner une propriété');
      return;
    }
    if (!selectedAgent) {
      toast.error('Veuillez sélectionner un agent');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('cev_missions')
        .insert({
          property_id: selectedProperty,
          mission_type: missionType,
          status: 'assigned',
          urgency,
          assigned_agent_id: selectedAgent,
          scheduled_date: scheduledDate || null,
          notes: notes || null,
          verification_checklist: [],
          photos: [],
          documents: {},
        });

      if (error) throw error;

      toast.success('Mission créée avec succès');
      navigate('/trust-agent/missions');
    } catch (error) {
      console.error('Error creating mission:', error);
      toast.error('Erreur lors de la création de la mission');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedMissionType = MISSION_TYPES.find((t) => t.value === missionType);
  const selectedUrgency = URGENCY_LEVELS.find((u) => u.value === urgency);
  const SelectedMissionIcon = selectedMissionType?.icon || ClipboardList;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b sticky top-0 z-10">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="small"
                className="p-2 h-auto w-auto"
                onClick={() => navigate('/trust-agent/missions')}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-semibold">Créer une Nouvelle Mission</h1>
                <p className="text-sm text-muted-foreground">Assignez une mission à un agent de terrain</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {/* Mission Type */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ClipboardList className="h-5 w-5" />
                      Type de Mission
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {MISSION_TYPES.map((type) => {
                        const Icon = type.icon;
                        const isSelected = missionType === type.value;
                        return (
                          <button
                            key={type.value}
                            onClick={() => setMissionType(type.value)}
                            className={`p-4 rounded-lg border-2 text-left transition-all ${
                              isSelected
                                ? 'border-primary bg-primary/5'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`p-2 rounded-lg ${isSelected ? 'bg-primary/10' : 'bg-gray-100'}`}>
                                <Icon className={`h-5 w-5 ${isSelected ? 'text-primary' : 'text-gray-600'}`} />
                              </div>
                              <div className="flex-1">
                                <p className="font-medium">{type.label}</p>
                                <p className="text-sm text-muted-foreground">{type.description}</p>
                              </div>
                              {isSelected && (
                                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Property Selection */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Home className="h-5 w-5" />
                      Propriété
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {properties.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Home className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>Aucune propriété disponible</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <label className="block text-sm font-medium mb-2">Sélectionner une propriété</label>
                        <select
                          value={selectedProperty}
                          onChange={(e) => setSelectedProperty(e.target.value)}
                          className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="">-- Choisir une propriété --</option>
                          {properties.map((property) => (
                            <option key={property.id} value={property.id}>
                              {property.title} - {property.city}
                            </option>
                          ))}
                        </select>
                        {selectedProperty && (
                          <div className="mt-4 p-4 bg-muted rounded-lg">
                            <div className="flex items-start gap-3">
                              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                              <div className="flex-1">
                                <p className="font-medium">
                                  {properties.find((p) => p.id === selectedProperty)?.title}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {formatAddress(
                                    properties.find((p) => p.id === selectedProperty)?.address,
                                    properties.find((p) => p.id === selectedProperty)?.city
                                  )}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Agent Assignment */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Agent Assigné
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {agents.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <User className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>Aucun agent disponible</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <label className="block text-sm font-medium mb-2">Sélectionner un agent</label>
                        <select
                          value={selectedAgent}
                          onChange={(e) => setSelectedAgent(e.target.value)}
                          className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="">-- Choisir un agent --</option>
                          {agents.map((agent) => (
                            <option key={agent.id} value={agent.id}>
                              {agent.full_name} - {agent.email}
                            </option>
                          ))}
                        </select>
                        {selectedAgent && (
                          <div className="mt-4 p-4 bg-muted rounded-lg">
                            <div className="flex items-start gap-3">
                              <div className="p-2 bg-primary/10 rounded-lg">
                                <User className="h-5 w-5 text-primary" />
                              </div>
                              <div className="flex-1">
                                <p className="font-medium">
                                  {agents.find((a) => a.id === selectedAgent)?.full_name}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {agents.find((a) => a.id === selectedAgent)?.email}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {agents.find((a) => a.id === selectedAgent)?.phone || 'Non renseigné'}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Notes */}
                <Card>
                  <CardHeader>
                    <CardTitle>Instructions & Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      placeholder="Ajoutez des instructions spécifiques pour cette mission..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={4}
                    />
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Urgency */}
            <Card>
              <CardHeader>
                <CardTitle>Urgence</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {URGENCY_LEVELS.map((level) => (
                    <button
                      key={level.value}
                      onClick={() => setUrgency(level.value)}
                      className={`w-full p-3 rounded-lg border-2 text-left transition-all flex items-center gap-3 ${
                        urgency === level.value
                          ? 'border-current bg-current/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div
                        className={`w-3 h-3 rounded-full ${
                          urgency === level.value ? 'bg-current' : 'bg-gray-300'
                        }`}
                      />
                      <div className="flex-1">
                        <p className={`font-medium ${urgency === level.value ? level.color : ''}`}>
                          {level.label}
                        </p>
                        <p className="text-xs text-muted-foreground">{level.description}</p>
                      </div>
                      {urgency === level.value && (
                        <CheckCircle2 className={`h-5 w-5 ${level.color} flex-shrink-0`} />
                      )}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Scheduled Date */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Date Planifiée
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Input
                  type="datetime-local"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Laissez vide pour une mission sans date fixe
                </p>
              </CardContent>
            </Card>

            {/* Summary */}
            <Card className="bg-muted">
              <CardHeader>
                <CardTitle className="text-sm">Résumé de la Mission</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-2">
                  <SelectedMissionIcon className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Type</p>
                    <p className="text-sm font-medium">{selectedMissionType?.label}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <AlertCircle className={`h-4 w-4 ${selectedUrgency?.color} mt-0.5`} />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Urgence</p>
                    <p className={`text-sm font-medium ${selectedUrgency?.color}`}>
                      {selectedUrgency?.label}
                    </p>
                  </div>
                </div>
                {selectedProperty && (
                  <div className="flex items-start gap-2">
                    <Home className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Propriété</p>
                      <p className="text-sm font-medium">
                        {properties.find((p) => p.id === selectedProperty)?.title}
                      </p>
                    </div>
                  </div>
                )}
                {selectedAgent && (
                  <div className="flex items-start gap-2">
                    <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Agent</p>
                      <p className="text-sm font-medium">
                        {agents.find((a) => a.id === selectedAgent)?.full_name}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Submit Button */}
            <Button
              onClick={handleSubmit}
              disabled={submitting || !selectedProperty || !selectedAgent}
              className="w-full"
              size="lg"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Création...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Créer la Mission
                </>
              )}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
