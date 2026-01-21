import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { supabase } from '@/services/supabase/client';
import { Home, FileText, Building2, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

interface Mandate {
  id: string;
  property_id?: string;
  property_title?: string;
  owner_name: string;
  status: 'active' | 'expired' | 'pending';
  start_date: string;
  end_date?: string;
  permissions: string[];
}

interface PropertyFormData {
  mandate_id: string;
  title: string;
  property_type: string;
  address: string;
  city: string;
  price: number;
  description: string;
  surface_area: number;
  rooms: number;
  bedrooms: number;
  bathrooms: number;
}

export default function AgencyAddPropertyPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mandates, setMandates] = useState<Mandate[]>([]);
  const [selectedMandate, setSelectedMandate] = useState<Mandate | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<PropertyFormData>({
    mandate_id: '',
    title: '',
    property_type: 'apartment',
    address: '',
    city: '',
    price: 0,
    description: '',
    surface_area: 0,
    rooms: 0,
    bedrooms: 0,
    bathrooms: 0,
  });

  useEffect(() => {
    if (user) {
      loadMandates();
    }
  }, [user]);

  const loadMandates = async () => {
    try {
      const { data, error } = await supabase
        .from('mandates')
        .select(
          `
          *,
          properties:property_id (
            id,
            title
          ),
          owner:owner_id (
            full_name
          )
        `
        )
        .eq('agency_id', user?.id)
        .in('status', ['active', 'pending'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedMandates = (data || []).map((mandate: any) => ({
        id: mandate.id,
        property_id: mandate.property_id,
        property_title: mandate.properties?.title,
        owner_name: mandate.owner?.full_name || 'Propriétaire inconnu',
        status: mandate.status,
        start_date: mandate.start_date,
        end_date: mandate.end_date,
        permissions: mandate.permissions || [],
      }));

      setMandates(formattedMandates);
    } catch (error) {
      console.error('Error loading mandates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMandateSelect = (mandate: Mandate) => {
    setSelectedMandate(mandate);
    setFormData((prev) => ({
      ...prev,
      mandate_id: mandate.id,
      title: mandate.property_title || '',
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMandate) {
      alert('Veuillez sélectionner un mandat');
      return;
    }

    setSubmitting(true);
    try {
      // Vérifier si le mandat permet d'ajouter des propriétés
      if (!selectedMandate.permissions.includes('add_properties')) {
        alert("Ce mandat ne permet pas d'ajouter de nouvelles propriétés");
        return;
      }

      // Créer la propriété
      const { data: property, error: propertyError } = await supabase
        .from('properties')
        .insert({
          ...formData,
          owner_id: selectedMandate.owner_name,
          agency_id: user?.id,
          status: 'published',
        })
        .select()
        .single();

      if (propertyError) throw propertyError;

      // Associer la propriété au mandat si nécessaire
      if (selectedMandate.property_id) {
        await supabase
          .from('mandates')
          .update({ property_id: property.id })
          .eq('id', selectedMandate.id);
      }

      alert('Propriété ajoutée avec succès');
      navigate('/agences/biens');
    } catch (error) {
      console.error('Error creating property:', error);
      alert('Erreur lors de la création de la propriété');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Connexion requise</h2>
          <p className="text-gray-600">Veuillez vous connecter pour ajouter une propriété</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center space-x-3">
            <Home className="w-8 h-8 text-primary-500" />
            <h1 className="text-3xl font-bold text-gray-900">Ajouter une propriété</h1>
          </div>
          <p className="mt-2 text-gray-600">
            Ajoutez une nouvelle propriété pour un propriétaire sous mandat
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Sélection du mandat */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center mb-4">
                <FileText className="w-5 h-5 text-primary-500 mr-2" />
                <h2 className="text-lg font-semibold text-gray-900">Sélectionner un mandat</h2>
              </div>

              {mandates.length === 0 ? (
                <div className="text-center py-8 bg-yellow-50 rounded-lg">
                  <AlertCircle className="w-12 h-12 text-yellow-400 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-yellow-800 mb-2">Aucun mandat actif</h3>
                  <p className="text-yellow-700 mb-4">
                    Vous devez avoir un mandat actif pour ajouter une propriété
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate('/agences/mandats')}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition"
                  >
                    Voir mes mandats
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {mandates.map((mandate) => (
                    <div
                      key={mandate.id}
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        selectedMandate?.id === mandate.id
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleMandateSelect(mandate)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium text-gray-900">{mandate.owner_name}</p>
                          <p className="text-sm text-gray-600">
                            {mandate.property_title || 'Nouvelle propriété'}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            mandate.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {mandate.status === 'active' ? 'Actif' : 'En attente'}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        <p>Du {formatDate(mandate.start_date)}</p>
                        {mandate.end_date && <p>Au {formatDate(mandate.end_date)}</p>}
                      </div>
                      {selectedMandate?.id === mandate.id && (
                        <div className="mt-3 flex items-center text-primary-600">
                          <CheckCircle className="w-4 h-4 mr-1" />
                          <span className="text-sm">Sélectionné</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Informations de la propriété */}
            {selectedMandate && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Informations de la propriété
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Titre de l'annonce *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Ex: Bel appartement T3 centre-ville"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Type de propriété *
                    </label>
                    <select
                      required
                      value={formData.property_type}
                      onChange={(e) => setFormData({ ...formData, property_type: e.target.value })}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="apartment">Appartement</option>
                      <option value="house">Maison</option>
                      <option value="studio">Studio</option>
                      <option value="duplex">Duplex</option>
                      <option value="villa">Villa</option>
                      <option value="commercial">Local commercial</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Adresse *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Ex: 15 Rue des Jardins"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Ville *</label>
                    <input
                      type="text"
                      required
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Ex: Abidjan, Cocody"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Loyer mensuel (FCFA) *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      placeholder="150000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Surface (m²)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.surface_area}
                      onChange={(e) =>
                        setFormData({ ...formData, surface_area: Number(e.target.value) })
                      }
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      placeholder="75"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre de pièces
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.rooms_count}
                      onChange={(e) =>
                        setFormData({ ...formData, rooms_count: Number(e.target.value) })
                      }
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      placeholder="3"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre de chambres
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.bedrooms}
                      onChange={(e) =>
                        setFormData({ ...formData, bedrooms: Number(e.target.value) })
                      }
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      placeholder="2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre de salles de bain
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.bathrooms_count}
                      onChange={(e) =>
                        setFormData({ ...formData, bathrooms_count: Number(e.target.value) })
                      }
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      placeholder="1"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      rows={4}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Décrivez la propriété, ses caractéristiques, son environnement..."
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            {selectedMandate && (
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => navigate('/agences/biens')}
                  className="px-6 py-3 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-3 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Création en cours...
                    </>
                  ) : (
                    'Créer la propriété'
                  )}
                </button>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
