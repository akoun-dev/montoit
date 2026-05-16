'use client'

import { useState, useRef, useCallback } from 'react'
import {
  PlusCircle, ImagePlus, EyeOff, Video, X, Loader2,
  Upload, ArrowLeft, CheckCircle2, MapPin, Home, Euro,
  FileText, Settings2, ChevronDown, ChevronUp
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface AddPropertyProps {
  onSuccess?: () => void
  onCancel?: () => void
}

export function AddProperty({ onSuccess, onCancel }: AddPropertyProps) {
  const [form, setForm] = useState({
    title: '', description: '', type: 'APPARTEMENT', price: '', area: '',
    bedrooms: '', bathrooms: '', address: '', city: '', commune: '',
    isFurnished: false, hasParking: false, hasGarden: false, hasPool: false,
    hideOwnerName: false,
  })

  // Image upload state
  const [imagePreviews, setImagePreviews] = useState<Array<{ dataUrl: string; file: File }>>([])
  const [imageError, setImageError] = useState<string | null>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  // Video upload state
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(null)
  const [videoUploading, setVideoUploading] = useState(false)
  const videoInputRef = useRef<HTMLInputElement>(null)

  // Form state
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const update = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  // ── Image handling ─────────────────────────────────────────────────────────
  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    e.target.value = ''

    const remaining = 10 - imagePreviews.length
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
      // Clean up any created URLs
      newImages.forEach((img) => URL.revokeObjectURL(img.dataUrl))
      return
    }

    setImageError(null)
    setImagePreviews((prev) => [...prev, ...newImages])
  }, [imagePreviews.length])

  const removeImage = useCallback((index: number) => {
    setImagePreviews((prev) => {
      const img = prev[index]
      if (img) URL.revokeObjectURL(img.dataUrl)
      return prev.filter((_, i) => i !== index)
    })
  }, [])

  // ── Video handling ─────────────────────────────────────────────────────────
  const handleVideoSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    // Validate video type
    if (!file.type.startsWith('video/')) {
      setError('Format vidéo invalide. Utilisez MP4, MOV, AVI ou WEBM.')
      return
    }

    // Validate size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      setError('La vidéo doit faire moins de 50 Mo.')
      return
    }

    setError(null)
    setVideoFile(file)
    setVideoUploading(true)

    // Generate preview URL
    const previewUrl = URL.createObjectURL(file)
    setVideoPreview(previewUrl)
    setVideoUploading(false)
  }, [])

  const removeVideo = useCallback(() => {
    if (videoPreview) URL.revokeObjectURL(videoPreview)
    setVideoFile(null)
    setVideoPreview(null)
  }, [videoPreview])

  // ── Convert file to base64 ─────────────────────────────────────────────────
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(new Error('Erreur de lecture du fichier'))
      reader.readAsDataURL(file)
    })
  }

  // ── Submit handler ─────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    // Validate required fields
    if (!form.title.trim()) { setError('Le titre est requis'); return }
    if (!form.description.trim()) { setError('La description est requise'); return }
    if (!form.price || parseFloat(form.price) <= 0) { setError('Le loyer mensuel est requis'); return }
    if (!form.area || parseFloat(form.area) <= 0) { setError('La surface est requise'); return }
    if (!form.address.trim()) { setError('L\'adresse est requise'); return }
    if (!form.city.trim()) { setError('La ville est requise'); return }

    setSubmitting(true)
    setError(null)

    try {
      // Convert images to base64
      const imagesBase64: string[] = []
      for (const img of imagePreviews) {
        const base64 = await fileToBase64(img.file)
        imagesBase64.push(base64)
      }

      // Convert video to base64
      let virtualTourUrl: string | null = null
      if (videoFile) {
        virtualTourUrl = await fileToBase64(videoFile)
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
        images: imagesBase64,
      }

      await authFetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      toast.success('Bien ajouté avec succès ! Il sera visible après validation.')
      onSuccess?.()
    } catch (err) {
      if (err instanceof AuthError) {
        setError(err.message)
      } else {
        setError(err instanceof Error ? err.message : 'Erreur lors de l\'ajout du bien')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onCancel}
          className="shrink-0 size-9"
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Ajouter un bien</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Publiez une nouvelle annonce immobilière</p>
        </div>
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
          {/* Title */}
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

          {/* Description */}
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

          {/* Type + Price - side by side on mobile */}
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

          {/* Area + Bedrooms + Bathrooms */}
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
          {/* Address */}
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

          {/* City + Commune */}
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
          {/* Upload zone */}
          <div
            onClick={() => imageInputRef.current?.click()}
            className={cn(
              'border-2 border-dashed rounded-xl p-4 sm:p-6 text-center cursor-pointer transition-colors',
              'hover:border-brand-400 hover:bg-brand-50/20',
              imagePreviews.length >= 10 ? 'opacity-50 pointer-events-none' : 'border-border'
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

          {/* Image previews */}
          {imagePreviews.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {imagePreviews.map((img, index) => (
                <div
                  key={index}
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
                  {index === 0 && (
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
          {!videoFile ? (
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
              {/* Video preview */}
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

              {/* Video info + remove button */}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted">
                <div className="flex items-center gap-2 min-w-0">
                  <Video className="size-4 text-brand-500 shrink-0" />
                  <span className="text-xs text-foreground truncate">{videoFile.name}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    ({(videoFile.size / (1024 * 1024)).toFixed(1)} Mo)
                  </span>
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

      {/* ── Submit Button ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={submitting}
          className="h-11 sm:w-auto border-border"
        >
          Annuler
        </Button>
        <Button
          onClick={handleSubmit}
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
