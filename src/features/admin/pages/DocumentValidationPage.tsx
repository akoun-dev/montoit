import { useState, useEffect } from 'react';
import {
  FileCheck,
  Eye,
  Building,
  Clock,
  CheckCircle,
  XCircle,
  Download,
  AlertTriangle,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PropertyDocument {
  id: string;
  property_id: string | null;
  owner_id: string;
  document_type: string;
  document_url: string;
  document_name: string | null;
  status: string | null;
  created_at: string | null;
}

interface PendingProperty {
  id: string;
  title: string;
  city: string;
  neighborhood: string | null;
  monthly_rent: number;
  main_image: string | null;
  created_at: string | null;
  owner_id: string | null;
  owner_name: string;
  documents: PropertyDocument[];
}

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  titre_propriete: 'Titre de propriété',
  piece_identite: "Pièce d'identité",
  justificatif_domicile: 'Justificatif de domicile',
  mandat_gestion: 'Mandat de gestion',
  photos_bien: 'Photos du bien',
};

export default function DocumentValidationPage() {
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<PendingProperty[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<PendingProperty | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadPendingProperties();
  }, []);

  const loadPendingProperties = async () => {
    try {
      // Charger les propriétés en attente de vérification
      const { data: propertiesData, error: propError } = await supabase
        .from('properties')
        .select('*')
        .eq('status', 'en_verification')
        .order('created_at', { ascending: false });

      if (propError) throw propError;

      // Pour chaque propriété, charger ses documents et le nom du propriétaire
      const propertiesWithDocs: PendingProperty[] = [];

      for (const property of propertiesData || []) {
        // Charger les documents
        const { data: docsData } = await supabase
          .from('property_documents')
          .select('*')
          .eq('property_id', property.id);

        // Charger le profil du propriétaire
        let ownerName = 'Propriétaire';
        if (property.owner_id) {
          const { data: ownerData } = await supabase.rpc('get_public_profile', {
            profile_user_id: property.owner_id,
          });
          ownerName = ownerData?.[0]?.full_name || 'Propriétaire';
        }

        propertiesWithDocs.push({
          id: property.id,
          title: property.title,
          city: property.city,
          neighborhood: property.neighborhood,
          monthly_rent: property.monthly_rent,
          main_image: property.main_image,
          created_at: property.created_at,
          owner_id: property.owner_id,
          owner_name: ownerName,
          documents: (docsData || []) as PropertyDocument[],
        });
      }

      setProperties(propertiesWithDocs);
    } catch (error) {
      console.error('Error loading pending properties:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (property: PendingProperty) => {
    if (!property.owner_id) {
      toast.error('Propriétaire non trouvé');
      return;
    }

    setProcessing(true);
    try {
      // Mettre à jour le statut de la propriété
      const { error: propError } = await supabase
        .from('properties')
        .update({ status: 'disponible' })
        .eq('id', property.id);

      if (propError) throw propError;

      // Mettre à jour le statut des documents
      const { error: docError } = await supabase
        .from('property_documents')
        .update({ status: 'approved', verified_at: new Date().toISOString() })
        .eq('property_id', property.id);

      if (docError) throw docError;

      // Créer une notification pour le propriétaire
      await supabase.from('notifications').insert([
        {
          user_id: property.owner_id,
          title: 'Propriété validée !',
          message: `Votre propriété "${property.title}" a été validée et est maintenant visible sur la plateforme.`,
          type: 'success',
          action_url: `/propriete/${property.id}`,
        },
      ]);

      toast.success('Propriété validée avec succès');
      loadPendingProperties();
    } catch (error) {
      console.error('Error approving property:', error);
      toast.error('Erreur lors de la validation');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedProperty || !rejectionReason.trim()) {
      toast.error('Veuillez indiquer un motif de rejet');
      return;
    }

    if (!selectedProperty.owner_id) {
      toast.error('Propriétaire non trouvé');
      return;
    }

    setProcessing(true);
    try {
      // Mettre à jour le statut de la propriété
      const { error: propError } = await supabase
        .from('properties')
        .update({ status: 'rejete' })
        .eq('id', selectedProperty.id);

      if (propError) throw propError;

      // Mettre à jour le statut des documents avec le motif
      const { error: docError } = await supabase
        .from('property_documents')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason,
          verified_at: new Date().toISOString(),
        })
        .eq('property_id', selectedProperty.id);

      if (docError) throw docError;

      // Créer une notification pour le propriétaire
      await supabase.from('notifications').insert([
        {
          user_id: selectedProperty.owner_id,
          title: 'Documents refusés',
          message: `Les documents de votre propriété "${selectedProperty.title}" ont été refusés. Motif : ${rejectionReason}`,
          type: 'warning',
          action_url: `/dashboard/ajouter-propriete`,
        },
      ]);

      toast.success('Propriété rejetée');
      setShowRejectModal(false);
      setRejectionReason('');
      setSelectedProperty(null);
      loadPendingProperties();
    } catch (error) {
      console.error('Error rejecting property:', error);
      toast.error('Erreur lors du rejet');
    } finally {
      setProcessing(false);
    }
  };

  const openDocument = (url: string) => {
    window.open(url, '_blank');
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Date inconnue';
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-amber-100 p-3 rounded-xl">
            <FileCheck className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Validation des Documents</h1>
            <p className="text-muted-foreground">
              {properties.length} propriété{properties.length > 1 ? 's' : ''} en attente de
              validation
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-amber-500" />
            <span className="text-muted-foreground">En attente</span>
          </div>
          <p className="text-2xl font-bold mt-2">{properties.length}</p>
        </div>
      </div>

      {/* Liste des propriétés en attente */}
      {properties.length === 0 ? (
        <div className="bg-card rounded-xl p-12 border text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Aucune propriété en attente</h3>
          <p className="text-muted-foreground">Toutes les propriétés ont été validées</p>
        </div>
      ) : (
        <div className="space-y-4">
          {properties.map((property) => (
            <div key={property.id} className="bg-card rounded-xl border overflow-hidden">
              {/* Property Header */}
              <div className="p-6 border-b">
                <div className="flex items-start gap-4">
                  <div className="w-24 h-24 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                    {property.main_image ? (
                      <img
                        src={property.main_image}
                        alt={property.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Building className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">{property.title}</h3>
                    <p className="text-muted-foreground">
                      {property.city} {property.neighborhood && `• ${property.neighborhood}`}
                    </p>
                    <p className="text-primary font-bold mt-1">
                      {property.monthly_rent.toLocaleString()} FCFA/mois
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Par {property.owner_name} • {formatDate(property.created_at)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(property)}
                      disabled={processing}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Valider
                    </button>
                    <button
                      onClick={() => {
                        setSelectedProperty(property);
                        setShowRejectModal(true);
                      }}
                      disabled={processing}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50"
                    >
                      <XCircle className="h-4 w-4" />
                      Rejeter
                    </button>
                  </div>
                </div>
              </div>

              {/* Documents */}
              <div className="p-6 bg-muted/30">
                <h4 className="font-medium mb-4 flex items-center gap-2">
                  <FileCheck className="h-4 w-4" />
                  Documents soumis ({property.documents.length})
                </h4>
                {property.documents.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {property.documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="bg-card rounded-lg p-3 border flex items-center gap-3"
                      >
                        <div className="bg-primary/10 p-2 rounded-lg">
                          <FileCheck className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {DOCUMENT_TYPE_LABELS[doc.document_type] || doc.document_type}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {doc.document_name || 'Document'}
                          </p>
                        </div>
                        <button
                          onClick={() => openDocument(doc.document_url)}
                          className="text-primary hover:text-primary/80 p-2"
                          title="Voir le document"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = doc.document_url;
                            link.download = doc.document_name || 'document';
                            link.click();
                          }}
                          className="text-muted-foreground hover:text-foreground p-2"
                          title="Télécharger"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-lg">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm">Aucun document soumis</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de rejet */}
      {showRejectModal && selectedProperty && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-100 p-2 rounded-lg">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold">Rejeter la propriété</h3>
            </div>
            <p className="text-muted-foreground mb-4">
              Vous êtes sur le point de rejeter "{selectedProperty.title}". Le propriétaire sera
              notifié avec votre motif.
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Motif du rejet (obligatoire)..."
              className="w-full border rounded-lg p-3 h-32 resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                  setSelectedProperty(null);
                }}
                className="flex-1 border rounded-lg py-2 hover:bg-muted transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleReject}
                disabled={processing || !rejectionReason.trim()}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-lg py-2 disabled:opacity-50"
              >
                {processing ? 'En cours...' : 'Confirmer le rejet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
