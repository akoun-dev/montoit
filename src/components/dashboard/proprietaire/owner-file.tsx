'use client'

import { useState, useEffect, useCallback } from 'react'
import { FileText, Upload, CheckCircle2, ChevronRight, ChevronLeft, Save, Send, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { toast } from 'sonner'
import { motion } from 'framer-motion'

// ─── Types ──────────────────────────────────────────────────────────────────
interface OwnerFileDoc {
  id: string
  type: string
  url: string
  name: string
  status: string
  tcComment: string | null
  createdAt: string
}

interface OwnerFileItem {
  id: string
  status: string
  monthlyIncome: number | null
  employer: string | null
  employmentType: string | null
  guarantorName: string | null
  guarantorPhone: string | null
  guarantorRelation: string | null
  validUntil: string | null
  rejectionReason: string | null
  tcComment: string | null
  reviewedAt: string | null
  createdAt: string
  updatedAt: string
  documents: OwnerFileDoc[]
  reviewedBy: { id: string; firstName: string; lastName: string } | null
}

interface OwnerFileResponse {
  data: OwnerFileItem[]
  stats: Record<string, number>
}

// ─── Step definition ───────────────────────────────────────────────────────
const steps = [
  { id: 1, title: 'Informations personnelles' },
  { id: 2, title: 'Revenus & Emploi' },
  { id: 3, title: 'Garant' },
  { id: 4, title: 'Documents' },
]

const documentTypes = [
  { type: 'ID_CARD', label: "Carte d'identité / Passeport" },
  { type: 'PAY_SLIP', label: 'Fiche de paie (3 derniers mois)' },
  { type: 'EMPLOYMENT_CONTRACT', label: 'Contrat de travail' },
  { type: 'BANK_STATEMENT', label: 'Relevé bancaire' },
  { type: 'PROOF_OF_ADDRESS', label: 'Justificatif de domicile' },
  { type: 'OTHER', label: 'Autre document justificatif' },
]

const statusConfig: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Brouillon', color: 'bg-muted text-muted-foreground' },
  SUBMITTED: { label: 'Soumis', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  TC_REVIEW: { label: 'En examen TC', color: 'bg-brand-50 text-brand-600 border-brand-200' },
  VALIDATED: { label: 'Validé', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  REJECTED: { label: 'Rejeté', color: 'bg-red-50 text-red-700 border-red-200' },
  EXPIRED: { label: 'Expiré', color: 'bg-muted text-muted-foreground border-border' },
}

export function OwnerFileForm() {
  const { user, isAuthenticated } = useAuthStore()
  const [step, setStep] = useState(1)
  const [existingFile, setExistingFile] = useState<OwnerFileItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    monthlyIncome: '',
    employer: '',
    employmentType: 'CDI',
    guarantorName: '',
    guarantorPhone: '',
    guarantorRelation: '',
  })

  const fetchOwnerFile = useCallback(async () => {
    if (!isAuthenticated) { setLoading(false); return }
    try {
      const result = await authFetch<OwnerFileResponse>('/api/owner-file')
      const files = result.data ?? []
      // Find DRAFT if exists, otherwise take the most recent
      const draft = files.find((f) => f.status === 'DRAFT') || files[0]
      if (draft) {
        setExistingFile(draft)
        setFormData({
          monthlyIncome: draft.monthlyIncome?.toString() || '',
          employer: draft.employer || '',
          employmentType: draft.employmentType || 'CDI',
          guarantorName: draft.guarantorName || '',
          guarantorPhone: draft.guarantorPhone || '',
          guarantorRelation: draft.guarantorRelation || '',
        })
      }
    } catch (err) {
      if (err instanceof AuthError && err.status === 401) { return }
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => { fetchOwnerFile() }, [fetchOwnerFile])

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSaveDraft = async () => {
    setSaving(true)
    try {
      await authFetch('/api/owner-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monthlyIncome: formData.monthlyIncome ? parseFloat(formData.monthlyIncome) : undefined,
          employer: formData.employer || undefined,
          employmentType: formData.employmentType || undefined,
          guarantorName: formData.guarantorName || undefined,
          guarantorPhone: formData.guarantorPhone || undefined,
          guarantorRelation: formData.guarantorRelation || undefined,
        }),
      })
      toast.success('Brouillon sauvegardé')
      fetchOwnerFile()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur de sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      await authFetch('/api/owner-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monthlyIncome: formData.monthlyIncome ? parseFloat(formData.monthlyIncome) : undefined,
          employer: formData.employer || undefined,
          employmentType: formData.employmentType || undefined,
          guarantorName: formData.guarantorName || undefined,
          guarantorPhone: formData.guarantorPhone || undefined,
          guarantorRelation: formData.guarantorRelation || undefined,
          submit: true,
        }),
      })
      toast.success('Dossier propriétaire soumis avec succès ! Il sera examiné par un Tiers de Confiance.')
      fetchOwnerFile()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la soumission')
    } finally {
      setSubmitting(false)
    }
  }

  // ─── Loading skeleton ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-8 w-40 bg-muted animate-pulse rounded" />
          <div className="h-4 w-56 bg-muted animate-pulse rounded mt-2" />
        </div>
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-8 w-24 bg-muted animate-pulse rounded-full" />
          ))}
        </div>
        <div className="h-64 rounded-xl bg-muted animate-pulse" />
      </div>
    )
  }

  // ─── Error state ───────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-foreground">Dossier propriétaire</h1>
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <p className="text-sm text-amber-700">Impossible de charger votre dossier. Veuillez réessayer.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Check if existing file is already submitted (not DRAFT)
  const isReadOnly = existingFile && existingFile.status !== 'DRAFT'
  const existingStatus = existingFile ? statusConfig[existingFile.status] : null

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dossier propriétaire</h1>
        <p className="text-muted-foreground mt-1">Complétez votre dossier pour vérifier votre profil de propriétaire</p>
      </div>

      {/* Existing file status banner */}
      {existingFile && existingStatus && (
        <Card className={`border ${existingFile.status === 'VALIDATED' ? 'border-emerald-200 bg-emerald-50' : existingFile.status === 'REJECTED' ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              {existingFile.status === 'VALIDATED' ? (
                <CheckCircle2 className="size-5 text-emerald-600 shrink-0" />
              ) : existingFile.status === 'REJECTED' ? (
                <AlertCircle className="size-5 text-red-600 shrink-0" />
              ) : (
                <FileText className="size-5 text-amber-600 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">
                  Statut du dossier : <Badge variant="outline" className={`text-[10px] px-2 py-0.5 border ${existingStatus.color}`}>{existingStatus.label}</Badge>
                </p>
                {existingFile.rejectionReason && (
                  <p className="text-xs text-red-600 mt-1">Raison : {existingFile.rejectionReason}</p>
                )}
                {existingFile.tcComment && (
                  <p className="text-xs text-muted-foreground mt-1">Commentaire TC : {existingFile.tcComment}</p>
                )}
                {existingFile.validUntil && (
                  <p className="text-xs text-muted-foreground mt-1">Valide jusqu&apos;au {new Date(existingFile.validUntil).toLocaleDateString('fr-FR')}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progress Steps */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2">
            <div className={`flex items-center justify-center size-8 rounded-full text-sm font-medium ${
              step >= s.id ? 'bg-brand-500 text-white' : 'bg-muted text-muted-foreground'
            }`}>
              {step > s.id ? <CheckCircle2 className="size-5" /> : s.id}
            </div>
            <span className={`text-sm hidden sm:inline ${
              step >= s.id ? 'text-foreground font-medium' : 'text-muted-foreground'
            }`}>
              {s.title}
            </span>
            {i < steps.length - 1 && (
              <div className={`hidden sm:block w-8 h-0.5 ${step > s.id ? 'bg-brand-500' : 'bg-neutral-200'}`} />
            )}
          </div>
        ))}
      </div>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg">{steps[step - 1].title}</CardTitle>
          <CardDescription>Étape {step} sur {steps.length}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Step 1: Personal Info */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Prénom</Label>
                  <Input value={user?.firstName || ''} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Nom</Label>
                  <Input value={user?.lastName || ''} disabled />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Téléphone</Label>
                <Input value={user?.phone || 'Non renseigné'} disabled />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={user?.email || ''} disabled />
              </div>
            </div>
          )}

          {/* Step 2: Income */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Revenus mensuels (FCFA)</Label>
                <Input
                  type="number"
                  placeholder="500000"
                  value={formData.monthlyIncome}
                  onChange={(e) => updateField('monthlyIncome', e.target.value)}
                  disabled={isReadOnly}
                />
              </div>
              <div className="space-y-2">
                <Label>Employeur</Label>
                <Input
                  placeholder="Nom de l'entreprise"
                  value={formData.employer}
                  onChange={(e) => updateField('employer', e.target.value)}
                  disabled={isReadOnly}
                />
              </div>
              <div className="space-y-2">
                <Label>Type d&apos;emploi</Label>
                <Select value={formData.employmentType} onValueChange={(v) => updateField('employmentType', v)} disabled={isReadOnly}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CDI">CDI</SelectItem>
                    <SelectItem value="CDD">CDD</SelectItem>
                    <SelectItem value="FREELANCE">Free-lance</SelectItem>
                    <SelectItem value="RETIRED">Retraité</SelectItem>
                    <SelectItem value="OTHER">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Step 3: Guarantor */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nom du garant</Label>
                <Input
                  placeholder="Nom complet du garant"
                  value={formData.guarantorName}
                  onChange={(e) => updateField('guarantorName', e.target.value)}
                  disabled={isReadOnly}
                />
              </div>
              <div className="space-y-2">
                <Label>Téléphone du garant</Label>
                <Input
                  placeholder="+225 XX XX XX XX"
                  value={formData.guarantorPhone}
                  onChange={(e) => updateField('guarantorPhone', e.target.value)}
                  disabled={isReadOnly}
                />
              </div>
              <div className="space-y-2">
                <Label>Relation avec le garant</Label>
                <Select value={formData.guarantorRelation} onValueChange={(v) => updateField('guarantorRelation', v)} disabled={isReadOnly}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="parent">Parent</SelectItem>
                    <SelectItem value="frere_soeur">Frère/Sœur</SelectItem>
                    <SelectItem value="ami">Ami</SelectItem>
                    <SelectItem value="autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Step 4: Documents */}
          {step === 4 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Téléchargez les documents nécessaires pour votre dossier de propriétaire.
              </p>
              {/* Show existing documents */}
              {existingFile?.documents && existingFile.documents.length > 0 && (
                <div className="space-y-2 mb-4">
                  <p className="text-xs font-medium text-muted-foreground">Documents déjà téléchargés :</p>
                  {existingFile.documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-muted">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="size-4 text-muted-foreground shrink-0" />
                        <span className="text-sm text-foreground truncate">{doc.name}</span>
                      </div>
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 shrink-0 ${
                        doc.status === 'VALIDATED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : doc.status === 'REJECTED' ? 'bg-red-50 text-red-700 border-red-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {doc.status === 'VALIDATED' ? 'Validé' : doc.status === 'REJECTED' ? 'Rejeté' : 'En attente'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
              {/* Document upload placeholders */}
              {documentTypes.map((doc) => {
                const alreadyUploaded = existingFile?.documents?.some((d) => d.type === doc.type)
                if (alreadyUploaded) return null

                return (
                  <div key={doc.type} className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div className="flex items-center gap-3">
                      <FileText className="size-4 text-muted-foreground" />
                      <span className="text-sm text-foreground">{doc.label}</span>
                    </div>
                    <Button variant="outline" size="sm" className="gap-1.5" disabled>
                      <Upload className="size-3.5" />
                      Télécharger
                    </Button>
                  </div>
                )
              })}
              <p className="text-xs text-muted-foreground italic">
                L&apos;upload de documents sera bientôt disponible. Vous pouvez soumettre votre dossier sans documents pour l&apos;instant.
              </p>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <Button
              variant="outline"
              onClick={() => setStep(Math.max(1, step - 1))}
              disabled={step === 1}
              className="gap-1"
            >
              <ChevronLeft className="size-4" />
              Précédent
            </Button>
            <div className="flex items-center gap-2">
              {!isReadOnly && (
                <Button
                  variant="outline"
                  onClick={handleSaveDraft}
                  disabled={saving}
                  className="gap-1.5"
                >
                  <Save className="size-4" />
                  {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                </Button>
              )}
              {step < steps.length ? (
                <Button
                  onClick={() => setStep(step + 1)}
                  className="bg-brand-500 hover:bg-brand-600 text-white gap-1"
                  disabled={isReadOnly}
                >
                  Suivant
                  <ChevronRight className="size-4" />
                </Button>
              ) : (
                !isReadOnly && (
                  <Button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="bg-brand-500 hover:bg-brand-600 text-white gap-1"
                  >
                    {submitting ? (
                      'Envoi...'
                    ) : (
                      <>
                        <Send className="size-4" />
                        Soumettre le dossier
                      </>
                    )}
                  </Button>
                )
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
