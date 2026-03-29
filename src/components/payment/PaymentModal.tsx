/**
 * Modal de paiement Mobile Money - Version simplifiée
 */

import { useState, useEffect } from 'react';
import { Loader2, CheckCircle } from 'lucide-react';
import { Dialog, DialogContent } from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/Button';
import { usePayment } from '@/hooks/usePayment';
import { intouchService, type MobileMoneyOperator } from '@/services/payments/intouchPaymentService';

import orangeLogo from '/assets/img/orange-money-logo.webp';
import mtnLogo from '/assets/img/mtn-momo-logo.webp';
import moovLogo from '/assets/img/moov-money-logo.webp';
import waveLogo from '/assets/img/wave-logo.png';

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amount: number;
  onSuccess?: () => void;
  description?: string;
  leaseId?: string;
  ownerName?: string;
  ownerPhone?: string | null;  // Numéro du propriétaire (pour affichage info)
  payerPhone?: string | null;  // Numéro du locataire (payeur) pour CASHIN
}

const OPERATORS = [
  { id: 'OM' as MobileMoneyOperator, logo: orangeLogo },
  { id: 'MTN' as MobileMoneyOperator, logo: mtnLogo },
  { id: 'MOOV' as MobileMoneyOperator, logo: moovLogo },
  { id: 'WAVE' as MobileMoneyOperator, logo: waveLogo },
];

export function PaymentModal({
  open,
  onOpenChange,
  amount,
  onSuccess,
  description = 'Paiement de loyer',
  leaseId,
  ownerName,
  ownerPhone,
  payerPhone  // Numéro du locataire (payeur) pour CASHIN
}: PaymentModalProps) {
  const [selectedOperator, setSelectedOperator] = useState<MobileMoneyOperator>('OM');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [otpError, setOtpError] = useState('');

  useEffect(() => {
    if (open) {
      setOtp('');
      setError('');
      setOtpError('');
    }
  }, [open]);

  const { processRentalPayment, isProcessing } = usePayment();

  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined || isNaN(value)) {
      return '0';
    }
    return new Intl.NumberFormat('fr-FR').format(value);
  };

  const handlePayment = async () => {
    // IMPORTANT: payerPhone est le numéro du LOCATAIRE (payeur)
    // En CASHIN, c'est le payeur qui reçoit la demande de paiement sur son téléphone
    if (!payerPhone) {
      setError('Numéro de téléphone du locataire non configuré');
      return;
    }

    setError('');
    setOtpError('');

    // OTP requis uniquement pour Orange Money, optionnel pour les autres
    if (selectedOperator === 'OM' && (!otp || otp.length < 4 || otp.length > 6 || !/^\d{4,6}$/.test(otp))) {
      setOtpError('Code OTP requis pour Orange Money (4-6 chiffres)');
      return;
    }

    if (otp && (otp.length < 4 || otp.length > 6 || !/^\d{4,6}$/.test(otp))) {
      setOtpError('Code invalide (4-6 chiffres)');
      return;
    }

    try {
      const validation = intouchService.validatePhoneNumber(payerPhone);
      if (!validation.valid) {
        setError(validation.error || 'Numéro de téléphone invalide');
        return;
      }

      await processRentalPayment(amount, validation.formatted, selectedOperator, description, leaseId, otp || undefined);
      onSuccess?.();
      onOpenChange(false);
      setOtp('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur de paiement';
      if (msg.toLowerCase().includes('otp')) {
        setOtpError(msg);
      } else {
        setError(msg);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm p-5 gap-4">
        {/* Montant */}
        <div className="text-center">
          <p className="text-sm text-gray-500">Montant à payer</p>
          <p className="text-3xl font-bold text-[#F16522]">{formatCurrency(amount)} F</p>
          {ownerName && (
            <p className="text-xs text-gray-400 mt-1">
              Au bénéfice de : {ownerName}
              {ownerPhone && ` (${ownerPhone})`}
            </p>
          )}
        </div>

        {/* Numéro qui sera débité */}
        {payerPhone && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-700 text-center">
              <span className="font-medium">Numéro à débiter :</span> {payerPhone}
            </p>
            <p className="text-xs text-blue-600 text-center mt-1">
              Vous recevrez une demande de validation sur ce numéro
            </p>
          </div>
        )}

        {/* Opérateurs */}
        <div className="grid grid-cols-4 gap-2">
          {OPERATORS.map((op) => (
            <button
              key={op.id}
              onClick={() => setSelectedOperator(op.id)}
              className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center justify-center aspect-square ${
                selectedOperator === op.id
                  ? 'border-[#F16522] bg-orange-50'
                  : 'border-gray-200 hover:border-[#F16522]/50 hover:bg-gray-50'
              }`}
            >
              <img src={op.logo} alt="" className="w-10 h-10 object-contain mb-1" />
              {selectedOperator === op.id && (
                <CheckCircle className="w-4 h-4 text-[#F16522]" />
              )}
            </button>
          ))}
        </div>

        {/* OTP - Requis pour Orange Money, optionnel pour les autres */}
        <div>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder={selectedOperator === 'OM' ? "Code OTP (requis, 4-6 chiffres)" : "Code OTP (optionnel, 4-6 chiffres)"}
            value={otp}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '').slice(0, 6);
              setOtp(value);
              setOtpError('');
            }}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-center text-xl font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-[#F16522] focus:border-transparent"
          />
          {otpError && (
            <p className="text-red-500 text-xs mt-1 text-center">{otpError}</p>
          )}
        </div>

        {/* Erreur */}
        {error && !otpError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-center">
            <p className="text-red-700 text-xs">{error}</p>
          </div>
        )}

        {!payerPhone && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-center">
            <p className="text-amber-700 text-xs">Numéro de téléphone non configuré dans votre profil</p>
          </div>
        )}

        {/* Bouton */}
        <Button
          onClick={handlePayment}
          disabled={isProcessing || !payerPhone || (selectedOperator === 'OM' && (!otp || otp.length < 4))}
          className="w-full bg-[#F16522] hover:bg-[#d9571d] text-white py-3 rounded-xl font-medium disabled:opacity-50"
        >
          {isProcessing ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Traitement...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Payer
            </span>
          )}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
