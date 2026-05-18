'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  FileText, Upload, CheckCircle2, ChevronRight, ChevronLeft,
  Save, Send, AlertCircle, Building2, Trash2, Eye
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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

// ─── Document requirements for proprietors ──────────────────────────────────
interface DocRequirement {
  type: string
  label: string
  description?: string
  required: boolean
  accept?: string
}

const ownerDocumentRequirements: DocRequirement[] = [
  { type: 'ID_CARD', label: "Carte d'identité ou Passeport", required: true, accept: '.pdf,.jpg,.jpeg,.png' },
  { type: 'PROPERTY_TITLE', label: 'Titre de propriété', description: 'Pour chaque bien que vous louez', required: false, accept: '.pdf,.jpg,.jpeg,.png' },
  { type: 'UTILITY_BILL', label: 'Dernière facture CIE ou SODECI', required: false, accept: '.pdf,.jpg,.jpeg,.png' },
  { type: 'BANK_ACCOUNT_DETAILS', label: 'Relevé d\'identité bancaire (RIB)', required: false, accept: '.pdf,.jpg,.jpeg,.png' },
]

// ─── Step definition ───────────────────────────────────────────────────────
const steps = [
  { id: 1, title: 'Informations personnelles' },
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

export function OwnerFileForm() {
  const { user, isAuthenticated } = useAuthStore()
  const [step, setStep] = useState(1)
  const [existingFile, setExistingFile] = useState<OwnerFileItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [uploadingDocType, setUploadingDocType] = useState<string | null>(null)

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const fetchOwnerFile = useCallback(async () => {
    if (!isAuthenticated) { setLoading(false); return }
    try {
      const result = await authFetch<OwnerFileResponse>('/api/owner-file')
      const files = result.data ?? []
      const draft = files.find((f) => f.status === 'DRAFT') || files[0]
      if (draft) {
        setExistingFile(draft)
      }
    } catch (err) {
      if (err instanceof AuthError && err.status === 401) { return }
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => { fetchOwnerFile() }, [fetchOwnerFile])

  const handleSaveDraft = async () => {
    setSaving(true)
    try {
      await authFetch('/api/owner-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
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
        body: JSON.stringify({ submit: true }),
      })
      toast.success('Dossier propriétaire soumis avec succès ! Il sera examiné par un Tiers de Confiance.')
      fetchOwnerFile()
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

    // Ensure owner file exists first
    if (!existingFile) {
      try {
        await authFetch('/api/owner-file', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        })
        await fetchOwnerFile()
      } catch {
        toast.error('Erreur lors de la création du dossier')
        return
      }
    }

    setUploadingDocType(docType)

    try {
      const reader = new FileReader()
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      const base64Content = await base64Promise

      // Get the current owner file (may have just been created)
      const result = await authFetch<OwnerFileResponse>('/api/owner-file')
      const files = result.data ?? []
      const currentFile = files.find((f) => f.status === 'DRAFT') || files[0]

      if (!currentFile) {
        toast.error('Dossier non trouvé')
        return
      }

      await authFetch('/api/owner-file/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerFileId: currentFile.id,
          type: docType,
          name: file.name,
          content: base64Content,
        }),
      })

      toast.success('Document téléchargé avec succès')
      fetchOwnerFile()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors du téléchargement')
    } finally {
      setUploadingDocType(null)
    }
  }

  const handleDeleteDocument = async (docId: string) => {
    try {
      await authFetch(`/api/owner-file/documents?docId=${docId}`, {
        method: 'DELETE',
      })
      toast.success('Document supprimé')
      fetchOwnerFile()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la suppression')
    }
  }

  // ─── Loading skeleton ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          <div className="h-4 w-64 bg-muted animate-pulse rounded mt-2" />
        </div>
        <div className="flex gap-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-8 w-32 bg-muted animate-pulse rounded-full" />
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

  const isReadOnly = existingFile && existingFile.status !== 'DRAFT'
  const existingStatus = existingFile ? statusConfig[existingFile.status] : null

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dossier propriétaire</h1>
        <p className="text-muted-foreground mt-1">Vérifiez votre profil de propriétaire en fournissant les documents requis</p>
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
          {/* Step 1: Personal Info */}
          {step === 1 && (
            <div className="space-y-4">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Téléphone</Label>
                  <Input value={user?.phone || 'Non renseigné'} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={user?.email || ''} disabled />
                </div>
              </div>

              <Card className="border-border bg-muted/30">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Building2 className="size-5 text-brand-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Documents du propriétaire</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Pour vérifier votre profil de propriétaire, vous devrez fournir les documents suivants :
                      </p>
                      <ul className="mt-2 space-y-1">
                        {ownerDocumentRequirements.map((doc) => (
                          <li key={doc.type} className="flex items-center gap-2 text-xs">
                            <span className={`size-1.5 rounded-full ${doc.required ? 'bg-red-400' : 'bg-neutral-300'}`} />
                            <span>{doc.label}</span>
                            {doc.required && <span className="text-red-500">(obligatoire)</span>}
                            {!doc.required && <span className="text-muted-foreground">(facultatif)</span>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 2: Documents */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                <span className="flex items-center gap-1">
                  <span className="size-2 rounded-full bg-red-400 inline-block" /> Obligatoire
                </span>
                <span className="flex items-center gap-1">
                  <span className="size-2 rounded-full bg-neutral-300 inline-block" /> Facultatif
                </span>
              </div>

              {ownerDocumentRequirements.map((doc) => {
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
              <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-border">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-muted-foreground">Progression des documents</span>
                  <span className="font-medium">
                    {existingFile?.documents?.filter(d => ownerDocumentRequirements.some(rd => rd.type === d.type)).length || 0} / {ownerDocumentRequirements.length}
                  </span>
                </div>
                <div className="w-full h-2 bg-neutral-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-500 rounded-full transition-all duration-500"
                    style={{
                      width: `${((existingFile?.documents?.filter(d => ownerDocumentRequirements.some(rd => rd.type === d.type)).length || 0) / ownerDocumentRequirements.length) * 100}%`,
                    }}
                  />
                </div>
              </div>
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
