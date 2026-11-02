import React, { useState } from 'react';
import { Wrench, Send, X, Calendar, Coins, Clock } from 'lucide-react';
import { monartisanService } from '@/shared/services/monartisanService';

interface MonArtisanRequestButtonProps {
  maintenanceRequestId: string;
  jobType: string;
  description: string;
  onSuccess?: () => void;
}

export default function MonArtisanRequestButton({
  maintenanceRequestId,
  jobType,
  description,
  onSuccess,
}: MonArtisanRequestButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    urgency_level: 'medium' as 'low' | 'medium' | 'high' | 'emergency',
    preferred_date: '',
    preferred_time_slot: 'morning',
    budget_max: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await monartisanService.createJobRequest({
        maintenance_request_id: maintenanceRequestId,
        job_type: jobType,
        job_description: description,
        urgency_level: formData.urgency_level,
        preferred_date: formData.preferred_date || undefined,
        preferred_time_slot: formData.preferred_time_slot || undefined,
        budget_max: formData.budget_max ? parseFloat(formData.budget_max) : undefined,
      });

      setShowModal(false);
      if (onSuccess) {
        onSuccess();
      }

      alert('Demande envoyée à Mon Artisan avec succès!');
    } catch (error) {
      console.error('Erreur:', error);
      alert(error instanceof Error ? error.message : "Erreur lors de l'envoi de la demande");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        <Wrench className="w-4 h-4 mr-2" />
        Trouver un artisan
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                    <Wrench className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Demander un artisan</h2>
                    <p className="text-sm text-gray-500">Via Mon Artisan</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">Type de travaux</h3>
                  <p className="text-gray-700">{jobType}</p>
                  <p className="text-sm text-gray-500 mt-2">{description}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Niveau d'urgence *
                  </label>
                  <select
                    value={formData.urgency_level}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        urgency_level: e.target.value as 'low' | 'medium' | 'high' | 'emergency',
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="low">Faible - Peut attendre</option>
                    <option value="medium">Moyen - Dans la semaine</option>
                    <option value="high">Élevé - Urgent (2-3 jours)</option>
                    <option value="emergency">Urgence - Immédiat (24h)</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      Date préférée
                    </label>
                    <input
                      type="date"
                      value={formData.preferred_date}
                      onChange={(e) => setFormData({ ...formData, preferred_date: e.target.value })}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Clock className="w-4 h-4 inline mr-1" />
                      Créneau horaire
                    </label>
                    <select
                      value={formData.preferred_time_slot}
                      onChange={(e) =>
                        setFormData({ ...formData, preferred_time_slot: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="morning">Matin (8h-12h)</option>
                      <option value="afternoon">Après-midi (12h-17h)</option>
                      <option value="evening">Soir (17h-20h)</option>
                      <option value="flexible">Flexible</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Coins className="w-4 h-4 inline mr-1" />
                    Budget maximum (FCFA)
                  </label>
                  <input
                    type="number"
                    value={formData.budget_max}
                    onChange={(e) => setFormData({ ...formData, budget_max: e.target.value })}
                    placeholder="Ex: 50000"
                    min="0"
                    step="1000"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Optionnel - Aide les artisans à proposer des devis adaptés
                  </p>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-2">Comment ça marche ?</h4>
                  <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                    <li>Votre demande est envoyée aux artisans qualifiés de Mon Artisan</li>
                    <li>Les artisans disponibles vous envoient leurs devis</li>
                    <li>Vous comparez et choisissez le meilleur devis</li>
                    <li>L'artisan effectue les travaux selon le devis accepté</li>
                  </ol>
                </div>

                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Envoi en cours...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5 mr-2" />
                        Envoyer la demande
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
