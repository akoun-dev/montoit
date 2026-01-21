/**
 * GuarantorForm - Formulaire d'ajout de garant (CDC v3)
 */

import React, { useState } from 'react';
import { UserPlus, Trash2, Send, CheckCircle2, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/shared/ui';

interface Guarantor {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  occupation: string | null;
  employer: string | null;
  monthly_income: number | null;
  relationship: string | null;
  status: string;
  neoface_verified: boolean;
  created_at: string;
}

interface GuarantorFormProps {
  userId: string;
  guarantors: Guarantor[];
  onGuarantorsChange: (guarantors: Guarantor[]) => void;
  maxGuarantors?: number;
}

const RELATIONSHIPS = [
  { value: 'parent', label: 'Parent' },
  { value: 'sibling', label: 'Frère/Sœur' },
  { value: 'employer', label: 'Employeur' },
  { value: 'friend', label: 'Ami(e)' },
  { value: 'other', label: 'Autre' },
];

const STATUS_CONFIG = {
  pending: { label: 'En attente', color: 'text-yellow-600 bg-yellow-50', Icon: Clock },
  invited: { label: 'Invitation envoyée', color: 'text-blue-600 bg-blue-50', Icon: Send },
  verified: { label: 'Vérifié', color: 'text-green-600 bg-green-50', Icon: CheckCircle2 },
  rejected: { label: 'Refusé', color: 'text-red-600 bg-red-50', Icon: AlertCircle },
} as const;

type StatusKey = keyof typeof STATUS_CONFIG;

export default function GuarantorForm({
  userId,
  guarantors,
  onGuarantorsChange,
  maxGuarantors = 2,
}: GuarantorFormProps) {
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    occupation: '',
    employer: '',
    monthly_income: '',
    relationship: 'parent',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.full_name.trim()) {
      toast.error('Le nom du garant est requis');
      return;
    }

    if (!formData.phone.trim() && !formData.email.trim()) {
      toast.error('Téléphone ou email requis');
      return;
    }

    if (guarantors.length >= maxGuarantors) {
      toast.error(`Maximum ${maxGuarantors} garants autorisés`);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('guarantors')
        .insert({
          tenant_id: userId,
          full_name: formData.full_name.trim(),
          phone: formData.phone.trim() || null,
          email: formData.email.trim() || null,
          occupation: formData.occupation.trim() || null,
          employer: formData.employer.trim() || null,
          monthly_income: formData.monthly_income ? parseInt(formData.monthly_income) : null,
          relationship: formData.relationship,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      onGuarantorsChange([...guarantors, data as Guarantor]);
      setFormData({
        full_name: '',
        phone: '',
        email: '',
        occupation: '',
        employer: '',
        monthly_income: '',
        relationship: 'parent',
      });
      setShowForm(false);
      toast.success('Garant ajouté');
    } catch (err) {
      console.error('Error adding guarantor:', err);
      toast.error("Erreur lors de l'ajout");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (guarantorId: string) => {
    try {
      const { error } = await supabase.from('guarantors').delete().eq('id', guarantorId);

      if (error) throw error;

      onGuarantorsChange(guarantors.filter((g) => g.id !== guarantorId));
      toast.success('Garant supprimé');
    } catch (err) {
      console.error('Error deleting guarantor:', err);
      toast.error('Erreur lors de la suppression');
    }
  };

  const sendInvitation = async (_guarantorId: string) => {
    toast.info("Fonctionnalité d'invitation à venir");
  };

  return (
    <div className="space-y-4">
      {/* Guarantors list */}
      {guarantors.length > 0 && (
        <div className="space-y-3">
          {guarantors.map((guarantor) => {
            const statusKey = (guarantor.status as StatusKey) || 'pending';
            const statusInfo = STATUS_CONFIG[statusKey] || STATUS_CONFIG['pending'];
            const StatusIcon = statusInfo.Icon;

            return (
              <div
                key={guarantor.id}
                className="p-4 bg-white rounded-xl border border-[#EFEBE9] space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-[#2C1810]">{guarantor.full_name}</h4>
                    <p className="text-sm text-[#6B5A4E]">
                      {RELATIONSHIPS.find((r) => r.value === guarantor.relationship)?.label ||
                        'Garant'}
                    </p>
                  </div>
                  <div
                    className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}
                  >
                    <StatusIcon className="w-3 h-3" />
                    {statusInfo.label}
                  </div>
                </div>

                {/* Contact info */}
                <div className="text-sm text-[#6B5A4E] space-y-1">
                  {guarantor.phone && <p>📱 {guarantor.phone}</p>}
                  {guarantor.email && <p>✉️ {guarantor.email}</p>}
                  {guarantor.occupation && <p>💼 {guarantor.occupation}</p>}
                  {guarantor.monthly_income && (
                    <p>💰 {guarantor.monthly_income.toLocaleString()} FCFA/mois</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-[#EFEBE9]">
                  {guarantor.status === 'pending' && (
                    <button
                      type="button"
                      onClick={() => sendInvitation(guarantor.id)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-[#EFEBE9] rounded-lg hover:bg-[#FAF7F4]"
                    >
                      <Send className="w-3 h-3" />
                      Envoyer invitation
                    </button>
                  )}
                  {guarantor.status !== 'verified' && (
                    <button
                      type="button"
                      onClick={() => handleDelete(guarantor.id)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-3 h-3" />
                      Supprimer
                    </button>
                  )}
                </div>

                {/* NeoFace badge */}
                {guarantor.neoface_verified && (
                  <div className="flex items-center gap-1 text-xs text-green-600">
                    <CheckCircle2 className="w-3 h-3" />
                    Identité vérifiée par NeoFace
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add button */}
      {!showForm && guarantors.length < maxGuarantors && (
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowForm(true)}
          className="w-full border-dashed border-2 border-[#EFEBE9] hover:border-[#F16522] hover:bg-[#FAF7F4]"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Ajouter un garant
        </Button>
      )}

      {/* Add form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="p-4 bg-white rounded-xl border border-[#EFEBE9] space-y-4"
        >
          <h4 className="font-semibold text-[#2C1810]">Nouveau garant</h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#6B5A4E] mb-1">Nom complet *</label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full px-3 py-2 border border-[#EFEBE9] rounded-lg focus:ring-2 focus:ring-[#F16522] focus:border-transparent text-sm"
                placeholder="Nom du garant"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#6B5A4E] mb-1">Lien</label>
              <select
                value={formData.relationship}
                onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                className="w-full px-3 py-2 border border-[#EFEBE9] rounded-lg focus:ring-2 focus:ring-[#F16522] focus:border-transparent text-sm"
              >
                {RELATIONSHIPS.map((rel) => (
                  <option key={rel.value} value={rel.value}>
                    {rel.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#6B5A4E] mb-1">Téléphone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-[#EFEBE9] rounded-lg focus:ring-2 focus:ring-[#F16522] focus:border-transparent text-sm"
                placeholder="07 XX XX XX XX"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#6B5A4E] mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-[#EFEBE9] rounded-lg focus:ring-2 focus:ring-[#F16522] focus:border-transparent text-sm"
                placeholder="email@exemple.com"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#6B5A4E] mb-1">Profession</label>
              <input
                type="text"
                value={formData.occupation}
                onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                className="w-full px-3 py-2 border border-[#EFEBE9] rounded-lg focus:ring-2 focus:ring-[#F16522] focus:border-transparent text-sm"
                placeholder="Ex: Ingénieur"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#6B5A4E] mb-1">
                Revenus mensuels (FCFA)
              </label>
              <input
                type="number"
                value={formData.monthly_income}
                onChange={(e) => setFormData({ ...formData, monthly_income: e.target.value })}
                className="w-full px-3 py-2 border border-[#EFEBE9] rounded-lg focus:ring-2 focus:ring-[#F16522] focus:border-transparent text-sm"
                placeholder="500000"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button type="submit" disabled={loading} className="bg-[#F16522] hover:bg-[#E55A1B]">
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <UserPlus className="w-4 h-4 mr-2" />
              )}
              Ajouter
            </Button>
            <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
              Annuler
            </Button>
          </div>
        </form>
      )}

      {/* Info */}
      <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-xl text-blue-700 text-xs">
        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
        <p>Un garant augmente significativement vos chances (+20 points).</p>
      </div>
    </div>
  );
}
