/**
 * Page de signature manuscrite du mandat - VERSION SIMPLIFIÉE
 * Permet de signer directement un mandat sans étapes intermédiaires
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  PenTool,
  Eraser,
  Undo,
  Home,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/app/providers/AuthProvider';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { notifyMandateSigned } from '@/services/notifications/mandateNotificationService';

interface MandateDetails {
  id: string;
  mandate_scope: string;
  start_date: string;
  end_date: string | null;
  commission_rate: number;
  status: string;
  cryptoneo_signature_status: string | null;
  owner_signed_at: string | null;
  agency_signed_at: string | null;
  property?: {
    id: string;
    title: string;
    city: string;
    neighborhood: string | null;
  };
  agency?: {
    id: string;
    agency_name: string;
    user_id?: string;
  };
  owner?: {
    full_name?: string;
  };
}

export default function HandwrittenSignaturePageSimple() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);
  const [signing, setSigning] = useState(false);
  const [mandate, setMandate] = useState<MandateDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [signerType, setSignerType] = useState<'owner' | 'agency' | null>(null);
  const [completed, setCompleted] = useState(false);

  // Fetch mandate on mount
  useEffect(() => {
    if (!id) return;
    fetchMandate();
  }, [id]);

  // Auto-redirect after signature is completed
  useEffect(() => {
    if (completed && signerType) {
      const timer = setTimeout(() => {
        navigate(signerType === 'owner' ? '/proprietaire/mes-mandats' : '/agences/mandats');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [completed, signerType, navigate]);

  const fetchMandate = async () => {
    try {
      setLoading(true);

      const { data: mandateData, error } = await supabase
        .from('agency_mandates')
        .select(`
          *,
          property:properties(id, title, city, neighborhood),
          agency:profiles!agency_mandates_agency_id_fkey(id, agency_name),
          owner:profiles!agency_mandates_owner_id_fkey(full_name)
        `)
        .eq('id', id)
        .maybeSingle();

      if (error || !mandateData) {
        toast.error('Mandat introuvable');
        navigate(-1);
        return;
      }

      setMandate(mandateData as MandateDetails);

      console.log('[HandwrittenSignaturePageSimple] Mandate loaded:', {
        mandateId: mandateData.id,
        ownerId: mandateData.owner_id,
        agencyId: mandateData.agency_id,
        userId: user?.id,
        ownerSignedAt: mandateData.owner_signed_at,
        agencySignedAt: mandateData.agency_signed_at,
      });

      // Determine signer type
      if (user) {
        if (user.id === mandateData.owner_id) {
          console.log('[HandwrittenSignaturePageSimple] Signer type: owner');
          setSignerType('owner');
        } else if (user.id === mandateData.agency_id) {
          console.log('[HandwrittenSignaturePageSimple] Signer type: agency');
          setSignerType('agency');
        } else {
          console.error('[HandwrittenSignaturePageSimple] Cannot determine signer type!', {
            userId: user.id,
            ownerId: mandateData.owner_id,
            agencyId: mandateData.agency_id,
          });
        }
      }
    } catch (err) {
      console.error('Error fetching mandate:', err);
      toast.error('Erreur lors du chargement du mandat');
    } finally {
      setLoading(false);
    }
  };

  const handleStartDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!user || !signerType) {
      toast.error('Vous devez être connecté pour signer');
      return;
    }
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const offsetX = (e.clientX - rect.left) * scaleX;
    const offsetY = (e.clientY - rect.top) * scaleY;

    ctx.beginPath();
    ctx.moveTo(offsetX, offsetY);
  };

  const handleDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const offsetX = (e.clientX - rect.left) * scaleX;
    const offsetY = (e.clientY - rect.top) * scaleY;

    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineTo(offsetX, offsetY);
    ctx.stroke();
  };

  const handleStopDrawing = () => {
    setIsDrawing(false);
    setHasSigned(true);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSigned(false);
  };

  const handleSubmitSignature = async () => {
    if (!hasSigned || !mandate || !signerType) {
      toast.error('Veuillez signer le document');
      return;
    }

    console.log('[HandwrittenSignaturePageSimple] Starting signature submission:', {
      mandateId: mandate.id,
      signerType,
      currentOwnerSigned: mandate.owner_signed_at,
      currentAgencySigned: mandate.agency_signed_at,
      currentStatus: mandate.status,
      currentCryptoStatus: mandate.cryptoneo_signature_status,
    });

    setSigning(true);

    try {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), 'image/png');
      });

      // Upload signature to storage
      const fileName = `mandate-${mandate.id}-${signerType}-${Date.now()}.png`;
      const { error: uploadError } = await supabase.storage
        .from('mandate-signatures')
        .upload(fileName, blob);

      if (uploadError) {
        console.error('[HandwrittenSignaturePageSimple] Upload error:', uploadError);
        toast.error('Erreur lors de l\'enregistrement de la signature');
        return;
      }

      console.log('[HandwrittenSignaturePageSimple] Signature uploaded successfully');

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('mandate-signatures')
        .getPublicUrl(fileName);

      // Update mandate
      const now = new Date().toISOString();
      const updateData: Record<string, unknown> = {
        cryptoneo_signature_status: signerType === 'owner' ? 'owner_signed' : 'agency_signed',
      };

      if (signerType === 'owner') {
        updateData.owner_signed_at = now;
        updateData.signed_mandate_url = publicUrl;
      } else {
        updateData.agency_signed_at = now;
        if (!updateData.signed_mandate_url) {
          updateData.signed_mandate_url = publicUrl;
        }
      }

      // Check if both signed
      const bothSigned =
        (mandate.owner_signed_at || signerType === 'owner') &&
        (mandate.agency_signed_at || signerType === 'agency');

      console.log('[HandwrittenSignaturePageSimple] Both signed?', {
        ownerSigned: mandate.owner_signed_at,
        agencySigned: mandate.agency_signed_at,
        currentSignerType: signerType,
        bothSigned,
      });

      if (bothSigned) {
        updateData.cryptoneo_signature_status = 'completed';
        updateData.status = 'active';
        updateData.signed_at = now;
      }

      console.log('[HandwrittenSignaturePageSimple] Updating mandate with:', updateData);

      const { error: updateError, data: updatedMandate } = await supabase
        .from('agency_mandates')
        .update(updateData)
        .eq('id', mandate.id)
        .select('id, agency_signed_at, owner_signed_at, cryptoneo_signature_status, status')
        .single();

      if (updateError) {
        console.error('[HandwrittenSignaturePageSimple] Update error:', updateError);
        toast.error('Erreur lors de la mise à jour du mandat');
        return;
      }

      console.log('[HandwrittenSignaturePageSimple] Mandate updated successfully. Verification:', updatedMandate);

      // Verify the update worked
      if (signerType === 'agency' && !updatedMandate.agency_signed_at) {
        console.error('[HandwrittenSignaturePageSimple] CRITICAL: Update succeeded but agency_signed_at is still null!');
      }
      if (signerType === 'owner' && !updatedMandate.owner_signed_at) {
        console.error('[HandwrittenSignaturePageSimple] CRITICAL: Update succeeded but owner_signed_at is still null!');
      }

      // Envoyer la notification de signature à l'autre partie
      try {
        await notifyMandateSigned(mandate.id, signerType);
        console.log('[HandwrittenSignaturePageSimple] Notification sent');
      } catch (notifError) {
        console.error('[HandwrittenSignaturePageSimple] Error sending signature notification:', notifError);
        // Ne pas bloquer si la notification échoue
      }

      setCompleted(true);

      if (bothSigned) {
        toast.success('🎉 Mandat complété signé !');
      } else {
        toast.success('Signature enregistrée ! En attente de la contre-signature.');
      }
    } catch (error) {
      console.error('[HandwrittenSignaturePageSimple] Error saving signature:', error);
      toast.error('Erreur lors de la signature');
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[#F16522]" />
      </div>
    );
  }

  if (completed) {
    return (
      <div className="text-center py-20 bg-[#FAF7F4] rounded-xl border border-[#EFEBE9]">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="h-10 w-10 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-[#2C1810] mb-2">Signature enregistrée !</h2>
        <p className="text-[#6B5A4E] mb-6">
          {signerType === 'owner' && mandate?.agency_signed_at
            ? "Votre signature a été enregistrée. L'agence doit maintenant signer pour compléter le mandat."
            : "Votre signature a été enregistrée."}
        </p>
        <p className="text-sm text-[#6B5A4E]">Redirection vers la liste des mandats...</p>
      </div>
    );
  }

  if (!user || !signerType) {
    return (
      <div className="text-center py-20 bg-[#FAF7F4] rounded-xl border border-[#EFEBE9]">
        <AlertCircle className="h-12 w-12 text-[#F16522] mx-auto mb-4" />
        <h3 className="text-lg font-bold text-[#2C1810] mb-2">Connexion requise</h3>
        <p className="text-[#6B5A4E] mb-6">
          Vous devez être connecté pour signer ce mandat.
        </p>
        <button
          onClick={() => navigate('/connexion')}
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#F16522] hover:bg-[#d1571e] text-white rounded-xl font-medium transition-colors"
        >
          Se connecter
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#2C1810] mb-2">Signature du Mandat</h1>
        <p className="text-[#6B5A4E]">
          Signez dans le cadre ci-dessous pour valider votre mandat
        </p>
      </div>

      {/* Mandate Info */}
      {mandate && (
        <div className="bg-white rounded-xl border border-[#EFEBE9] p-6 mb-6">
          <h3 className="font-semibold text-[#2C1810] mb-4">Informations du mandat</h3>
          {mandate.property && (
            <p className="text-[#6B5A4E] mb-2">
              <strong>Bien :</strong> {mandate.property.title}
            </p>
          )}
          <p className="text-[#6B5A4E] mb-2">
            <strong>Agence :</strong> {mandate.agency?.agency_name}
          </p>
          <p className="text-sm text-[#6B5A4E]">
            <strong>Du </strong> {format(new Date(mandate.start_date), 'dd MMM yyyy', { locale: fr })}
            {mandate.end_date && (
              <span> au {format(new Date(mandate.end_date), 'dd MMM yyyy', { locale: fr })}</span>
            )}
          </p>
        </div>
      )}

      {/* Canvas */}
      <div className="bg-white rounded-xl border border-[#EFEBE9] p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-[#2C1810]">Votre signature</h3>
          <button
            onClick={handleClear}
            className="text-sm text-[#6B5A4E] hover:text-[#F16522] transition-colors flex items-center gap-1"
          >
            <Eraser className="h-4 w-4" />
            Effacer
          </button>
        </div>
        <div className="border-2 border-dashed border-[#EFEBE9] rounded-xl p-4 bg-[#FAF7F4]">
          <canvas
            ref={canvasRef}
            width={600}
            height={200}
            onMouseDown={handleStartDrawing}
            onMouseMove={handleDraw}
            onMouseUp={handleStopDrawing}
            onMouseLeave={handleStopDrawing}
            className="w-full bg-white rounded-lg cursor-crosshair"
            style={{ touchAction: 'none' }}
          />
        </div>
        <p className="text-xs text-[#6B5A4E] mt-2 text-center">
          Signez dans le cadre ci-dessus avec votre doigt ou un stylet
        </p>
      </div>

      {/* Submit Button */}
      <button
        onClick={handleSubmitSignature}
        disabled={!hasSigned || signing}
        className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-[#F16522] hover:bg-[#d1571e] text-white rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {signing ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Enregistrement...
          </>
        ) : (
          <>
            <PenTool className="h-5 w-5" />
            Valider ma signature
          </>
        )}
      </button>
    </div>
  );
}
