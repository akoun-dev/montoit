'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import {
  PlusCircle, ImagePlus, EyeOff, Video, X, Loader2,
  Upload, ArrowLeft, CheckCircle2, MapPin, Home,
  FileText, Settings2, Save
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface AddPropertyProps {
  editId?: string  // If provided, load existing draft for editing
  onSuccess?: () => void
  onCancel?: () => void
}

interface PropertyData {
  id: string
  title: string
  description: string
  type: string
  price: number
  area: number
  bedrooms: number | null
  bathrooms: number | null
  address: string
  city: string
  commune: string | null
  isFurnished: boolean
  hasParking: boolean
  hasGarden: boolean
  hasPool: boolean
  hideOwnerName: boolean
  virtualTourUrl: string | null
  images: Array<{ url: string; order: number }>
  status: string
}

export function AddProperty({ editId, onSuccess, onCancel }: AddPropertyProps) {
  const [form, setForm] = useState({
    title: '', description: '', type: 'APPARTEMENT', price: '', area: '',
    bedrooms: '', bathrooms: '', address: '', city: '', commune: '',
    isFurnished: false, hasParking: false, hasGarden: false, hasPool: false,
    hideOwnerName: false,
  })

  // Image upload state
  const [imagePreviews, setImagePreviews] = useState<Array<{ dataUrl: string; file: File }>>([])
  const [existingImages, setExistingImages] = useState<Array<{ url: string; order: number }>>([])
  const [imageError, setImageError] = useState<string | null>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  // Video upload state
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(null)
  const [existingVideo, setExistingVideo] = useState<string | null>(null)
  const [videoUploading, setVideoUploading] = useState(false)
  const videoInputRef = useRef<HTMLInputElement>(null)

  // Form state
  const [submitting, setSubmitting] = useState(false)
  const [savingDraft, setSavingDraft] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draftSavedAt, setDraftSavedAt] = useState<Date | null>(null)
  const [propertyId, setPropertyId] = useState<string | null>(editId || null)
  const [loading, setLoading] = useState(!!editId)

  // Auto-save timer ref
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const update = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  // ── Load existing draft ────────────────────────────────────────────────────
  useEffect(() => {
    if (!editId) return
    const loadDraft = async () => {
      try {
        const result = await authFetch<{ property: PropertyData }>(`/api/properties/${editId}`)
        const p = result.property
        setForm({
          title: p.title || '',
          description: p.description || '',
          type: p.type || 'APPARTEMENT',
          price: p.price ? String(p.price) : '',
          area: p.area ? String(p.area) : '',
          bedrooms: p.bedrooms !== null ? String(p.bedrooms) : '',
          bathrooms: p.bathrooms !== null ? String(p.bathrooms) : '',
          address: p.address || '',
          city: p.city || '',
          commune: p.commune || '',
          isFurnished: p.isFurnished || false,
          hasParking: p.hasParking || false,
          hasGarden: p.hasGarden || false,
          hasPool: p.hasPool || false,
          hideOwnerName: p.hideOwnerName || false,
        })
        setExistingImages(p.images || [])
        if (p.virtualTourUrl) {
          setExistingVideo(p.virtualTourUrl)
          setVideoPreview(p.virtualTourUrl)
        }
        setPropertyId(p.id)
      } catch (err) {
        toast.error('Impossible de charger le brouillon')
      } finally {
        setLoading(false)
      }
    }
    loadDraft()
  }, [editId])

  // ── Auto-save on form change ───────────────────────────────────────────────
  const triggerAutoSave = useCallback(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
    }
    autoSaveTimerRef.current = setTimeout(() => {
      handleSaveDraft(true) // silent = true
    }, 5000)
  }, [form, propertyId, imagePreviews, videoFile, existingImages, existingVideo])

  // Trigger auto-save when form changes (but not on first render)
  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    if (loading) return // Don't auto-save while loading draft
    triggerAutoSave()
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    }
  }, [form, triggerAutoSave, loading])

  // ── Image handling ─────────────────────────────────────────────────────────
  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    e.target.value = ''

    const remaining = 10 - imagePreviews.length - existingImages.length
    if (remaining <= 0) {
      setImageError('Maximum 10 photos autorisées')
      return
    }

    const newImages: Array<{ dataUrl: string; file: File }> = []
    let error = ''

    Array.from(files).slice(0, remaining).forEach((file) => {
      if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
        error = 'Format invalide. Utilisez JPG, PNG ou WEBP.'
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        error = 'Chaque image doit faire moins de 5 Mo.'
        return
      }
      const url = URL.createObjectURL(file)
      newImages.push({ dataUrl: url, file })
    })

    if (error) {
      setImageError(error)
      newImages.forEach((img) => URL.revokeObjectURL(img.dataUrl))
      return
    }

    setImageError(null)
    setImagePreviews((prev) => [...prev, ...newImages])
  }, [imagePreviews.length, existingImages.length])

  const removeImage = useCallback((index: number) => {
    setImagePreviews((prev) => {
      const img = prev[index]
      if (img) URL.revokeObjectURL(img.dataUrl)
      return prev.filter((_, i) => i !== index)
    })
  }, [])

  const removeExistingImage = useCallback((index: number) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== index))
  }, [])

  // ── Video handling ─────────────────────────────────────────────────────────
  const handleVideoSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    if (!file.type.startsWith('video/')) {
      setError('Format vidéo invalide. Utilisez MP4, MOV, AVI ou WEBM.')
      return
    }

    if (file.size > 50 * 1024 * 1024) {
      setError('La vidéo doit faire moins de 50 Mo.')
      return
    }

    setError(null)
    setVideoFile(file)
    setExistingVideo(null) // Remove existing video when new one selected
    setVideoUploading(true)

    const previewUrl = URL.createObjectURL(file)
    setVideoPreview(previewUrl)
    setVideoUploading(false)
  }, [])

  const removeVideo = useCallback(() => {
    if (videoPreview && !existingVideo) URL.revokeObjectURL(videoPreview)
    setVideoFile(null)
    setVideoPreview(null)
    setExistingVideo(null)
  }, [videoPreview, existingVideo])

  // ── Convert file to base64 ─────────────────────────────────────────────────
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(new Error('Erreur de lecture du fichier'))
      reader.readAsDataURL(file)
    })
  }

  // ── Save Draft ─────────────────────────────────────────────────────────────
  const handleSaveDraft = async (silent = false) => {
    if (!silent) setSavingDraft(true)
    setError(null)

    try {
      // Convert new images to base64
      const newImagesBase64: string[] = []
      for (const img of imagePreviews) {
        const base64 = await fileToBase64(img.file)
        newImagesBase64.push(base64)
      }

      // Combine existing images + new images
      const allImages = [...existingImages.map((img) => img.url), ...newImagesBase64]

      // Convert video to base64 (only if new video selected)
      let virtualTourUrl: string | null | undefined = undefined
      if (videoFile) {
        virtualTourUrl = await fileToBase64(videoFile)
      } else if (existingVideo === null && videoPreview === null) {
        // Video was removed
        virtualTourUrl = null
      }
      // If existingVideo is set and no new video, don't send virtualTourUrl (keep existing)

      const payload: Record<string, unknown> = {
        title: form.title.trim() || undefined,
        description: form.description.trim() || undefined,
        type: form.type || undefined,
        price: form.price ? parseFloat(form.price) : undefined,
        area: form.area ? parseFloat(form.area) : undefined,
        bedrooms: form.bedrooms ? parseInt(form.bedrooms) : null,
        bathrooms: form.bathrooms ? parseInt(form.bathrooms) : null,
        address: form.address.trim() || undefined,
        city: form.city.trim() || undefined,
        commune: form.commune.trim() || null,
        isFurnished: form.isFurnished,
        hasParking: form.hasParking,
        hasGarden: form.hasGarden,
        hasPool: form.hasPool,
        hideOwnerName: form.hideOwnerName,
        ...(virtualTourUrl !== undefined && { virtualTourUrl }),
        images: allImages.length > 0 ? allImages : undefined,
      }

      // Remove undefined values from payload to reduce body size
      const cleanPayload = Object.fromEntries(
        Object.entries(payload).filter(([_, v]) => v !== undefined)
      )

      if (propertyId) {
        // Update existing draft — no status = stays in current status
        await authFetch(`/api/properties/${propertyId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cleanPayload),
        })
      } else {
        // Create new draft
        const result = await authFetch<{ property: { id: string } }>('/api/properties', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...cleanPayload, draft: true }),
        })
        setPropertyId(result.property.id)
      }

      setDraftSavedAt(new Date())
      if (!silent) {
        toast.success('Brouillon sauvegardé')
      }
    } catch (err) {
      const errMsg = err instanceof AuthError ? err.message : 'Erreur lors de la sauvegarde du brouillon'
      if (!silent) {
        toast.error(errMsg)
      } else {
        console.warn('[Auto-save failed]', errMsg)
      }
    } finally {
      if (!silent) setSavingDraft(false)
    }
  }

  // ── Publish handler ────────────────────────────────────────────────────────
  const handlePublish = async () => {
    // Validate required fields
    if (!form.title.trim()) { setError('Le titre est requis'); return }
    if (!form.description.trim()) { setError('La description est requise'); return }
    if (!form.price || parseFloat(form.price) <= 0) { setError('Le loyer mensuel est requis'); return }
    if (!form.area || parseFloat(form.area) <= 0) { setError('La surface est requise'); return }
    if (!form.address.trim()) { setError("L'adresse est requise"); return }
    if (!form.city.trim()) { setError('La ville est requise'); return }

    setSubmitting(true)
    setError(null)

    try {
      // Convert images to base64
      const newImagesBase64: string[] = []
      for (const img of imagePreviews) {
        const base64 = await fileToBase64(img.file)
        newImagesBase64.push(base64)
      }
      const allImages = [...existingImages.map((img) => img.url), ...newImagesBase64]

      // Convert video to base64
      let virtualTourUrl: string | null | undefined = undefined
      if (videoFile) {
        virtualTourUrl = await fileToBase64(videoFile)
      } else if (existingVideo) {
        // Keep existing video (don't re-encode it)
        virtualTourUrl = existingVideo
      } else {
        // No video at all
        virtualTourUrl = null
      }

      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        type: form.type,
        price: parseFloat(form.price),
        area: parseFloat(form.area),
        bedrooms: form.bedrooms ? parseInt(form.bedrooms) : null,
        bathrooms: form.bathrooms ? parseInt(form.bathrooms) : null,
        address: form.address.trim(),
        city: form.city.trim(),
        commune: form.commune.trim() || null,
        isFurnished: form.isFurnished,
        hasParking: form.hasParking,
        hasGarden: form.hasGarden,
        hasPool: form.hasPool,
        hideOwnerName: form.hideOwnerName,
        virtualTourUrl,
        images: allImages,
      }

      if (propertyId) {
        // Update existing draft → publish
        await authFetch(`/api/properties/${propertyId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, status: 'ACTIVE' }),
        })
      } else {
        // Create and publish directly
        await authFetch('/api/properties', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }

      toast.success('Bien publié avec succès ! Il sera visible après validation.')
      onSuccess?.()
    } catch (err) {
      if (err instanceof AuthError) {
        setError(err.message)
      } else {
        setError(err instanceof Error ? err.message : "Erreur lors de la publication")
      }
    } finally {
      setSubmitting(false)
    }
  }

  // ── Loading state for draft edit ───────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted rounded-lg animate-pulse" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-48 bg-muted rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            // Save draft before leaving
            if (form.title || form.description || form.address || form.city) {
              handleSaveDraft(true)
            }
            onCancel?.()
          }}
          className="shrink-0 size-9"
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">
            {propertyId && existingImages.length > 0 ? 'Modifier le bien' : 'Ajouter un bien'}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {propertyId ? 'Modifiez les informations de votre bien' : 'Publiez une nouvelle annonce immobilière'}
          </p>
        </div>
        {/* Draft saved indicator */}
        <AnimatePresence>
          {draftSavedAt && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="flex items-center gap-1.5 text-xs text-emerald-600 shrink-0"
            >
              <CheckCircle2 className="size-3.5" />
              <span className="hidden sm:inline">Brouillon sauvegardé</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Error display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 rounded-lg border bg-red-50 border-red-200 text-red-700 text-sm"
        >
          {error}
        </motion.div>
      )}

      {/* ── Section 1: Informations de base ────────────────────────────────── */}
      <Card className="border-border">
        <CardHeader className="pb-3 sm:pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Home className="size-4 text-brand-500" />
            Informations du bien
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title" className="text-xs font-medium">Titre de l&apos;annonce <span className="text-red-400">*</span></Label>
            <Input
              id="title"
              placeholder="Appartement F3 Cocody..."
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-xs font-medium">Description <span className="text-red-400">*</span></Label>
            <Textarea
              id="description"
              placeholder="Décrivez votre bien..."
              rows={4}
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              className="text-sm resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Type de bien</Label>
              <Select value={form.type} onValueChange={(v) => update('type', v)}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="APPARTEMENT">Appartement</SelectItem>
                  <SelectItem value="MAISON">Maison</SelectItem>
                  <SelectItem value="STUDIO">Studio</SelectItem>
                  <SelectItem value="DUPLEX">Duplex</SelectItem>
                  <SelectItem value="PENTHOUSE">Penthouse</SelectItem>
                  <SelectItem value="VILLA">Villa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="price" className="text-xs font-medium">Loyer mensuel (FCFA) <span className="text-red-400">*</span></Label>
              <Input
                id="price"
                type="number"
                placeholder="250000"
                value={form.price}
                onChange={(e) => update('price', e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="area" className="text-xs font-medium">Surface (m²) <span className="text-red-400">*</span></Label>
              <Input
                id="area"
                type="number"
                placeholder="85"
                value={form.area}
                onChange={(e) => update('area', e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bedrooms" className="text-xs font-medium">Chambres</Label>
              <Input
                id="bedrooms"
                type="number"
                placeholder="2"
                value={form.bedrooms}
                onChange={(e) => update('bedrooms', e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bathrooms" className="text-xs font-medium">SdB</Label>
              <Input
                id="bathrooms"
                type="number"
                placeholder="1"
                value={form.bathrooms}
                onChange={(e) => update('bathrooms', e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Section 2: Localisation ────────────────────────────────────────── */}
      <Card className="border-border">
        <CardHeader className="pb-3 sm:pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="size-4 text-brand-500" />
            Localisation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="address" className="text-xs font-medium">Adresse <span className="text-red-400">*</span></Label>
            <Input
              id="address"
              placeholder="Riviera 3, Cocody"
              value={form.address}
              onChange={(e) => update('address', e.target.value)}
              className="h-9 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="city" className="text-xs font-medium">Ville <span className="text-red-400">*</span></Label>
              <Input
                id="city"
                placeholder="Abidjan"
                value={form.city}
                onChange={(e) => update('city', e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="commune" className="text-xs font-medium">Commune</Label>
              <Input
                id="commune"
                placeholder="Cocody"
                value={form.commune}
                onChange={(e) => update('commune', e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Section 3: Caractéristiques ────────────────────────────────────── */}
      <Card className="border-border">
        <CardHeader className="pb-3 sm:pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings2 className="size-4 text-brand-500" />
            Caractéristiques
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { key: 'isFurnished', label: 'Meublé', desc: 'Le bien est meublé' },
              { key: 'hasParking', label: 'Parking', desc: 'Place de parking disponible' },
              { key: 'hasGarden', label: 'Jardin', desc: 'Jardin ou espace vert' },
              { key: 'hasPool', label: 'Piscine', desc: 'Piscine disponible' },
            ].map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors"
              >
                <div className="mr-3 min-w-0">
                  <Label className="cursor-pointer text-sm">{item.label}</Label>
                  <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                </div>
                <Switch
                  checked={form[item.key as keyof typeof form] as boolean}
                  onCheckedChange={(v) => update(item.key, v)}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Section 4: Photos ──────────────────────────────────────────────── */}
      <Card className="border-border">
        <CardHeader className="pb-3 sm:pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <ImagePlus className="size-4 text-brand-500" />
            Photos du bien
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div
            onClick={() => imageInputRef.current?.click()}
            className={cn(
              'border-2 border-dashed rounded-xl p-4 sm:p-6 text-center cursor-pointer transition-colors',
              'hover:border-brand-400 hover:bg-brand-50/20',
              (imagePreviews.length + existingImages.length) >= 10 ? 'opacity-50 pointer-events-none' : 'border-border'
            )}
          >
            <Upload className="size-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-medium text-foreground">Cliquez ou glissez vos photos ici</p>
            <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WEBP — Max 5 Mo par image — Max 10 photos</p>
          </div>

          <input
            ref={imageInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={handleImageSelect}
          />

          {imageError && (
            <p className="text-xs text-red-500">{imageError}</p>
          )}

          {/* Existing images from draft */}
          {existingImages.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {existingImages.map((img, index) => (
                <div
                  key={`existing-${index}`}
                  className="relative aspect-square rounded-lg overflow-hidden border border-border group"
                >
                  <img
                    src={img.url}
                    alt={`Photo ${index + 1}`}
                    className="size-full object-cover"
                  />
                  <button
                    onClick={() => removeExistingImage(index)}
                    className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="size-3" />
                  </button>
                  {index === 0 && imagePreviews.length === 0 && (
                    <span className="absolute bottom-1 left-1 bg-brand-500 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded">
                      Couverture
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* New image previews */}
          {imagePreviews.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {imagePreviews.map((img, index) => (
                <div
                  key={`new-${index}`}
                  className="relative aspect-square rounded-lg overflow-hidden border border-border group"
                >
                  <img
                    src={img.dataUrl}
                    alt={`Photo ${index + 1}`}
                    className="size-full object-cover"
                  />
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="size-3" />
                  </button>
                  {index === 0 && existingImages.length === 0 && (
                    <span className="absolute bottom-1 left-1 bg-brand-500 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded">
                      Couverture
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Section 5: Vidéo 3D ────────────────────────────────────────────── */}
      <Card className="border-border">
        <CardHeader className="pb-3 sm:pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Video className="size-4 text-brand-500" />
            Visite virtuelle 3D
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!videoFile && !existingVideo ? (
            <div
              onClick={() => videoInputRef.current?.click()}
              className="border-2 border-dashed border-border rounded-xl p-4 sm:p-6 text-center cursor-pointer hover:border-brand-400 hover:bg-brand-50/20 transition-colors"
            >
              <Video className="size-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground">Télécharger une vidéo 3D</p>
              <p className="text-xs text-muted-foreground mt-1">MP4, MOV, AVI, WEBM — Max 50 Mo</p>
              <p className="text-[11px] text-muted-foreground mt-2">
                Les locataires pourront visionner cette vidéo avant de planifier une visite physique.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-xl overflow-hidden bg-black aspect-video relative">
                {videoUploading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="size-8 animate-spin text-brand-500" />
                  </div>
                ) : (
                  <video
                    src={videoPreview || undefined}
                    controls
                    className="size-full object-contain"
                    title="Aperçu visite virtuelle"
                  >
                    Votre navigateur ne supporte pas la lecture vidéo.
                  </video>
                )}
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted">
                <div className="flex items-center gap-2 min-w-0">
                  <Video className="size-4 text-brand-500 shrink-0" />
                  <span className="text-xs text-foreground truncate">
                    {videoFile ? videoFile.name : 'Vidéo existante'}
                  </span>
                  {videoFile && (
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      ({(videoFile.size / (1024 * 1024)).toFixed(1)} Mo)
                    </span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={removeVideo}
                  className="h-7 px-2 text-red-500 hover:text-red-600 hover:bg-red-50 shrink-0"
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            </div>
          )}

          <input
            ref={videoInputRef}
            type="file"
            accept="video/mp4,video/quicktime,video/x-msvideo,video/webm,video/*"
            className="hidden"
            onChange={handleVideoSelect}
          />
        </CardContent>
      </Card>

      {/* ── Section 6: Confidentialité ──────────────────────────────────────── */}
      <Card className="border-border">
        <CardHeader className="pb-3 sm:pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <EyeOff className="size-4 text-brand-500" />
            Confidentialité
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-3 rounded-lg border border-border">
            <div className="flex-1 min-w-0 mr-3">
              <Label className="cursor-pointer text-sm">Masquer mon nom</Label>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Votre nom n&apos;apparaîtra pas sur l&apos;annonce. Les locataires pourront vous contacter uniquement par message.
              </p>
            </div>
            <Switch
              checked={form.hideOwnerName}
              onCheckedChange={(v) => update('hideOwnerName', v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Action Buttons ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button
          variant="outline"
          onClick={() => {
            if (form.title || form.description || form.address || form.city) {
              handleSaveDraft(true)
            }
            onCancel?.()
          }}
          disabled={submitting}
          className="h-11 sm:w-auto border-border"
        >
          Retour
        </Button>
        <Button
          variant="outline"
          onClick={() => handleSaveDraft(false)}
          disabled={savingDraft || submitting}
          className="h-11 gap-2 border-brand-200 text-brand-600 hover:bg-brand-50"
        >
          {savingDraft ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          {savingDraft ? 'Sauvegarde...' : 'Sauvegarder le brouillon'}
        </Button>
        <Button
          onClick={handlePublish}
          disabled={submitting}
          className="flex-1 h-12 bg-brand-500 hover:bg-brand-600 text-white font-semibold gap-2"
        >
          {submitting ? (
            <>
              <Loader2 className="size-5 animate-spin" />
              Publication en cours...
            </>
          ) : (
            <>
              <PlusCircle className="size-5" />
              Publier l&apos;annonce
            </>
          )}
        </Button>
      </div>
    </motion.div>
  )
}
