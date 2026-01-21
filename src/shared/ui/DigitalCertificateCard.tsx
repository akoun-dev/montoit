import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/app/providers/AuthProvider';
import {
  Shield,
  Loader,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Calendar,
  FileCheck,
} from 'lucide-react';

interface DigitalCertificate {
  id: string;
  certificate_id: string;
  user_id: string;
  expires_at: string | null;
  created_at: string | null;
  certificate_data: Record<string, unknown> | null;
}

interface DigitalCertificateCardProps {
  onCertificateGenerated?: (certificateId: string) => void;
  className?: string;
}

export default function DigitalCertificateCard({
  onCertificateGenerated,
  className = '',
}: DigitalCertificateCardProps) {
  const { user } = useAuth();
  const [certificate, setCertificate] = useState<DigitalCertificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      loadCertificate();
    }
  }, [user]);

  const loadCertificate = async () => {
    if (!user) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('digital_certificates')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) throw fetchError;
      setCertificate(data as DigitalCertificate | null);
    } catch (err) {
      console.error('Error loading certificate:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCertificate = async () => {
    if (!user) return;

    setGenerating(true);
    setError('');

    try {
      const { data, error: genError } = await supabase.functions.invoke(
        'cryptoneo-generate-certificate',
        {
          body: {},
        }
      );

      if (genError) throw genError;

      if (data.success) {
        await loadCertificate();
        onCertificateGenerated?.(data.certificateId);
      } else {
        throw new Error(data.error || 'Échec de génération du certificat');
      }
    } catch (err) {
      console.error('Error generating certificate:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la génération');
    } finally {
      setGenerating(false);
    }
  };

  const isExpired = certificate?.expires_at ? new Date(certificate.expires_at) < new Date() : false;

  const isActive = certificate && !isExpired;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className={`form-section-premium ${className}`}>
        <div className="flex items-center justify-center py-8">
          <Loader className="w-8 h-8 text-[#F16522] animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className={`form-section-premium ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div
          className={`p-3 rounded-xl shadow-lg ${
            isActive
              ? 'bg-gradient-to-br from-green-500 to-green-600'
              : 'bg-gradient-to-br from-[#8B7355] to-[#6B5644]'
          }`}
        >
          <Shield className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-[#4A2C17]">Certificat Numérique</h3>
          <p className="text-sm text-[#8B7355]">Pour les signatures électroniques certifiées</p>
        </div>
      </div>

      {/* Certificate Status */}
      {certificate ? (
        <div className="space-y-4">
          {/* Status Badge */}
          <div
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
              isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}
          >
            {isActive ? (
              <>
                <CheckCircle className="w-4 h-4" />
                <span>Certificat actif</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4" />
                <span>Certificat expiré</span>
              </>
            )}
          </div>

          {/* Certificate Details */}
          <div className="bg-[#F9F6F1] rounded-xl p-4 border border-[#E8DFD5] space-y-3">
            <div className="flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-[#8B7355]" />
              <span className="text-sm text-[#8B7355]">ID:</span>
              <span className="text-sm font-mono text-[#4A2C17]">{certificate.certificate_id}</span>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#8B7355]" />
              <span className="text-sm text-[#8B7355]">Créé le:</span>
              <span className="text-sm text-[#4A2C17]">{formatDate(certificate.created_at)}</span>
            </div>

            {certificate.expires_at && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#8B7355]" />
                <span className="text-sm text-[#8B7355]">Expire le:</span>
                <span
                  className={`text-sm font-medium ${isExpired ? 'text-red-600' : 'text-[#4A2C17]'}`}
                >
                  {formatDate(certificate.expires_at)}
                </span>
              </div>
            )}
          </div>

          {/* Renew Button (if expired) */}
          {isExpired && (
            <button
              onClick={handleGenerateCertificate}
              disabled={generating}
              className="form-button-primary w-full flex items-center justify-center gap-2"
            >
              {generating ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  <span>Renouvellement...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-5 h-5" />
                  <span>Renouveler le certificat</span>
                </>
              )}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-[#5D4E37]">
            Vous n'avez pas encore de certificat numérique. Générez-en un pour pouvoir effectuer des
            signatures électroniques certifiées.
          </p>

          <div className="bg-[#F9F6F1] rounded-xl p-4 border border-[#E8DFD5]">
            <h4 className="font-medium text-[#4A2C17] mb-2">Avantages du certificat :</h4>
            <ul className="space-y-2 text-sm text-[#5D4E37]">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>Valeur légale équivalente à une signature manuscrite</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>Reconnu par les autorités ivoiriennes</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>Horodatage certifié de chaque signature</span>
              </li>
            </ul>
          </div>

          <button
            onClick={handleGenerateCertificate}
            disabled={generating}
            className="form-button-primary w-full flex items-center justify-center gap-2"
          >
            {generating ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                <span>Génération...</span>
              </>
            ) : (
              <>
                <Shield className="w-5 h-5" />
                <span>Générer mon certificat</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
}
