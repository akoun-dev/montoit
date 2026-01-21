import { useState, useEffect } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';
import { supabase } from '@/services/supabase/client';
import { Wrench, Upload, AlertCircle, CheckCircle, Camera, X } from 'lucide-react';
import { formatAddress } from '@/shared/utils/address';

export default function MaintenanceRequest() {
  const { user } = useAuth();
  const [activeLease, setActiveLease] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    issue_type: 'plumbing',
    urgency: 'medium',
    description: '',
  });

  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  useEffect(() => {
    if (!user) {
      window.location.href = '/connexion';
      return;
    }
    loadActiveLease();
  }, [user]);

  const loadActiveLease = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('lease_contracts')
        .select('*, properties(*)')
        .eq('tenant_id', user.id)
        .eq('status', 'actif')
        .maybeSingle();

      if (error) throw error;

      setActiveLease(data);
    } catch (err) {
      console.error('Error loading lease:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const files = Array.from(e.target.files);
    setImages((prev) => [...prev, ...files]);

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeLease) return;

    setSubmitting(true);

    try {
      const imageUrls: string[] = [];

      for (const image of images) {
        const fileExt = image.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `maintenance/${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('property-images')
          .upload(filePath, image);

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from('property-images').getPublicUrl(filePath);

        imageUrls.push(publicUrl);
      }

      const { error } = await supabase.from('maintenance_requests').insert({
        tenant_id: user.id,
        property_id: activeLease.property_id,
        contract_id: activeLease.id,
        issue_type: formData.issue_type,
        priority: formData.urgency,
        description: formData.description,
        images: imageUrls,
      });

      if (error) throw error;

      setSuccess(true);
      setFormData({ issue_type: 'plumbing', urgency: 'medium', description: '' });
      setImages([]);
      setImagePreviews([]);

      setTimeout(() => {
        window.location.href = '/locataire/maintenance';
      }, 2000);
    } catch (err: any) {
      console.error('Error submitting request:', err);
      alert(err.message || 'Erreur lors de la soumission');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-olive-50 to-amber-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-olive-600"></div>
      </div>
    );
  }

  if (!activeLease) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-olive-50 to-amber-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Aucun bail actif</h2>
          <p className="text-gray-600">
            Vous devez avoir un bail actif pour soumettre une demande de maintenance
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-olive-50 to-amber-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center space-x-3">
            <Wrench className="w-10 h-10 text-terracotta-600" />
            <span>Demande de maintenance</span>
          </h1>
          <p className="text-xl text-gray-600">Signalez un problème dans votre logement</p>
        </div>

        {success && (
          <div className="mb-6 p-4 bg-green-50 border-2 border-green-200 rounded-xl flex items-center space-x-3">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <div>
              <p className="text-green-800 font-bold">Demande envoyée avec succès !</p>
              <p className="text-sm text-green-700">
                Le propriétaire a été notifié. Redirection...
              </p>
            </div>
          </div>
        )}

        <div className="card-scrapbook p-6 mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-3">Propriété concernée</h3>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="font-bold text-gray-900">{activeLease.properties?.title}</p>
            <p className="text-sm text-gray-600">
              {formatAddress(activeLease.properties?.address, activeLease.properties?.city)}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="card-scrapbook p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type de problème *
            </label>
            <select
              value={formData.issue_type}
              onChange={(e) => setFormData({ ...formData, issue_type: e.target.value })}
              required
              className="input-scrapbook w-full"
            >
              <option value="plumbing">Plomberie</option>
              <option value="electrical">Électricité</option>
              <option value="heating">Chauffage / Climatisation</option>
              <option value="appliance">Électroménager</option>
              <option value="structural">Structure / Bâtiment</option>
              <option value="other">Autre</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Urgence *</label>
            <select
              value={formData.urgency}
              onChange={(e) => setFormData({ ...formData, urgency: e.target.value })}
              required
              className="input-scrapbook w-full"
            >
              <option value="low">Faible - Peut attendre plusieurs jours</option>
              <option value="medium">Moyenne - À traiter sous quelques jours</option>
              <option value="high">Élevée - À traiter rapidement</option>
              <option value="urgent">Urgente - Intervention immédiate requise</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description détaillée *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              rows={6}
              className="input-scrapbook w-full"
              placeholder="Décrivez le problème en détail (localisation, symptômes, etc.)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Photos (optionnel)
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageChange}
                className="hidden"
                id="image-upload"
              />
              <label htmlFor="image-upload" className="cursor-pointer">
                <Camera className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">Cliquez pour ajouter des photos</p>
                <p className="text-sm text-gray-500">Jusqu'à 5 photos</p>
              </label>
            </div>

            {imagePreviews.length > 0 && (
              <div className="grid grid-cols-3 gap-4 mt-4">
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="relative">
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full hover:bg-red-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex space-x-4">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="btn-secondary flex-1"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary flex-1 flex items-center justify-center space-x-2"
            >
              <Upload className="w-4 h-4" />
              <span>{submitting ? 'Envoi...' : 'Soumettre la demande'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
