'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import {
  PlusCircle, ImagePlus, EyeOff, Video, X, Loader2,
  Upload, ArrowLeft, CheckCircle2, MapPin, Home,
  FileText, Settings2, Save, Navigation, LocateFixed
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

// ── Property Location Picker (Leaflet map) ────────────────────────────────────

function PropertyLocationPicker({
  lat,
  lng,
  onLocationChange,
  defaultCenter,
}: {
  lat: number | null
  lng: number | null
  onLocationChange: (lat: number, lng: number) => void
  defaultCenter: { lat: number; lng: number }
}) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)

  const centerLat = lat ?? defaultCenter.lat
  const centerLng = lng ?? defaultCenter.lng

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    let cancelled = false

    import('leaflet').then((L) => {
      if (!mapRef.current || cancelled || mapInstanceRef.current) return

      const map = L.map(mapRef.current, {
        center: [centerLat, centerLng],
        zoom: 14,
        zoomControl: true,
        scrollWheelZoom: true,
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19,
      }).addTo(map)

      // Custom marker icon
      const icon = L.divIcon({
        className: 'location-picker-marker',
        html: `<div style="
          background: #FF6C2F;
          color: white;
          width: 32px;
          height: 32px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="transform: rotate(45deg);"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
        </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      })

      // Add marker if coordinates exist
      if (lat !== null && lng !== null) {
        const marker = L.marker([lat, lng], { icon, draggable: true }).addTo(map)
        marker.on('dragend', () => {
          const pos = marker.getLatLng()
          onLocationChange(pos.lat, pos.lng)
        })
        markerRef.current = marker
      }

      // Click on map to set/update marker
      map.on('click', (e: L.LeafletMouseEvent) => {
        const { lat: clickedLat, lng: clickedLng } = e.latlng
        if (markerRef.current) {
          markerRef.current.setLatLng([clickedLat, clickedLng])
        } else {
          const marker = L.marker([clickedLat, clickedLng], { icon, draggable: true }).addTo(map)
          marker.on('dragend', () => {
            const pos = marker.getLatLng()
            onLocationChange(pos.lat, pos.lng)
          })
          markerRef.current = marker
        }
        onLocationChange(clickedLat, clickedLng)
      })

      mapInstanceRef.current = map

      // Fix map rendering after mount
      requestAnimationFrame(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize()
        }
      })
    })

    return () => {
      cancelled = true
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
        markerRef.current = null
      }
    }
  }, []) // Only mount once

  // Update marker position when lat/lng props change externally
  useEffect(() => {
    if (!mapInstanceRef.current || lat === null || lng === null) return
    const map = mapInstanceRef.current
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng])
    } else {
      import('leaflet').then((L) => {
        if (!mapInstanceRef.current) return
        const icon = L.divIcon({
          className: 'location-picker-marker',
          html: `<div style="
            background: #FF6C2F;
            color: white;
            width: 32px;
            height: 32px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            border: 3px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="transform: rotate(45deg);"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 32],
        })
        const marker = L.marker([lat, lng], { icon, draggable: true }).addTo(mapInstanceRef.current)
        marker.on('dragend', () => {
          const pos = marker.getLatLng()
          onLocationChange(pos.lat, pos.lng)
        })
        markerRef.current = marker
      })
    }
    map.setView([lat, lng], map.getZoom() || 14)
  }, [lat, lng, onLocationChange])

  return (
    <div className="w-full h-48 sm:h-56 rounded-lg overflow-hidden border border-border">
      <div ref={mapRef} className="w-full h-full" />
    </div>
  )
}

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
  latitude: number | null
  longitude: number | null
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
    latitude: '', longitude: '',
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

  // Document upload state
  const [newDocuments, setNewDocuments] = useState<Array<{
    file: File; name: string; type: string; description: string; expiryDate: string
  }>>([])
  const [existingDocuments, setExistingDocuments] = useState<Array<{
    id: string; name: string; type: string; description: string | null; expiryDate: string | null; url: string
  }>>([])
  const [docLoading, setDocLoading] = useState(false)
  const docInputRef = useRef<HTMLInputElement>(null)
  const [docFormOpen, setDocFormOpen] = useState(false)
  const [docModalOpen, setDocModalOpen] = useState(false)
  const [docForm, setDocForm] = useState({
    name: '', type: 'AUTRE', description: '', expiryDate: '', file: null as File | null,
  })
  const docTypes = [
    { value: 'DIAGNOSTIC_DPE', label: 'Diagnostic DPE' },
    { value: 'DIAGNOSTIC_AMIANTE', label: 'Diagnostic Amiante' },
    { value: 'DIAGNOSTIC_PLOMB', label: 'Diagnostic Plomb' },
    { value: 'DIAGNOSTIC_ELECTRICITE', label: 'Diagnostic Électricité' },
    { value: 'ASSURANCE_HABITATION', label: 'Assurance Habitation' },
    { value: 'PERMIS_CONSTRUIRE', label: 'Permis de Construire' },
    { value: 'ATTESTATION_CONFORMITE', label: 'Attestation de Conformité' },
    { value: 'PLAN_BATIMENT', label: 'Plan du Bâtiment' },
    { value: 'AUTRE', label: 'Autre' },
  ]

  // Form state
  const [submitting, setSubmitting] = useState(false)
  const [savingDraft, setSavingDraft] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draftSavedAt, setDraftSavedAt] = useState<Date | null>(null)
  const [propertyId, setPropertyId] = useState<string | null>(editId || null)
  const [loading, setLoading] = useState(!!editId)
  const [processingStatus, setProcessingStatus] = useState<string | null>(null)

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
          latitude: p.latitude !== null ? String(p.latitude) : '',
          longitude: p.longitude !== null ? String(p.longitude) : '',
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

        // Load existing documents
        try {
          const docRes = await authFetch<{ documents: Array<{
            id: string; name: string; type: string; description: string | null; expiryDate: string | null; url: string
          }> }>(`/api/properties/${editId}/documents`)
          setExistingDocuments(docRes.documents || [])
        } catch {}
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

  // ── Document handling ────────────────────────────────────────────────────
  const handleDocFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Le document doit faire moins de 10 Mo.')
      return
    }
    setDocForm((prev) => ({ ...prev, file }))
  }

  const addDocument = () => {
    if (!docForm.name.trim() || !docForm.file) {
      toast.error('Veuillez donner un nom et sélectionner un fichier.')
      return
    }
    setNewDocuments((prev) => [...prev, {
      file: docForm.file!,
      name: docForm.name.trim(),
      type: docForm.type,
      description: docForm.description.trim(),
      expiryDate: docForm.expiryDate,
    }])
    setDocForm({ name: '', type: 'AUTRE', description: '', expiryDate: '', file: null })
    setDocFormOpen(false)
  }

  const removeNewDocument = (index: number) => {
    setNewDocuments((prev) => prev.filter((_, i) => i !== index))
  }

  const deleteExistingDocument = async (docId: string, propertyId: string) => {
    try {
      await authFetch(`/api/properties/${propertyId}/documents/${docId}`, { method: 'DELETE' })
      setExistingDocuments((prev) => prev.filter((d) => d.id !== docId))
      toast.success('Document supprimé')
    } catch {
      toast.error('Erreur lors de la suppression')
    }
  }

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
        latitude: form.latitude ? parseFloat(form.latitude) : null,
        longitude: form.longitude ? parseFloat(form.longitude) : null,
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
        // Update existing draft
        const result = await authFetch<{ property: { id: string; images: Array<{ url: string; order: number }>; virtualTourUrl: string | null } }>(`/api/properties/${propertyId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cleanPayload),
        })
        if (result.property.images) {
          setExistingImages(result.property.images)
        }
        if (result.property.virtualTourUrl) {
          setExistingVideo(result.property.virtualTourUrl)
          setVideoPreview(result.property.virtualTourUrl)
          setVideoFile(null)
        }
        setImagePreviews([])

        // Upload documents for existing property
        for (const doc of newDocuments) {
          const base64 = await fileToBase64(doc.file)
          await authFetch(`/api/properties/${propertyId}/documents`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: doc.name, type: doc.type, content: base64,
              description: doc.description || undefined,
              expiryDate: doc.expiryDate || undefined,
            }),
          })
        }
        setNewDocuments([])
      } else {
        // Create new draft
        const result = await authFetch<{ property: { id: string; images: Array<{ url: string; order: number }>; virtualTourUrl: string | null } }>('/api/properties', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...cleanPayload, draft: true }),
        })
        setPropertyId(result.property.id)
        if (result.property.images) {
          setExistingImages(result.property.images)
        }
        if (result.property.virtualTourUrl) {
          setExistingVideo(result.property.virtualTourUrl)
          setVideoPreview(result.property.virtualTourUrl)
          setVideoFile(null)
        }
        setImagePreviews([])
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
    setProcessingStatus('Préparation des images...')

    try {
      // Convert images to base64 in PARALLEL for speed
      const totalImages = imagePreviews.length
      const newImagesBase64: string[] = []

      if (totalImages > 0) {
        const chunkSize = 3 // Process 3 at a time to avoid memory spikes
        for (let i = 0; i < totalImages; i += chunkSize) {
          const chunk = imagePreviews.slice(i, i + chunkSize)
          const results = await Promise.all(
            chunk.map((img) => fileToBase64(img.file))
          )
          newImagesBase64.push(...results)
          setProcessingStatus(
            `Conversion des images ${Math.min(i + chunkSize, totalImages)}/${totalImages}...`
          )
        }
      }

      const allImages = [...existingImages.map((img) => img.url), ...newImagesBase64]

      // Convert video to base64
      let virtualTourUrl: string | null | undefined = undefined
      if (videoFile) {
        setProcessingStatus('Compression de la vidéo...')
        virtualTourUrl = await fileToBase64(videoFile)
      } else if (existingVideo) {
        virtualTourUrl = existingVideo
      } else {
        virtualTourUrl = null
      }

      setProcessingStatus('Envoi au serveur...')

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
        latitude: form.latitude ? parseFloat(form.latitude) : null,
        longitude: form.longitude ? parseFloat(form.longitude) : null,
        isFurnished: form.isFurnished,
        hasParking: form.hasParking,
        hasGarden: form.hasGarden,
        hasPool: form.hasPool,
        hideOwnerName: form.hideOwnerName,
        virtualTourUrl,
        images: allImages,
      }

      let pid = propertyId
      if (pid) {
        await authFetch(`/api/properties/${pid}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, status: 'ACTIVE' }),
          timeout: 120_000,
        })
      } else {
        const res = await authFetch<{ property: { id: string } }>('/api/properties', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          timeout: 120_000,
        })
        pid = res.property.id
        setPropertyId(pid)
      }

      // Upload pending documents
      if (pid && newDocuments.length > 0) {
        setProcessingStatus('Upload des documents...')
        for (const doc of newDocuments) {
          try {
            const base64 = await fileToBase64(doc.file)
            await authFetch(`/api/properties/${pid}/documents`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: doc.name,
                type: doc.type,
                content: base64,
                description: doc.description || undefined,
                expiryDate: doc.expiryDate || undefined,
              }),
            })
          } catch {
            toast.error(`Échec de l'upload du document: ${doc.name}`)
          }
        }
        setNewDocuments([])
      }

      setProcessingStatus(null)
      toast.success('Bien soumis pour vérification ! Un Tiers de Confiance validera votre annonce.')
      onSuccess?.()
    } catch (err) {
      setProcessingStatus(null)
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
        <Button variant="outline" size="sm" onClick={() => setDocModalOpen(true)} className="gap-1.5 shrink-0">
          <FileText className="size-4" />
          <span className="hidden sm:inline">Documents</span>
        </Button>
      </div>

      {/* ── Document Modal ──────────────────────────────────────────── */}
      <Dialog open={docModalOpen} onOpenChange={setDocModalOpen}>
        <DialogContent className="flex flex-col w-full h-full sm:h-auto sm:max-w-xl max-h-dvh sm:max-h-[90vh] rounded-none sm:rounded-lg border-0 sm:border p-0 sm:p-6">
          {/* Mobile drag handle */}
          <div className="sm:hidden flex justify-center pt-2 pb-1 absolute top-0 left-0 right-0 z-10">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
          </div>

          <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {/* Sticky header */}
            <div className="shrink-0 px-4 sm:px-0 pt-10 sm:pt-0 pb-2 sm:pb-0">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-lg">
                  <FileText className="size-4 text-brand-500" />
                  Documents du bien
                </DialogTitle>
                <DialogDescription>
                  Ajoutez, consultez ou supprimez les documents relatifs à ce bien (DPE, diagnostics, assurances, etc.).
                </DialogDescription>
              </DialogHeader>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-0 pb-4">
              <div className="space-y-4">
                {/* Existing documents */}
                {existingDocuments.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Documents déjà ajoutés</p>
                    {existingDocuments.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-3 sm:p-2.5 rounded-lg border border-border bg-muted/30">
                        <div className="flex items-center gap-3 sm:gap-2.5 min-w-0 flex-1">
                          <FileText className="size-5 sm:size-4 text-brand-500 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{doc.name}</p>
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                              <span>{docTypes.find((t) => t.value === doc.type)?.label || doc.type}</span>
                              {doc.expiryDate && <span>Exp. {new Date(doc.expiryDate).toLocaleDateString('fr-FR')}</span>}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => propertyId && deleteExistingDocument(doc.id, propertyId)}
                          className="size-8 sm:size-7 flex items-center justify-center rounded-md text-red-500 hover:bg-red-50 transition-colors shrink-0 ml-2"
                        >
                          <X className="size-4 sm:size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Pending new documents */}
                {newDocuments.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Nouveaux documents</p>
                    {newDocuments.map((doc, i) => (
                      <div key={i} className="flex items-center justify-between p-3 sm:p-2.5 rounded-lg border border-amber-200 bg-amber-50/50">
                        <div className="flex items-center gap-3 sm:gap-2.5 min-w-0 flex-1">
                          <FileText className="size-5 sm:size-4 text-amber-600 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{doc.name}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {docTypes.find((t) => t.value === doc.type)?.label || doc.type}
                              {doc.expiryDate && ` — Exp. ${new Date(doc.expiryDate).toLocaleDateString('fr-FR')}`}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => removeNewDocument(i)}
                          className="size-8 sm:size-7 flex items-center justify-center rounded-md text-red-500 hover:bg-red-50 transition-colors shrink-0 ml-2"
                        >
                          <X className="size-4 sm:size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <Separator />

                {/* Add document form */}
                {docFormOpen ? (
                  <div className="space-y-4 sm:space-y-3 p-4 sm:p-3 rounded-lg border border-border bg-muted/20">
                    <p className="text-sm sm:text-xs font-semibold text-foreground">Nouveau document</p>
                    <div className="grid grid-cols-1 gap-4 sm:gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5 sm:space-y-1">
                        <Label className="text-sm sm:text-xs font-medium">Nom <span className="text-red-400">*</span></Label>
                        <Input
                          placeholder="Ex: Diagnostic DPE"
                          value={docForm.name}
                          onChange={(e) => setDocForm((p) => ({ ...p, name: e.target.value }))}
                          className="h-10 sm:h-9 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5 sm:space-y-1">
                        <Label className="text-sm sm:text-xs font-medium">Type</Label>
                        <Select value={docForm.type} onValueChange={(v) => setDocForm((p) => ({ ...p, type: v }))}>
                          <SelectTrigger className="h-10 sm:h-9 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {docTypes.map((t) => (
                              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-1.5 sm:space-y-1">
                      <Label className="text-sm sm:text-xs font-medium">Description (optionnelle)</Label>
                      <Input
                        placeholder="Brève description du document"
                        value={docForm.description}
                        onChange={(e) => setDocForm((p) => ({ ...p, description: e.target.value }))}
                        className="h-10 sm:h-9 text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5 sm:space-y-1">
                        <Label className="text-sm sm:text-xs font-medium">Date d&apos;expiration (optionnelle)</Label>
                        <Input
                          type="date"
                          value={docForm.expiryDate}
                          onChange={(e) => setDocForm((p) => ({ ...p, expiryDate: e.target.value }))}
                          className="h-10 sm:h-9 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5 sm:space-y-1">
                        <Label className="text-sm sm:text-xs font-medium">Fichier <span className="text-red-400">*</span></Label>
                        <div className="flex items-center gap-2">
                          <input
                            ref={docInputRef}
                            type="file"
                            accept="image/*,application/pdf"
                            className="hidden"
                            onChange={handleDocFileSelect}
                          />
                          {docForm.file ? (
                            <div className="flex items-center gap-2 flex-1 h-10 sm:h-9 px-3 rounded-lg border border-border bg-card text-sm truncate">
                              <FileText className="size-4 text-brand-500 shrink-0" />
                              <span className="truncate text-foreground">{docForm.file.name}</span>
                              <button onClick={() => setDocForm((p) => ({ ...p, file: null }))} className="ml-auto shrink-0 text-red-500 hover:text-red-600"><X className="size-4 sm:size-3.5" /></button>
                            </div>
                          ) : (
                            <Button
                              variant="outline"
                              size="default"
                              onClick={() => docInputRef.current?.click()}
                              className="flex-1 sm:flex-none h-10 sm:h-9 gap-1.5"
                            >
                              <Upload className="size-4 sm:size-3.5" /> Choisir
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-1">
                      <Button variant="outline" size="default" onClick={() => { setDocFormOpen(false); setDocForm({ name: '', type: 'AUTRE', description: '', expiryDate: '', file: null }) }}
                        className="sm:text-sm">
                        Annuler
                      </Button>
                      <Button size="default" onClick={addDocument} className="gap-1.5 bg-brand-500 hover:bg-brand-600 text-white sm:text-sm">
                        <PlusCircle className="size-4 sm:size-3.5" /> Ajouter le document
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => setDocFormOpen(true)}
                    className="w-full h-11 sm:h-9 gap-2 border-dashed border-border text-muted-foreground hover:text-foreground"
                  >
                    <PlusCircle className="size-5 sm:size-4" />
                    Ajouter un document
                  </Button>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
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

          {/* ── Geolocation (Latitude / Longitude) ─────────────────────── */}
          <div className="bg-muted/30 rounded-xl border border-border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Navigation className="size-4 text-brand-500" />
                <span className="text-xs font-semibold text-foreground">Coordonnées GPS</span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  if (!navigator.geolocation) {
                    toast.error('Géolocalisation non disponible')
                    return
                  }
                  navigator.geolocation.getCurrentPosition(
                    (position) => {
                      update('latitude', String(position.coords.latitude))
                      update('longitude', String(position.coords.longitude))
                      toast.success('Position détectée')
                    },
                    () => toast.error('Impossible de détecter votre position'),
                    { enableHighAccuracy: true, timeout: 10000 }
                  )
                }}
                className="h-8 gap-1.5 text-xs border-brand-200 text-brand-600 hover:bg-brand-50"
              >
                <LocateFixed className="size-3.5" />
                <span className="hidden sm:inline">Ma position</span>
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] font-medium text-muted-foreground">Latitude</Label>
                <Input
                  type="number"
                  step="any"
                  placeholder="5.3364"
                  value={form.latitude}
                  onChange={(e) => update('latitude', e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-medium text-muted-foreground">Longitude</Label>
                <Input
                  type="number"
                  step="any"
                  placeholder="-4.0267"
                  value={form.longitude}
                  onChange={(e) => update('longitude', e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            {/* Map Picker */}
            <PropertyLocationPicker
              lat={form.latitude ? parseFloat(form.latitude) : null}
              lng={form.longitude ? parseFloat(form.longitude) : null}
              onLocationChange={(lat, lng) => {
                update('latitude', String(lat))
                update('longitude', String(lng))
              }}
              defaultCenter={{ lat: 5.3364, lng: -4.0267 }}
            />

            <p className="text-[10px] text-muted-foreground text-center">
              Cliquez sur la carte pour positionner le bien ou utilisez les champs ci-dessus
            </p>
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
            <p className="text-xs sm:text-sm font-medium text-foreground">Cliquez ou glissez vos photos ici</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 leading-relaxed">
              JPG, PNG, WEBP — Max 5 Mo — 10 photos max
            </p>
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
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2">
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
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2">
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
              <Video className="size-6 sm:size-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-xs sm:text-sm font-medium text-foreground">Télécharger une vidéo 3D</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">MP4, MOV, WEBM — Max 50 Mo</p>
              <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-2 leading-relaxed px-2">
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
          <span className="truncate">{savingDraft ? 'Sauvegarde...' : 'Sauvegarder le brouillon'}</span>
        </Button>
        <Button
          onClick={handlePublish}
          disabled={submitting}
          className="flex-1 h-12 bg-brand-500 hover:bg-brand-600 text-white font-semibold gap-2"
        >
          {submitting ? (
            <>
              <Loader2 className="size-5 animate-spin shrink-0" />
              <span className="truncate">{processingStatus || 'Vérification en cours...'}</span>
            </>
          ) : (
            <>
              <PlusCircle className="size-5 shrink-0" />
              Soumettre pour vérification
            </>
          )}
        </Button>
      </div>
    </motion.div>
  )
}
