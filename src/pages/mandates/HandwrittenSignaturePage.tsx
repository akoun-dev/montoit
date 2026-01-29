/**
 * Page de signature manuscrite du mandat
 * Permet de dessiner sa signature sur un canvas
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FileSignature,
  CheckCircle2,
  Building2,
  User,
  Calendar,
  Percent,
  FileText,
  AlertCircle,
  ArrowLeft,
  Loader2,
  PenTool,
  Eraser,
  Undo,
  Redo,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/app/providers/AuthProvider';
import Button from '@/shared/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/badge';
import { Checkbox } from '@/shared/ui/checkbox';
import { Label } from '@/shared/ui/label';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

type SignatureStep = 'details' | 'signing' | 'complete';

interface MandateDetails {
  id: string;
  mandate_scope: string;
  start_date: string;
  end_date: string | null;
  commission_rate: number;
  status: string;
  owner_signed_at: string | null;
  agency_signed_at: string | null;
  property?: {
    id: string;
    title: string;
    city: string;
    neighborhood: string | null;
    price?: number;
  };
  agency?: {
    id: string;
    user_id: string;
    agency_name: string;
  };
  // Permissions
  can_view_properties: boolean;
  can_edit_properties: boolean;
  can_manage_applications: boolean;
  can_create_leases: boolean;
  can_view_financials: boolean;
}

export default function HandwrittenSignaturePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);
  const [currentStep, setCurrentStep] = useState<SignatureStep>('details');
  const [mandate, setMandate] = useState<MandateDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [signerType, setSignerType] = useState<'owner' | 'agency' | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyStep, setHistoryStep] = useState(0);

  // Fetch mandate
  useEffect(() => {
    if (!id) return;
    fetchMandate();
  }, [id]);

  const fetchMandate = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('agency_mandates')
        .select(`
          *,
          property:properties(id, title, city, neighborhood, price),
          agency:agencies(id, user_id, agency_name)
        `)
        .eq('id', id)
        .single();

      if (error || !data) {
        toast.error('Mandat introuvable');
        navigate('/mandat/signer/' + id);
        return;
      }

      setMandate(data as MandateDetails);

      // Determine signer type
      if (data.owner_id === user?.id) {
        setSignerType('owner');
      } else if (data.agency?.id === user?.id || data.agency?.user_id === user?.id) {
        setSignerType('agency');
      }

      setLoading(false);
    } catch (err) {
      console.error('Error fetching mandate:', err);
      toast.error('Erreur lors du chargement du mandat');
      navigate('/mandat/signer/' + id);
    } finally {
      setLoading(false);
    }
  };

  // Canvas setup
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = 200 * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  // Drawing functions
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDrawing(true);

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();

    setHasSigned(true);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.closePath();

    // Save to history
    const newHistory = history.slice(0, historyStep);
    newHistory.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    setHistory(newHistory);
    setHistoryStep(newHistory.length);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSigned(false);
  };

  const undo = () => {
    if (historyStep <= 0) {
      clearCanvas();
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const newHistoryStep = historyStep - 1;
    setHistoryStep(newHistoryStep);

    if (newHistoryStep > 0) {
      ctx.putImageData(history[newHistoryStep - 1], 0, 0);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    setHasSigned(newHistoryStep > 0);
  };

  const getPermissionLabel = (permission: string) => {
    const labels: Record<string, string> = {
      can_view_properties: 'Voir les propriétés',
      can_edit_properties: 'Modifier les propriétés',
      can_delete_properties: 'Supprimer les propriétés',
      can_create_properties: 'Créer des propriétés',
      can_view_applications: 'Voir les candidatures',
      can_manage_applications: 'Gérer les candidatures',
      can_create_leases: 'Créer des baux',
      can_view_financials: 'Accès financier',
      can_manage_maintenance: 'Gérer la maintenance',
      can_communicate_tenants: 'Communiquer avec locataires',
      can_manage_documents: 'Gérer les documents',
    };
    return labels[permission] || permission;
  };

  const handleSubmitSignature = async () => {
    if (!hasSigned || !mandate || !signerType || !acceptedTerms) {
      toast.error('Veuillez signer et accepter les conditions');
      return;
    }

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
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('mandate-signatures')
        .upload(fileName, blob);

      if (uploadError) {
        toast.error('Erreur lors de l\'enregistrement de la signature');
        setSigning(false);
        return;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('mandate-signatures')
        .getPublicUrl(fileName);

      // Update mandate with signature
      const updateData: any = {
        cryptoneo_signature_status: signerType === 'owner' ? 'owner_signed' : 'agency_signed',
      };

      if (signerType === 'owner') {
        updateData.owner_signed_at = new Date().toISOString();
        updateData.signed_mandate_url = publicUrl;
      } else {
        updateData.agency_signed_at = new Date().toISOString();
        if (!updateData.signed_mandate_url) {
          updateData.signed_mandate_url = publicUrl;
        }
      }

      // Check if both signed
      const bothSigned =
        (mandate.owner_signed_at || signerType === 'owner') &&
        (mandate.agency_signed_at || signerType === 'agency');

      if (bothSigned) {
        updateData.cryptoneo_signature_status = 'completed';
        updateData.status = 'active';
        updateData.signed_at = new Date().toISOString();
      }

      const { error: updateError } = await supabase
        .from('agency_mandates')
        .update(updateData)
        .eq('id', mandate.id);

      if (updateError) {
        toast.error('Erreur lors de la mise à jour du mandat');
        setSigning(false);
        return;
      }

      setCurrentStep('complete');

      if (bothSigned) {
        toast.success('🎉 Mandat complété signé par les deux parties !');
      } else {
        toast.success('Signature enregistrée avec succès');
      }
    } catch (err) {
      console.error('Error submitting signature:', err);
      toast.error('Erreur lors de la soumission de la signature');
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!mandate) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Mandat introuvable</h2>
            <Button onClick={() => navigate('/mandat/signer/' + id)} className="mt-4">
              Retour
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/mandat/signer/' + id)}
            className="inline-flex items-center gap-2 mb-4 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Retour</span>
          </button>

          <div className="flex items-center gap-3 mb-2">
            <FileSignature className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Signature Manuscrite</h1>
          </div>
          <p className="text-gray-600">
            Dessinez votre signature ci-dessous
          </p>
        </div>

        {/* Step 1: Details */}
        {currentStep === 'details' && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Détails du Mandat
                </CardTitle>
                <CardDescription>Vérifiez les informations avant de signer</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Parties */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg border">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="h-4 w-4 text-blue-600" />
                      <span className="font-medium">Propriétaire</span>
                      {signerType === 'owner' && (
                        <Badge variant="secondary" className="text-xs ml-auto">
                          Vous
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      ID: {mandate.owner_id.slice(0, 8)}...
                    </p>
                    {mandate.owner_signed_at && (
                      <Badge variant="outline" className="mt-2 text-green-600 border-green-300">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Signé
                      </Badge>
                    )}
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg border">
                    <div className="flex items-center gap-2 mb-2">
                      <Building2 className="h-4 w-4 text-blue-600" />
                      <span className="font-medium">Agence</span>
                      {signerType === 'agency' && (
                        <Badge variant="secondary" className="text-xs ml-auto">
                          Vous
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm">{mandate.agency?.agency_name || 'Agence'}</p>
                    {mandate.agency_signed_at && (
                      <Badge variant="outline" className="mt-2 text-green-600 border-green-300">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Signé
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Property */}
                {mandate.property && (
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Bien concerné</h4>
                    <p className="font-medium">{mandate.property.title}</p>
                    <p className="text-sm text-gray-600">
                      {mandate.property.city}
                      {mandate.property.neighborhood && `, ${mandate.property.neighborhood}`}
                    </p>
                  </div>
                )}

                {/* Conditions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">Date de début</span>
                    </div>
                    <p className="font-medium">
                      {format(new Date(mandate.start_date), 'dd MMMM yyyy', { locale: fr })}
                    </p>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Percent className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">Commission</span>
                    </div>
                    <p className="font-medium">{mandate.commission_rate}%</p>
                  </div>
                </div>

                {/* Terms */}
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="terms"
                      checked={acceptedTerms}
                      onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                    />
                    <Label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer">
                      J'ai lu et j'accepte les conditions générales du mandat de gestion immobilière.
                      En signant, j'accepte que cette signature ait valeur légale conformément aux
                      dispositions de la loi ivoirienne sur les transactions électroniques.
                    </Label>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end mt-6">
              <Button
                onClick={() => setCurrentStep('signing')}
                disabled={!acceptedTerms}
                size="large"
                className="bg-blue-600 hover:bg-blue-700"
              >
                Continuer vers la signature
              </Button>
            </div>
          </>
        )}

        {/* Step 2: Signing */}
        {currentStep === 'signing' && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PenTool className="h-5 w-5 text-blue-600" />
                  Signez ci-dessous
                </CardTitle>
                <CardDescription>
                  Dessinez votre signature dans le cadre ci-dessous
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Canvas */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-white">
                  <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full cursor-crosshair"
                    style={{ touchAction: 'none' }}
                  />
                </div>

                {/* Toolbar */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={undo}
                      disabled={historyStep === 0}
                    >
                      <Undo className="h-4 w-4 mr-1" />
                      Annuler
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearCanvas}
                      disabled={!hasSigned}
                    >
                      <Eraser className="h-4 w-4 mr-1" />
                      Effacer
                    </Button>
                  </div>
                  {hasSigned && (
                    <Badge variant="outline" className="text-green-600 border-green-300">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Signé
                    </Badge>
                  )}
                </div>

                {/* Instructions */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <PenTool className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">Conseils pour une signature réussie :</p>
                      <ul className="list-disc list-inside space-y-1 text-blue-700">
                        <li>Utilisez votre doigt ou un stylet pour dessiner</li>
                        <li>Signez de manière lente et régulière</li>
                        <li>Assurez-vous que votre signature est complète et lisible</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between mt-6">
              <Button
                variant="outline"
                onClick={() => setCurrentStep('details')}
              >
                Retour
              </Button>
              <Button
                onClick={handleSubmitSignature}
                disabled={!hasSigned || signing}
                size="large"
                className="bg-blue-600 hover:bg-blue-700 min-w-[200px]"
              >
                {signing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <FileSignature className="h-4 w-4 mr-2" />
                    Enregistrer la signature
                  </>
                )}
              </Button>
            </div>
          </>
        )}

        {/* Step 3: Complete */}
        {currentStep === 'complete' && (
          <Card className="border-green-200 bg-green-50/50">
            <CardContent className="pt-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>

              <h2 className="text-2xl font-bold text-green-800 mb-2">Signature enregistrée !</h2>

              <p className="text-green-700 mb-6 max-w-md mx-auto">
                {mandate.status === 'active'
                  ? 'Le mandat est maintenant actif. Les deux parties ont signé.'
                  : signerType === 'owner'
                    ? "Votre signature a été enregistrée. En attente de la signature de l'agence."
                    : 'Votre signature a été enregistrée. En attente de la signature du propriétaire.'}
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={() => navigate(signerType === 'owner' ? '/proprietaire/mes-mandats' : '/agences/mandats')}
                >
                  Voir mes mandats
                </Button>
                <Button onClick={() => navigate('/mandat/signer/' + id)}>
                  Changer de méthode
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
