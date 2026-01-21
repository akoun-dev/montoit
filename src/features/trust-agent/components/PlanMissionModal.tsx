import { useState, useEffect } from 'react';
import { Calendar, Clock, Home, FileText, AlertTriangle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/app/providers/AuthProvider';
import Modal from '@/shared/ui/Modal';
import { Button } from '@/shared/ui/Button';
import Input from '@/shared/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';

interface Property {
  id: string;
  title: string;
  city: string;
  address: string | null;
}

interface PlanMissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate: Date;
  onMissionCreated: () => void;
}

const MISSION_TYPES = [
  { value: 'cev', label: 'CEV Complète', icon: '🏠' },
  { value: 'photos', label: 'Photos', icon: '📷' },
  { value: 'documents', label: 'Documents', icon: '📄' },
  { value: 'etat_lieux', label: 'État des Lieux', icon: '📋' },
  { value: 'verification', label: 'Vérification', icon: '✅' },
];

const URGENCY_LEVELS = [
  { value: 'urgent', label: 'Urgente', icon: '🔴' },
  { value: 'high', label: 'Haute', icon: '🟠' },
  { value: 'medium', label: 'Moyenne', icon: '🟡' },
  { value: 'low', label: 'Basse', icon: '🟢' },
];

export default function PlanMissionModal({
  isOpen,
  onClose,
  initialDate,
  onMissionCreated,
}: PlanMissionModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(false);

  // Form state
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('10:00');
  const [propertyId, setPropertyId] = useState('');
  const [missionType, setMissionType] = useState('cev');
  const [urgency, setUrgency] = useState('medium');
  const [notes, setNotes] = useState('');

  // Load properties on mount
  useEffect(() => {
    if (isOpen) {
      loadProperties();
      setScheduledDate(format(initialDate, 'yyyy-MM-dd'));
    }
  }, [isOpen, initialDate]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setScheduledTime('10:00');
      setPropertyId('');
      setMissionType('cev');
      setUrgency('medium');
      setNotes('');
    }
  }, [isOpen]);

  const loadProperties = async () => {
    setLoadingProperties(true);
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('id, title, city, address')
        .order('title', { ascending: true });

      if (error) throw error;
      setProperties(data || []);
    } catch (error) {
      console.error('Error loading properties:', error);
      toast.error('Erreur lors du chargement des propriétés');
    } finally {
      setLoadingProperties(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('Vous devez être connecté');
      return;
    }

    if (!propertyId) {
      toast.error('Veuillez sélectionner une propriété');
      return;
    }

    if (!scheduledDate) {
      toast.error('Veuillez sélectionner une date');
      return;
    }

    setLoading(true);

    try {
      const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}:00`);

      const { error } = await supabase.from('cev_missions').insert({
        assigned_agent_id: user.id,
        property_id: propertyId,
        mission_type: missionType,
        urgency: urgency,
        status: 'pending',
        scheduled_date: scheduledDateTime.toISOString(),
        notes: notes.trim() || null,
        created_by: user.id,
      });

      if (error) throw error;

      toast.success('Mission planifiée avec succès');
      onMissionCreated();
      onClose();
    } catch (error) {
      console.error('Error creating mission:', error);
      toast.error('Erreur lors de la création de la mission');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <span>Planifier une Mission</span>
        </div>
      }
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Date */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            Date <span className="text-destructive">*</span>
          </label>
          <Input
            type="date"
            value={scheduledDate}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setScheduledDate(e.target.value)}
            min={format(new Date(), 'yyyy-MM-dd')}
            required
          />
        </div>

        {/* Time */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Heure <span className="text-destructive">*</span>
          </label>
          <Input
            type="time"
            value={scheduledTime}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setScheduledTime(e.target.value)}
            required
          />
        </div>

        {/* Property */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Home className="h-4 w-4 text-muted-foreground" />
            Propriété <span className="text-destructive">*</span>
          </label>
          <Select value={propertyId} onValueChange={setPropertyId}>
            <SelectTrigger className="w-full bg-background">
              <SelectValue
                placeholder={loadingProperties ? 'Chargement...' : 'Sélectionner une propriété'}
              />
            </SelectTrigger>
            <SelectContent className="bg-background border shadow-lg z-50">
              {properties.map((property) => (
                <SelectItem key={property.id} value={property.id}>
                  <div className="flex flex-col">
                    <span>{property.title}</span>
                    <span className="text-xs text-muted-foreground">{property.city}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Mission Type */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-foreground">
            <FileText className="h-4 w-4 text-muted-foreground" />
            Type de Mission <span className="text-destructive">*</span>
          </label>
          <Select value={missionType} onValueChange={setMissionType}>
            <SelectTrigger className="w-full bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background border shadow-lg z-50">
              {MISSION_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  <span className="flex items-center gap-2">
                    <span>{type.icon}</span>
                    <span>{type.label}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Urgency */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-foreground">
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            Urgence <span className="text-destructive">*</span>
          </label>
          <Select value={urgency} onValueChange={setUrgency}>
            <SelectTrigger className="w-full bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background border shadow-lg z-50">
              {URGENCY_LEVELS.map((level) => (
                <SelectItem key={level.value} value={level.value}>
                  <span className="flex items-center gap-2">
                    <span>{level.icon}</span>
                    <span>{level.label}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Notes <span className="text-muted-foreground">(optionnel)</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Instructions spéciales, détails importants..."
            className="w-full min-h-[80px] px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button type="submit" disabled={loading || !propertyId}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Création...
              </>
            ) : (
              <>
                <Calendar className="h-4 w-4 mr-2" />
                Planifier
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
