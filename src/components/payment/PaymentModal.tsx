/**
 * Modal de paiement Mobile Money
 * Permet de sélectionner l'opérateur et d'entrer le numéro de téléphone du propriétaire
 */

import { useState, useEffect } from 'react';
import { Loader2, CheckCircle, XCircle, Check, User, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Label } from '@/shared/ui/label';
import { usePayment } from '@/hooks/usePayment';
import { intouchService, type MobileMoneyOperator } from '@/services/payments/intouchPaymentService';

// Import des logos des opérateurs Mobile Money
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
  ownerPhone?: string | null;
}

const OPERATORS = [
  { id: 'OM' as MobileMoneyOperator, name: 'Orange Money', logo: orangeLogo, color: '#FF7900' },
  { id: 'MTN' as MobileMoneyOperator, name: 'MTN MoMo', logo: mtnLogo, color: '#FFCC00' },
  { id: 'MOOV' as MobileMoneyOperator, name: 'Moov Money', logo: moovLogo, color: '#00A651' },
  { id: 'WAVE' as MobileMoneyOperator, name: 'Wave', logo: waveLogo, color: '#00BFB3' },
];

export function PaymentModal({
  open,
  onOpenChange,
  amount,
  onSuccess,
  description = 'Paiement de loyer',
  leaseId,
  ownerName,
  ownerPhone
}: PaymentModalProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedOperator, setSelectedOperator] = useState<MobileMoneyOperator>('OM');
  const [phoneError, setPhoneError] = useState('');
  const [useCustomPhone, setUseCustomPhone] = useState(false);

  const { processRentalPayment, isProcessing, error } = usePayment();

  // Initialize phone number with owner's phone when modal opens
  useEffect(() => {
    if (open && ownerPhone && !useCustomPhone) {
      setPhoneNumber(ownerPhone);
    }
  }, [open, ownerPhone, useCustomPhone]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('fr-FR').format(value);

  const handlePayment = async () => {
    setPhoneError('');

    // Valider le numéro de téléphone
    const validation = intouchService.validatePhoneNumber(phoneNumber);
    if (!validation.valid) {
      setPhoneError(validation.error || 'Numéro de téléphone invalide');
      return;
    }

    try {
      await processRentalPayment(
        amount,
        validation.formatted,
        selectedOperator,
        description,
        leaseId
      );
      onSuccess?.();
      onOpenChange(false);
      // Reset form
      setPhoneNumber('');
      setPhoneError('');
    } catch (err) {
      console.error('Payment error:', err);
      setPhoneError(err instanceof Error ? err.message : 'Une erreur est survenue');
    }
  };

  const handlePhoneChange = (value: string) => {
    setPhoneNumber(value);
    setPhoneError('');
    setUseCustomPhone(true);
  };

  const handleUseOwnerPhone = () => {
    if (ownerPhone) {
      setPhoneNumber(ownerPhone);
      setUseCustomPhone(false);
      setPhoneError('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-[#2C1810]">
            Effectuer un paiement
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Montant */}
          <div>
            <Label className="text-sm font-medium text-[#2C1810]">Montant à payer</Label>
            <div className="text-2xl font-bold text-[#F16522] mt-2">
              {formatCurrency(amount)} FCFA
            </div>
          </div>

          {/* Bénéficiaire du paiement */}
          {ownerName && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-blue-700 font-medium">Bénéficiaire du paiement</p>
                  <p className="text-lg font-bold text-blue-900">{ownerName}</p>
                </div>
              </div>
            </div>
          )}

          {/* Opérateur Mobile Money */}
          <div>
            <Label className="text-sm font-medium text-[#2C1810] mb-3">
              Opérateur Mobile Money
            </Label>
            <div className="grid grid-cols-2 gap-3">
              {OPERATORS.map((op) => (
                <Card
                  key={op.id}
                  className={`cursor-pointer transition-all border-2 relative ${
                    selectedOperator === op.id
                      ? 'border-[#F16522] bg-[#FFF5F0] shadow-md'
                      : 'border-[#EFEBE9] hover:border-[#F16522]/50 bg-white'
                  }`}
                  onClick={() => setSelectedOperator(op.id)}
                >
                  {selectedOperator === op.id && (
                    <div className="absolute top-2 right-2 bg-[#F16522] rounded-full p-1">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div className="p-6 text-center">
                    <img
                      src={op.logo}
                      alt={op.name}
                      className="h-32 w-32 mx-auto mb-3 object-contain"
                    />
                    <div className="text-sm font-medium text-[#2C1810]">{op.name}</div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Numéro de téléphone du bénéficiaire */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="phone" className="text-sm font-medium text-[#2C1810]">
                Numéro Mobile Money du bénéficiaire
              </Label>
              {ownerPhone && useCustomPhone && (
                <button
                  type="button"
                  onClick={handleUseOwnerPhone}
                  className="text-xs text-[#F16522] hover:underline font-medium"
                >
                  Utiliser le numéro du propriétaire
                </button>
              )}
            </div>
            <div className="relative">
              <input
                id="phone"
                type="tel"
                placeholder="07 XX XX XX XX"
                value={phoneNumber}
                onChange={(e) => handlePhoneChange(e.target.value)}
                className="w-full px-4 py-3 bg-[#FAF7F4] border border-[#EFEBE9] rounded-xl focus:ring-2 focus:ring-[#F16522] focus:border-[#F16522] font-mono pr-10"
              />
              {ownerPhone && !useCustomPhone && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Check className="w-5 h-5 text-green-500" />
                </div>
              )}
            </div>
            {phoneError && (
              <p className="text-red-500 text-sm mt-2 flex items-center gap-2">
                <XCircle className="w-4 h-4" />
                {phoneError}
              </p>
            )}
            <div className="flex items-start gap-2 mt-2 text-xs text-[#2C1810]/60">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>
                Ce numéro doit être le compte Mobile Money du bénéficiaire ({ownerName || 'propriétaire'}).
                Vérifiez bien le numéro avant de confirmer.
              </p>
            </div>
          </div>

          {/* Message d'erreur général */}
          {error && !phoneError && (
            <div className="text-red-500 text-sm flex items-center gap-2 bg-red-50 p-3 rounded-lg">
              <XCircle className="w-4 h-4 flex-shrink-0" />
              {error instanceof Error ? error.message : 'Une erreur est survenue'}
            </div>
          )}

          {/* Bouton de paiement */}
          <Button
            onClick={handlePayment}
            disabled={isProcessing || !phoneNumber || phoneNumber.replace(/\D/g, '').length < 10}
            className="w-full bg-[#F16522] hover:bg-[#d9571d] text-white py-4 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                Traitement en cours...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5 mr-3" />
                Confirmer le paiement
              </>
            )}
          </Button>

          {/* Note de sécurité */}
          <div className="text-xs text-[#2C1810]/60 text-center">
            Paiement sécurisé via InTouch API • Commission incluse
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
