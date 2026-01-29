import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  History,
  Plus,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  Building,
  Calendar,
  MapPin,
  Phone,
  Star,
  Trash2,
  Edit2,
  TrendingUp,
  FileText,
} from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/badge';
import Button from '@/shared/ui/Button';
import { Skeleton } from '@/shared/ui/Skeleton';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface RentalHistoryItem {
  id: string;
  property_address: string;
  city: string;
  property_type: string;
  monthly_rent: number;
  start_date: string;
  end_date: string | null;
  is_current: boolean;
  landlord_name: string | null;
  landlord_phone: string | null;
  landlord_email: string | null;
  verification_status: 'pending' | 'verified' | 'rejected' | 'unverifiable';
  self_payment_rating: number | null;
  self_condition_rating: number | null;
  departure_reason: string | null;
  proof_documents: string[];
  created_at: string;
}

const PROPERTY_TYPES = [
  { value: 'appartement', label: 'Appartement' },
  { value: 'maison', label: 'Maison' },
  { value: 'studio', label: 'Studio' },
  { value: 'villa', label: 'Villa' },
  { value: 'duplex', label: 'Duplex' },
  { value: 'chambre', label: 'Chambre' },
];

const CITIES = [
  'Abidjan',
  'Cocody',
  'Plateau',
  'Marcory',
  'Treichville',
  'Yopougon',
  'Abobo',
  'Koumassi',
  'Adjamé',
  'Port-Bouët',
  'Bingerville',
  'Grand-Bassam',
  'Yamoussoukro',
  'Bouaké',
  'San Pedro',
  'Daloa',
  'Korhogo',
  'Man',
  'Autre',
];

const RentalHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [history, setHistory] = useState<RentalHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    property_address: '',
    city: 'Abidjan',
    property_type: 'appartement',
    monthly_rent: '',
    start_date: '',
    end_date: '',
    is_current: false,
    landlord_name: '',
    landlord_phone: '',
    landlord_email: '',
    self_payment_rating: 5,
    self_condition_rating: 5,
    departure_reason: '',
  });

  useEffect(() => {
    if (user?.id) {
      loadHistory();
    }
  }, [user?.id]);

  const loadHistory = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('rental_history')
        .select('*')
        .eq('tenant_id', user.id)
        .order('start_date', { ascending: false });

      if (error) throw error;
      setHistory((data || []) as RentalHistoryItem[]);
    } catch (error) {
      console.error('Error loading rental history:', error);
      toast.error("Erreur lors du chargement de l'historique");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      property_address: '',
      city: 'Abidjan',
      property_type: 'appartement',
      monthly_rent: '',
      start_date: '',
      end_date: '',
      is_current: false,
      landlord_name: '',
      landlord_phone: '',
      landlord_email: '',
      self_payment_rating: 5,
      self_condition_rating: 5,
      departure_reason: '',
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    setSubmitting(true);
    try {
      const payload = {
        tenant_id: user.id,
        property_address: formData.property_address,
        city: formData.city,
        property_type: formData.property_type,
        monthly_rent: parseInt(formData.monthly_rent),
        start_date: formData.start_date,
        end_date: formData.is_current ? null : formData.end_date || null,
        is_current: formData.is_current,
        landlord_name: formData.landlord_name || null,
        landlord_phone: formData.landlord_phone || null,
        landlord_email: formData.landlord_email || null,
        self_payment_rating: formData.self_payment_rating,
        self_condition_rating: formData.self_condition_rating,
        departure_reason: formData.departure_reason || null,
        verification_status: 'pending' as const,
      };

      if (editingId) {
        const { error } = await supabase.from('rental_history').update(payload).eq('id', editingId);
        if (error) throw error;
        toast.success('Location mise à jour');
      } else {
        const { error } = await supabase.from('rental_history').insert(payload);
        if (error) throw error;
        toast.success('Location ajoutée');
      }

      resetForm();
      loadHistory();
    } catch (error) {
      console.error('Error saving rental history:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (item: RentalHistoryItem) => {
    setFormData({
      property_address: item.property_address,
      city: item.city,
      property_type: item.property_type,
      monthly_rent: item.monthly_rent.toString(),
      start_date: item.start_date,
      end_date: item.end_date || '',
      is_current: item.is_current,
      landlord_name: item.landlord_name || '',
      landlord_phone: item.landlord_phone || '',
      landlord_email: item.landlord_email || '',
      self_payment_rating: item.self_payment_rating || 5,
      self_condition_rating: item.self_condition_rating || 5,
      departure_reason: item.departure_reason || '',
    });
    setEditingId(item.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette location ?')) return;

    try {
      const { error } = await supabase.from('rental_history').delete().eq('id', id);
      if (error) throw error;
      toast.success('Location supprimée');
      loadHistory();
    } catch (error) {
      console.error('Error deleting rental history:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return (
          <Badge variant="success" className="gap-1">
            <CheckCircle className="h-3 w-3" /> Vérifié
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" /> En attente
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" /> Rejeté
          </Badge>
        );
      case 'unverifiable':
        return (
          <Badge variant="outline" className="gap-1">
            <AlertTriangle className="h-3 w-3" /> Non vérifiable
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const calculateScoreImpact = () => {
    let bonus = 0;
    history.forEach((item) => {
      if (item.verification_status === 'verified') {
        const months = item.end_date
          ? Math.ceil(
              (new Date(item.end_date).getTime() - new Date(item.start_date).getTime()) /
                (1000 * 60 * 60 * 24 * 30)
            )
          : Math.ceil(
              (Date.now() - new Date(item.start_date).getTime()) / (1000 * 60 * 60 * 24 * 30)
            );
        bonus += Math.min(months * 2, 20);
      } else if (item.verification_status === 'pending') {
        bonus += 5;
      } else if (item.verification_status === 'unverifiable') {
        bonus += 2;
      }
    });
    return Math.min(bonus, 50);
  };

  if (loading) {
    return (
      <div>
        <div className="w-full space-y-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="w-full">
        {/* Header Banner */}
        <div className="bg-[#2C1810] rounded-[20px] p-6 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#F16522] flex items-center justify-center flex-shrink-0">
                <History className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white">Historique des Locations</h1>
                <p className="text-[#E8D4C5] mt-1">
                  Ajoutez vos locations passées pour améliorer votre Trust Score
                </p>
              </div>
            </div>
            {!showForm && (
              <Button
                onClick={() => setShowForm(true)}
                className="bg-[#F16522] hover:bg-[#d9571d] gap-2 self-start"
              >
                Ajouter une location
              </Button>
            )}
          </div>
        </div>

        {/* Score Impact Card */}
        <Card className="mb-6 bg-gradient-to-r from-primary-50 to-primary-100 border-primary-200">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-500 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-primary-900">Impact sur votre score</p>
                  <p className="text-sm text-primary-700">
                    {history.length} location{history.length > 1 ? 's' : ''} déclarée
                    {history.length > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-primary-600">+{calculateScoreImpact()}</p>
                <p className="text-xs text-primary-600">points potentiels</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Add/Edit Form */}
        {showForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5 text-primary" />
                {editingId ? 'Modifier la location' : 'Ajouter une location'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Property Info */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium mb-1">Adresse du bien *</label>
                    <input
                      type="text"
                      required
                      value={formData.property_address}
                      onChange={(e) =>
                        setFormData({ ...formData, property_address: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Ex: Cocody Riviera 3, Rue des Jardins"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Ville *</label>
                    <select
                      required
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      {CITIES.map((city) => (
                        <option key={city} value={city}>
                          {city}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Type de bien *</label>
                    <select
                      required
                      value={formData.property_type}
                      onChange={(e) => setFormData({ ...formData, property_type: e.target.value })}
                      className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      {PROPERTY_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Loyer mensuel (FCFA) *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={formData.monthly_rent}
                      onChange={(e) => setFormData({ ...formData, monthly_rent: e.target.value })}
                      className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="150000"
                    />
                  </div>
                </div>

                {/* Dates */}
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Date de début *</label>
                    <input
                      type="date"
                      required
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Date de fin</label>
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      disabled={formData.is_current}
                      className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-neutral-100"
                    />
                  </div>

                  <div className="flex items-end">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.is_current}
                        onChange={(e) =>
                          setFormData({ ...formData, is_current: e.target.checked, end_date: '' })
                        }
                        className="w-4 h-4 text-primary-500 rounded focus:ring-primary-500"
                      />
                      <span className="text-sm font-medium">Location actuelle</span>
                    </label>
                  </div>
                </div>

                {/* Landlord Info */}
                <div className="border-t pt-4">
                  <p className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Coordonnées du propriétaire (optionnel - pour vérification)
                  </p>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">Nom</label>
                      <input
                        type="text"
                        value={formData.landlord_name}
                        onChange={(e) =>
                          setFormData({ ...formData, landlord_name: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Nom du propriétaire"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Téléphone</label>
                      <input
                        type="tel"
                        value={formData.landlord_phone}
                        onChange={(e) =>
                          setFormData({ ...formData, landlord_phone: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="07 XX XX XX XX"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Email</label>
                      <input
                        type="email"
                        value={formData.landlord_email}
                        onChange={(e) =>
                          setFormData({ ...formData, landlord_email: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="email@exemple.com"
                      />
                    </div>
                  </div>
                </div>

                {/* Self Rating */}
                <div className="border-t pt-4">
                  <p className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                    <Star className="h-4 w-4" />
                    Auto-évaluation
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Ponctualité des paiements
                      </label>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((rating) => (
                          <button
                            key={rating}
                            type="button"
                            onClick={() =>
                              setFormData({ ...formData, self_payment_rating: rating })
                            }
                            className={`p-2 rounded ${
                              formData.self_payment_rating >= rating
                                ? 'text-yellow-500'
                                : 'text-neutral-300'
                            }`}
                          >
                            <Star className="h-6 w-6 fill-current" />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Entretien du bien</label>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((rating) => (
                          <button
                            key={rating}
                            type="button"
                            onClick={() =>
                              setFormData({ ...formData, self_condition_rating: rating })
                            }
                            className={`p-2 rounded ${
                              formData.self_condition_rating >= rating
                                ? 'text-yellow-500'
                                : 'text-neutral-300'
                            }`}
                          >
                            <Star className="h-6 w-6 fill-current" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Departure Reason */}
                {!formData.is_current && (
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Raison du départ (optionnel)
                    </label>
                    <textarea
                      value={formData.departure_reason}
                      onChange={(e) =>
                        setFormData({ ...formData, departure_reason: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      rows={2}
                      placeholder="Ex: Déménagement pour raisons professionnelles"
                    />
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 justify-end pt-4 border-t">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Annuler
                  </Button>
                  <Button type="submit" loading={submitting}>
                    {editingId ? 'Mettre à jour' : 'Ajouter'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* History List */}
        {history.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucun historique de location</h3>
              <p className="text-muted-foreground mb-4">
                Ajoutez vos locations passées pour améliorer votre Trust Score
              </p>
              <Button onClick={() => setShowForm(true)} className="gap-2">
                Ajouter ma première location
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {history.map((item) => (
              <Card key={item.id} className="overflow-hidden">
                <CardContent className="py-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    {/* Info */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Building className="h-5 w-5 text-primary" />
                          <h3 className="font-semibold">{item.property_address}</h3>
                        </div>
                        {getStatusBadge(item.verification_status)}
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mb-3">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {item.city}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(item.start_date), 'MMM yyyy', { locale: fr })}
                          {' → '}
                          {item.is_current
                            ? 'Actuel'
                            : item.end_date
                              ? format(new Date(item.end_date), 'MMM yyyy', { locale: fr })
                              : 'N/A'}
                        </span>
                        <span className="font-medium text-neutral-700">
                          {item.monthly_rent.toLocaleString('fr-FR')} FCFA/mois
                        </span>
                      </div>

                      {/* Self ratings */}
                      <div className="flex gap-4 text-sm">
                        <span className="flex items-center gap-1">
                          Paiement:
                          {[...Array(item.self_payment_rating || 0)].map((_, i) => (
                            <Star key={i} className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                          ))}
                        </span>
                        <span className="flex items-center gap-1">
                          Entretien:
                          {[...Array(item.self_condition_rating || 0)].map((_, i) => (
                            <Star key={i} className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                          ))}
                        </span>
                      </div>

                      {item.landlord_name && (
                        <p className="text-sm text-muted-foreground mt-2">
                          Propriétaire: {item.landlord_name}
                          {item.landlord_phone && ` • ${item.landlord_phone}`}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    {item.verification_status === 'pending' && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="small"
                          onClick={() => handleEdit(item)}
                          className="gap-1"
                        >
                          <Edit2 className="h-4 w-4" />
                          Modifier
                        </Button>
                        <Button
                          variant="ghost"
                          size="small"
                          onClick={() => handleDelete(item.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Info Card */}
        <Card className="mt-6">
          <CardContent className="py-4">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Comment fonctionne la vérification ?
            </h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                <span>
                  <strong>Vérifié :</strong> Nous avons contacté le propriétaire qui a confirmé vos
                  informations (+20 pts max)
                </span>
              </p>
              <p className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
                <span>
                  <strong>En attente :</strong> Votre déclaration est en cours de vérification (+5
                  pts)
                </span>
              </p>
              <p className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-neutral-400 mt-0.5 shrink-0" />
                <span>
                  <strong>Non vérifiable :</strong> Nous n'avons pas pu contacter le propriétaire
                  (+2 pts)
                </span>
              </p>
              <p className="flex items-start gap-2">
                <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                <span>
                  <strong>Rejeté :</strong> Les informations n'ont pas pu être confirmées (0 pt)
                </span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* CTA to Score Page */}
        <div className="mt-6 text-center">
          <Button variant="outline" onClick={() => navigate('/mon-score')} className="gap-2">
            Voir mon Trust Score complet
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RentalHistoryPage;
