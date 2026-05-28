'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  FileText, Upload, CheckCircle2, ChevronRight, ChevronLeft,
  Save, Send, AlertCircle,
  Eye, Trash2
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { useRealtimeRentalFiles } from '@/hooks/use-realtime-rental-files'
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


// ─── Document requirements ───────────────────────────────────────────────────
interface DocRequirement {
  type: string
  label: string
  description?: string
  required: boolean
  accept?: string
}

const documentRequirements: DocRequirement[] = [
  { type: 'ID_CARD', label: "Carte d'identité ou Passeport", required: true, accept: '.pdf,.jpg,.jpeg,.png' },
  { type: 'PROOF_OF_ADDRESS', label: 'Justificatif de domicile actuel', description: 'Facture CIE, SODECI ou quittance de loyer', required: false, accept: '.pdf,.jpg,.jpeg,.png' },
  { type: 'PAY_SLIP', label: 'Bulletins de salaire (3 derniers mois)', description: 'Facultatif — Fournir les 3 derniers bulletins si disponible', required: false, accept: '.pdf,.jpg,.jpeg,.png' },
  { type: 'BANK_STATEMENT', label: 'Relevés bancaires (3 derniers mois)', required: false, accept: '.pdf' },
  { type: 'EMPLOYMENT_CONTRACT', label: 'Contrat de travail', required: false, accept: '.pdf,.jpg,.jpeg,.png' },
  { type: 'GUARANTOR_ID', label: "Pièce d'identité du garant", required: false, accept: '.pdf,.jpg,.jpeg,.png' },
  { type: 'GUARANTOR_INCOME_PROOF', label: 'Justificatif de revenus du garant', required: false, accept: '.pdf,.jpg,.jpeg,.png' },
]

// ─── Step definition ───────────────────────────────────────────────────────
const steps = [
  { id: 1, title: 'Garant' },
  { id: 2, title: 'Documents' },
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
  const rentalFileIdRef = useRef<string | null>(null)
  const isCreatingDraftRef = useRef(false)
  const submittingRef = useRef(false)

  const [formData, setFormData] = useState({
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
        rentalFileIdRef.current = draft.id
        setFormData({
          guarantorName: draft.guarantorName || '',
          guarantorPhone: draft.guarantorPhone || '',
          guarantorRelation: draft.guarantorRelation || '',
        })
      } else {
        rentalFileIdRef.current = null
      }
    } catch (err) {
      if (err instanceof AuthError && err.status === 401) { return }
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useRealtimeRentalFiles({
    userId: user?.id,
    onRentalFileChange: () => fetchRentalFile(),
  })

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchRentalFile()
  }, [fetchRentalFile])

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

  const hasDocuments = (existingFile?.documents?.filter(d => requiredDocs.some(rd => rd.type === d.type)).length ?? 0) > 0

  const handleSubmit = async () => {
    if (!hasDocuments) {
      toast.error('Ajoutez au moins un document avant de soumettre votre dossier.')
      return
    }
    if (submittingRef.current) return
    submittingRef.current = true
    setSubmitting(true)
    try {
      await authFetch('/api/rental-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  // ─── Helper: ensure a draft rental file exists, returns its ID ────────
  const ensureDraftExists = async (): Promise<string | null> => {
    // Fast path: already have the ID in the ref
    if (rentalFileIdRef.current) return rentalFileIdRef.current

    // Second path: might exist in DB but not in ref (e.g. fresh page load)
    if (existingFile) {
      rentalFileIdRef.current = existingFile.id
      return existingFile.id
    }

    // Lock to prevent concurrent draft creation
    if (isCreatingDraftRef.current) {
      // Wait for the other call to finish, with timeout
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          clearInterval(check)
          reject(new Error('Timeout waiting for draft creation'))
        }, 10000)
        const check = setInterval(() => {
          if (!isCreatingDraftRef.current) {
            clearInterval(check)
            clearTimeout(timeout)
            resolve()
          }
        }, 100)
      }).catch(() => {}) // fall through to DB fetch on timeout
      
      // After waiting, try the ref again
      if (rentalFileIdRef.current) return rentalFileIdRef.current
      // Fetch from DB (the other call may have created the draft)

      const result = await authFetch<RentalFileResponse>('/api/rental-file')
      const files = result.data ?? []
      const draft = files.find((f) => f.status === 'DRAFT') || files[0]
      if (draft?.id) {
        rentalFileIdRef.current = draft.id
        setExistingFile(draft)
        return draft.id
      }
      return null
    }

    // Create the draft
    isCreatingDraftRef.current = true
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw: any = await authFetch('/api/rental-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const draftId: string | undefined = raw?.data?.id
      if (draftId) {
        setExistingFile(raw.data as RentalFileItem)
        rentalFileIdRef.current = draftId
        return draftId
      }
      // Fallback: refetch
      const fetchResult = await authFetch<RentalFileResponse>('/api/rental-file')
      const files = fetchResult.data ?? []
      const draft = files.find((f) => f.status === 'DRAFT') || files[0]
      if (draft?.id) {
        rentalFileIdRef.current = draft.id
        setExistingFile(draft)
        return draft.id
      }
      return null
    } catch {
      toast.error('Erreur lors de la création du dossier')
      return null
    } finally {
      isCreatingDraftRef.current = false
    }
  }

  // ─── File upload handler ──────────────────────────────────────────────
  const handleFileUpload = async (docType: string, file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      toast.error('Le fichier ne doit pas dépasser 5 Mo')
      return
    }

    const draftId = await ensureDraftExists()
    if (!draftId) {
      toast.error('Impossible de créer le dossier. Réessayez.')
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

      await authFetch('/api/rental-file/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rentalFileId: draftId,
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
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-8 w-20 sm:w-24 bg-muted animate-pulse rounded-full" />
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
  const requiredDocs = documentRequirements

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
                  <p className="text-sm font-medium flex flex-wrap items-center gap-1.5">
                    <span className="text-nowrap">Statut du dossier :</span>
                    <Badge variant="outline" className={`text-[10px] px-2 py-0.5 border ${existingStatus.color}`}>{existingStatus.label}</Badge>
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
      <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-1 scrollbar-none">
        {steps.map((s, i) => (
          <div key={s.id} className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button
              onClick={() => !isReadOnly && setStep(s.id)}
              className={`flex items-center justify-center size-8 sm:size-8 rounded-full text-xs sm:text-sm font-medium transition-all active:scale-95 ${
                step >= s.id ? 'bg-brand-500 text-white shadow-sm shadow-brand-200' : 'bg-muted text-muted-foreground'
              } ${!isReadOnly ? 'cursor-pointer hover:ring-2 hover:ring-brand-200' : 'cursor-default'}`}
            >
              {step > s.id ? <CheckCircle2 className="size-4 sm:size-5" /> : s.id}
            </button>
            <span className={`text-xs sm:text-sm whitespace-nowrap hidden sm:inline ${
              step >= s.id ? 'text-foreground font-medium' : 'text-muted-foreground'
            }`}>
              {s.title}
            </span>
            {i < steps.length - 1 && (
              <div className={`hidden sm:block w-6 sm:w-8 h-0.5 ${step > s.id ? 'bg-brand-500' : 'bg-neutral-200'}`} />
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
          {/* Personal info read-only section */}
          <div className="rounded-lg bg-muted/30 border border-border p-4">
            <p className="text-sm font-medium mb-3 text-muted-foreground">Informations personnelles</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Prénom</p>
                <p className="text-sm font-medium">{user?.firstName || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Nom</p>
                <p className="text-sm font-medium">{user?.lastName || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Téléphone</p>
                <p className="text-sm font-medium">{user?.phone || 'Non renseigné'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm font-medium">{user?.email || '—'}</p>
              </div>
            </div>
          </div>

          {/* Step 1: Guarantor */}
          {step === 1 && (
            <div className="space-y-4">
              <Card className="border-border bg-muted/50">
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">
                    Ajouter un garant renforce votre dossier et rassure les propriétaires.
                  </p>
                </CardContent>
              </Card>
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
                  placeholder="01 23 45 67 89"
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

          {/* Step 2: Documents */}
          {step === 2 && (
            <div className="space-y-4">
              <span className="text-xs text-muted-foreground">
                Documents à fournir pour compléter votre dossier
              </span>

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
                  <div key={doc.type} className={`rounded-xl border-2 p-3 sm:p-4 transition-colors ${
                    existingDoc ? 'border-emerald-200 bg-emerald-50/50' : doc.required ? 'border-red-100' : 'border-border'
                  }`}>
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                      <div className="flex-1 min-w-0 w-full sm:w-auto">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {existingDoc ? (
                            <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                          ) : (
                            <FileText className={`size-4 shrink-0 ${doc.required ? 'text-red-400' : 'text-muted-foreground'}`} />
                          )}
                          <span className="text-sm font-medium text-foreground break-words">{doc.label}</span>
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
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mt-2 ml-6">
                            <span className="text-xs text-muted-foreground truncate max-w-[140px] sm:max-w-[300px]">{existingDoc.name}</span>
                            <span className="text-xs text-muted-foreground hidden sm:inline">•</span>
                            <span className="text-xs text-muted-foreground">
                              Ajouté le {new Date(existingDoc.createdAt).toLocaleDateString('fr-FR')}
                            </span>
                          </div>
                        )}
                        {existingDoc?.tcComment && (
                          <p className="text-xs text-amber-600 mt-1 ml-6">Commentaire TC : {existingDoc.tcComment}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 w-full sm:w-auto justify-end sm:justify-start">
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
            </div>
          )}

          {/* Navigation */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-border">
            <Button
              variant="outline"
              onClick={() => setStep(Math.max(1, step - 1))}
              disabled={step === 1}
              className="gap-1 w-full sm:w-auto order-2 sm:order-1"
            >
              <ChevronLeft className="size-4" />
              Précédent
            </Button>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto order-1 sm:order-2">
              {!isReadOnly && (
                <Button
                  variant="outline"
                  onClick={handleSaveDraft}
                  disabled={saving}
                  className="gap-1.5 w-full sm:w-auto"
                >
                  <Save className="size-4" />
                  {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                </Button>
              )}
              {step < steps.length ? (
                <Button
                  onClick={() => setStep(step + 1)}
                  className="bg-brand-500 hover:bg-brand-600 text-white gap-1 w-full sm:w-auto"
                  disabled={isReadOnly}
                >
                  Suivant
                  <ChevronRight className="size-4" />
                </Button>
              ) : (
                !isReadOnly && (
                  <Button
                    onClick={handleSubmit}
                    disabled={submitting || !hasDocuments}
                    className="bg-brand-500 hover:bg-brand-600 text-white gap-1 w-full sm:w-auto disabled:opacity-50"
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
