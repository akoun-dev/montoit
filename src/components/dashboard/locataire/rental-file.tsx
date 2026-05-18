'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  FileText, Upload, CheckCircle2, ChevronRight, ChevronLeft,
  Save, Send, AlertCircle, Briefcase, GraduationCap, User,
  X, Eye, Trash2
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { toast } from 'sonner'
import { motion } from 'framer-motion'

// ─── Types ──────────────────────────────────────────────────────────────────
interface RentalFileDoc {
  id: string
  type: string
  url: string
  name: string
  status: string
  tcComment: string | null
  createdAt: string
}

interface RentalFileItem {
  id: string
  status: string
  tenantCategory: string | null
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
  documents: RentalFileDoc[]
  leases: Array<{
    id: string
    status: string
    property: { id: string; title: string; address: string; city: string }
  }>
  reviewedBy: { id: string; firstName: string; lastName: string } | null
}

interface RentalFileResponse {
  data: RentalFileItem[]
  stats: Record<string, number>
}

// ─── Tenant category config ─────────────────────────────────────────────────
const tenantCategories = [
  {
    id: 'SALARIE',
    label: 'Salarié',
    description: 'Vous avez un emploi avec contrat de travail',
    icon: Briefcase,
    color: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    activeColor: 'bg-emerald-100 border-emerald-400 ring-2 ring-emerald-400',
    iconColor: 'text-emerald-500',
  },
  {
    id: 'ENTREPRENEUR',
    label: 'Entrepreneur / Indépendant',
    description: 'Vous êtes travailleur indépendant ou chef d\'entreprise',
    icon: User,
    color: 'bg-brand-50 border-brand-200 text-brand-700',
    activeColor: 'bg-brand-100 border-brand-400 ring-2 ring-brand-400',
    iconColor: 'text-brand-500',
  },
  {
    id: 'ETUDIANT',
    label: 'Étudiant',
    description: 'Vous êtes étudiant et pouvez fournir un garant',
    icon: GraduationCap,
    color: 'bg-violet-50 border-violet-200 text-violet-700',
    activeColor: 'bg-violet-100 border-violet-400 ring-2 ring-violet-400',
    iconColor: 'text-violet-500',
  },
]

// ─── Document requirements per category ─────────────────────────────────────
interface DocRequirement {
  type: string
  label: string
  description?: string
  required: boolean
  accept?: string
}

const documentRequirements: Record<string, DocRequirement[]> = {
  SALARIE: [
    { type: 'ID_CARD', label: "Carte d'identité ou Passeport", required: true, accept: '.pdf,.jpg,.jpeg,.png' },
    { type: 'EMPLOYMENT_CONTRACT', label: 'Contrat de travail', required: false, accept: '.pdf,.jpg,.jpeg,.png' },
    { type: 'WORK_CERTIFICATE', label: 'Attestation de travail récente', required: false, accept: '.pdf,.jpg,.jpeg,.png' },
    { type: 'PAY_SLIP', label: 'Bulletins de salaire (3 derniers mois)', description: 'Fournir les 3 derniers bulletins', required: false, accept: '.pdf,.jpg,.jpeg,.png' },
    { type: 'BANK_STATEMENT', label: 'Relevés bancaires (3 derniers mois)', required: false, accept: '.pdf' },
    { type: 'PROOF_OF_ADDRESS', label: 'Justificatif de domicile actuel', description: 'Facture CIE, SODECI ou quittance de loyer', required: false, accept: '.pdf,.jpg,.jpeg,.png' },
  ],
  ENTREPRENEUR: [
    { type: 'ID_CARD', label: "Carte d'identité ou Passeport", required: true, accept: '.pdf,.jpg,.jpeg,.png' },
    { type: 'RCCM_REGISTRATION', label: 'Attestation d\'immatriculation (RCCM)', required: false, accept: '.pdf,.jpg,.jpeg,.png' },
    { type: 'TAX_DECLARATION', label: 'Dernière déclaration fiscale', required: false, accept: '.pdf,.jpg,.jpeg,.png' },
    { type: 'BANK_STATEMENT', label: 'Relevés bancaires (3 derniers mois)', required: false, accept: '.pdf' },
    { type: 'PROOF_OF_ADDRESS', label: 'Justificatif de domicile actuel', description: 'Facture CIE, SODECI', required: false, accept: '.pdf,.jpg,.jpeg,.png' },
  ],
  ETUDIANT: [
    { type: 'ID_CARD', label: "Carte d'identité ou Passeport", required: true, accept: '.pdf,.jpg,.jpeg,.png' },
    { type: 'SCHOOL_CERTIFICATE', label: 'Certificat de scolarité', required: false, accept: '.pdf,.jpg,.jpeg,.png' },
    { type: 'SCHOLARSHIP_CERTIFICATE', label: 'Attestation de bourse', description: 'Si applicable', required: false, accept: '.pdf,.jpg,.jpeg,.png' },
    { type: 'PARENT_ADDRESS_PROOF', label: 'Justificatif de domicile des parents', required: false, accept: '.pdf,.jpg,.jpeg,.png' },
    { type: 'GUARANTOR_ID', label: "Pièce d'identité du garant", required: false, accept: '.pdf,.jpg,.jpeg,.png' },
    { type: 'GUARANTOR_INCOME_PROOF', label: 'Justificatif de revenus du garant', required: false, accept: '.pdf,.jpg,.jpeg,.png' },
  ],
}

// ─── Step definition ───────────────────────────────────────────────────────
const steps = [
  { id: 1, title: 'Catégorie' },
  { id: 2, title: 'Informations' },
  { id: 3, title: 'Garant' },
  { id: 4, title: 'Documents' },
]

const statusConfig: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Brouillon', color: 'bg-muted text-muted-foreground' },
  SUBMITTED: { label: 'Soumis', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  TC_REVIEW: { label: 'En examen TC', color: 'bg-brand-50 text-brand-600 border-brand-200' },
  VALIDATED: { label: 'Validé', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  REJECTED: { label: 'Rejeté', color: 'bg-red-50 text-red-700 border-red-200' },
  EXPIRED: { label: 'Expiré', color: 'bg-muted text-muted-foreground border-border' },
}

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

export function RentalFileForm() {
  const { user, isAuthenticated } = useAuthStore()
  const [step, setStep] = useState(1)
  const [existingFile, setExistingFile] = useState<RentalFileItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [uploadingDocType, setUploadingDocType] = useState<string | null>(null)

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const [formData, setFormData] = useState({
    tenantCategory: '',
    monthlyIncome: '',
    employer: '',
    employmentType: 'CDI',
    guarantorName: '',
    guarantorPhone: '',
    guarantorRelation: '',
  })

  const fetchRentalFile = useCallback(async () => {
    if (!isAuthenticated) { setLoading(false); return }
    try {
      const result = await authFetch<RentalFileResponse>('/api/rental-file')
      const files = result.data ?? []
      const draft = files.find((f) => f.status === 'DRAFT') || files[0]
      if (draft) {
        setExistingFile(draft)
        setFormData({
          tenantCategory: draft.tenantCategory || '',
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

  useEffect(() => { fetchRentalFile() }, [fetchRentalFile])

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSaveDraft = async () => {
    setSaving(true)
    try {
      await authFetch('/api/rental-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantCategory: formData.tenantCategory || undefined,
          monthlyIncome: formData.monthlyIncome ? parseFloat(formData.monthlyIncome) : undefined,
          employer: formData.employer || undefined,
          employmentType: formData.employmentType || undefined,
          guarantorName: formData.guarantorName || undefined,
          guarantorPhone: formData.guarantorPhone || undefined,
          guarantorRelation: formData.guarantorRelation || undefined,
        }),
      })
      toast.success('Brouillon sauvegardé')
      fetchRentalFile()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur de sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = async () => {
    if (!formData.tenantCategory) {
      toast.error('Veuillez sélectionner votre catégorie')
      return
    }
    setSubmitting(true)
    try {
      await authFetch('/api/rental-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantCategory: formData.tenantCategory,
          monthlyIncome: formData.monthlyIncome ? parseFloat(formData.monthlyIncome) : undefined,
          employer: formData.employer || undefined,
          employmentType: formData.employmentType || undefined,
          guarantorName: formData.guarantorName || undefined,
          guarantorPhone: formData.guarantorPhone || undefined,
          guarantorRelation: formData.guarantorRelation || undefined,
          submit: true,
        }),
      })
      toast.success('Dossier soumis avec succès ! Il sera examiné par un Tiers de Confiance.')
      fetchRentalFile()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la soumission')
    } finally {
      setSubmitting(false)
    }
  }

  // ─── File upload handler ──────────────────────────────────────────────
  const handleFileUpload = async (docType: string, file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      toast.error('Le fichier ne doit pas dépasser 5 Mo')
      return
    }

    // Ensure rental file exists first
    if (!existingFile) {
      // Auto-save draft first
      try {
        await authFetch('/api/rental-file', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tenantCategory: formData.tenantCategory || undefined,
          }),
        })
        // Re-fetch to get the ID
        await fetchRentalFile()
      } catch {
        toast.error('Erreur lors de la création du dossier')
        return
      }
    }

    // Re-check after potential creation
    if (!existingFile && !formData.tenantCategory) {
      toast.error('Veuillez d\'abord sélectionner votre catégorie')
      return
    }

    setUploadingDocType(docType)

    try {
      // Convert to base64
      const reader = new FileReader()
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      const base64Content = await base64Promise

      // Get the current rental file (may have just been created)
      const result = await authFetch<RentalFileResponse>('/api/rental-file')
      const files = result.data ?? []
      const currentFile = files.find((f) => f.status === 'DRAFT') || files[0]

      if (!currentFile) {
        toast.error('Dossier non trouvé')
        return
      }

      await authFetch('/api/rental-file/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rentalFileId: currentFile.id,
          type: docType,
          name: file.name,
          content: base64Content,
        }),
      })

      toast.success('Document téléchargé avec succès')
      fetchRentalFile()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors du téléchargement')
    } finally {
      setUploadingDocType(null)
    }
  }

  const handleDeleteDocument = async (docId: string) => {
    try {
      await authFetch(`/api/rental-file/documents?docId=${docId}`, {
        method: 'DELETE',
      })
      toast.success('Document supprimé')
      fetchRentalFile()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la suppression')
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
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Dossier locatif</h1>
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <p className="text-sm text-amber-700">Impossible de charger votre dossier. Veuillez réessayer.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Check if existing file is already submitted (not DRAFT)
  const isReadOnly = !!(existingFile && existingFile.status !== 'DRAFT')
  const existingStatus = existingFile ? statusConfig[existingFile.status] : null
  const currentCategory = formData.tenantCategory || existingFile?.tenantCategory
  const requiredDocs = currentCategory ? documentRequirements[currentCategory] : []
  const categoryConfig = tenantCategories.find(c => c.id === currentCategory)

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Dossier locatif</h1>
        <p className="text-muted-foreground mt-1">Complétez votre dossier pour postuler aux logements</p>
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
                  {categoryConfig && (
                    <Badge variant="outline" className="text-[10px] px-2 py-0.5 ml-2 bg-muted">
                      {categoryConfig.label}
                    </Badge>
                  )}
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
            <button
              onClick={() => !isReadOnly && setStep(s.id)}
              className={`flex items-center justify-center size-8 rounded-full text-sm font-medium transition-colors ${
                step >= s.id ? 'bg-brand-500 text-white' : 'bg-muted text-muted-foreground'
              } ${!isReadOnly ? 'cursor-pointer' : ''}`}
            >
              {step > s.id ? <CheckCircle2 className="size-5" /> : s.id}
            </button>
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
          {/* Step 1: Category Selection + Personal Info */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <Label className="text-base font-semibold mb-3 block">Vous êtes :</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {tenantCategories.map((cat) => {
                    const Icon = cat.icon
                    const isActive = formData.tenantCategory === cat.id
                    return (
                      <button
                        key={cat.id}
                        onClick={() => !isReadOnly && updateField('tenantCategory', cat.id)}
                        disabled={isReadOnly}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${
                          isActive ? cat.activeColor : cat.color
                        } ${isReadOnly ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:scale-[1.02]'}`}
                      >
                        <Icon className={`size-6 mb-2 ${isActive ? cat.iconColor : 'text-current'}`} />
                        <p className="font-semibold text-sm">{cat.label}</p>
                        <p className="text-xs mt-1 opacity-80">{cat.description}</p>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <p className="text-sm font-medium mb-3 text-muted-foreground">Informations personnelles</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Prénom</Label>
                    <Input value={user?.firstName || ''} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Nom</Label>
                    <Input value={user?.lastName || ''} disabled />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2">
                    <Label>Téléphone</Label>
                    <Input value={user?.phone || 'Non renseigné'} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input value={user?.email || ''} disabled />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Category-specific info */}
          {step === 2 && (
            <div className="space-y-4">
              {currentCategory === 'SALARIE' && (
                <>
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
                </>
              )}

              {currentCategory === 'ENTREPRENEUR' && (
                <>
                  <div className="space-y-2">
                    <Label>Revenus mensuels moyens (FCFA)</Label>
                    <Input
                      type="number"
                      placeholder="500000"
                      value={formData.monthlyIncome}
                      onChange={(e) => updateField('monthlyIncome', e.target.value)}
                      disabled={isReadOnly}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nom de l&apos;entreprise / Activité</Label>
                    <Input
                      placeholder="Nom de votre activité"
                      value={formData.employer}
                      onChange={(e) => updateField('employer', e.target.value)}
                      disabled={isReadOnly}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Type d&apos;activité</Label>
                    <Select value={formData.employmentType} onValueChange={(v) => updateField('employmentType', v)} disabled={isReadOnly}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FREELANCE">Free-lance</SelectItem>
                        <SelectItem value="OTHER">Entrepreneur</SelectItem>
                        <SelectItem value="CDI">Auto-entrepreneur</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {currentCategory === 'ETUDIANT' && (
                <>
                  <div className="space-y-2">
                    <Label>Établissement scolaire</Label>
                    <Input
                      placeholder="Nom de l'établissement"
                      value={formData.employer}
                      onChange={(e) => updateField('employer', e.target.value)}
                      disabled={isReadOnly}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Revenus mensuels (FCFA)</Label>
                    <Input
                      type="number"
                      placeholder="0 (si aucun revenu)"
                      value={formData.monthlyIncome}
                      onChange={(e) => updateField('monthlyIncome', e.target.value)}
                      disabled={isReadOnly}
                    />
                    <p className="text-xs text-muted-foreground">Laissez 0 si vous n&apos;avez pas de revenus</p>
                  </div>
                </>
              )}

              {!currentCategory && (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">Veuillez d&apos;abord sélectionner votre catégorie à l&apos;étape 1</p>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Guarantor */}
          {step === 3 && (
            <div className="space-y-4">
              {currentCategory === 'ETUDIANT' && (
                <Card className="border-violet-200 bg-violet-50">
                  <CardContent className="p-3">
                    <p className="text-xs text-violet-700">
                      <strong>Étudiant :</strong> Un garant est fortement recommandé pour votre dossier. Il renforce la confiance des propriétaires.
                    </p>
                  </CardContent>
                </Card>
              )}
              {currentCategory !== 'ETUDIANT' && (
                <Card className="border-border bg-muted/50">
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">
                      <strong>Optionnel :</strong> Ajouter un garant peut renforcer votre dossier, surtout si vos revenus sont limités.
                    </p>
                  </CardContent>
                </Card>
              )}
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
                    <SelectItem value="tuteur">Tuteur légal</SelectItem>
                    <SelectItem value="autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Step 4: Documents */}
          {step === 4 && (
            <div className="space-y-4">
              {currentCategory ? (
                <>
                  <div className="flex items-center gap-2">
                    {categoryConfig && (
                      <Badge variant="outline" className="text-xs">{categoryConfig.label}</Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      Documents requis pour votre profil
                    </span>
                  </div>

                  {/* Required documents summary */}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                    <span className="flex items-center gap-1">
                      <span className="size-2 rounded-full bg-red-400 inline-block" /> Obligatoire
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="size-2 rounded-full bg-neutral-300 inline-block" /> Facultatif
                    </span>
                  </div>

                  {/* Document list */}
                  {requiredDocs.map((doc) => {
                    const existingDoc = existingFile?.documents?.find((d) => d.type === doc.type)
                    const isUploading = uploadingDocType === doc.type

                    return (
                      <div key={doc.type} className={`rounded-xl border-2 p-4 transition-colors ${
                        existingDoc ? 'border-emerald-200 bg-emerald-50/50' : doc.required ? 'border-red-100' : 'border-border'
                      }`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              {existingDoc ? (
                                <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                              ) : (
                                <FileText className={`size-4 shrink-0 ${doc.required ? 'text-red-400' : 'text-muted-foreground'}`} />
                              )}
                              <span className="text-sm font-medium text-foreground">{doc.label}</span>
                              {doc.required && !existingDoc && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-red-50 text-red-600 border-red-200">
                                  Obligatoire
                                </Badge>
                              )}
                              {!doc.required && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-muted text-muted-foreground border-border">
                                  Facultatif
                                </Badge>
                              )}
                              {existingDoc && (
                                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${
                                  existingDoc.status === 'VALIDATED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : existingDoc.status === 'REJECTED' ? 'bg-red-50 text-red-700 border-red-200'
                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                                }`}>
                                  {existingDoc.status === 'VALIDATED' ? 'Validé' : existingDoc.status === 'REJECTED' ? 'Rejeté' : 'En attente'}
                                </Badge>
                              )}
                            </div>
                            {doc.description && (
                              <p className="text-xs text-muted-foreground mt-1 ml-6">{doc.description}</p>
                            )}
                            {existingDoc && (
                              <div className="flex items-center gap-2 mt-2 ml-6">
                                <span className="text-xs text-muted-foreground truncate">{existingDoc.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  • Ajouté le {new Date(existingDoc.createdAt).toLocaleDateString('fr-FR')}
                                </span>
                              </div>
                            )}
                            {existingDoc?.tcComment && (
                              <p className="text-xs text-amber-600 mt-1 ml-6">Commentaire TC : {existingDoc.tcComment}</p>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {!isReadOnly && existingDoc && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="size-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleDeleteDocument(existingDoc.id)}
                                title="Supprimer"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            )}
                            {!isReadOnly && (
                              <Button
                                variant={existingDoc ? "outline" : "default"}
                                size="sm"
                                className={`gap-1.5 ${!existingDoc ? 'bg-brand-500 hover:bg-brand-600 text-white' : ''}`}
                                disabled={isUploading}
                                onClick={() => fileInputRefs.current[doc.type]?.click()}
                              >
                                {isUploading ? (
                                  <span className="size-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                ) : existingDoc ? (
                                  <Eye className="size-3.5" />
                                ) : (
                                  <Upload className="size-3.5" />
                                )}
                                {isUploading ? 'Envoi...' : existingDoc ? 'Remplacer' : 'Télécharger'}
                              </Button>
                            )}
                            <input
                              ref={(el) => { fileInputRefs.current[doc.type] = el }}
                              type="file"
                              className="hidden"
                              accept={doc.accept}
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) handleFileUpload(doc.type, file)
                                e.target.value = ''
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  {/* Upload progress indicator */}
                  {requiredDocs.length > 0 && (
                    <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-border">
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="text-muted-foreground">Progression des documents</span>
                        <span className="font-medium">
                          {existingFile?.documents?.filter(d => requiredDocs.some(rd => rd.type === d.type)).length || 0} / {requiredDocs.length}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-neutral-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-brand-500 rounded-full transition-all duration-500"
                          style={{
                            width: `${((existingFile?.documents?.filter(d => requiredDocs.some(rd => rd.type === d.type)).length || 0) / requiredDocs.length) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">Veuillez d&apos;abord sélectionner votre catégorie à l&apos;étape 1</p>
                </div>
              )}
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
