'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Settings, User, Bell, Sliders, Mail, Phone, ShieldCheck,
  ChevronRight, CheckCircle2, XCircle, Save, Loader2,
  Eye, EyeOff, Camera, Building2, FileText, Cigarette,
  PawPrint, DollarSign, CalendarDays, ArrowUpDown, Filter,
  Trash2,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch } from '@/lib/auth-fetch'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'

// ── Types ───────────────────────────────────────────────────────────────────

interface OwnerProfileData {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  avatarUrl: string | null
  bio: string | null
  companyName: string | null
  showPhone: boolean
  showEmail: boolean
  isEmailVerified: boolean
  isPhoneVerified: boolean
  role: string
}

interface NotificationPreferences {
  id: string
  messages: boolean
  dossierUpdates: boolean
  visitReminders: boolean
  paymentAlerts: boolean
  promotions: boolean
}

interface DefaultConditions {
  depositMonths: number
  leaseDurationMonths: number
  defaultCharges: number
  smokingPolicy: 'INTERDIT' | 'AUTORISE' | 'NON_SPECIFIE'
  petPolicy: 'INTERDIT' | 'AUTORISE' | 'NON_SPECIFIE'
  minIncomeRatio: number
  minDocuments: number
  defaultSort: 'DATE' | 'REVENUE' | 'CATEGORY'
}

// ── Animations ──────────────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

// ── Main Owner Settings Component ───────────────────────────────────────────

export function OwnerSettings() {
  const { user, updateUser } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'profil' | 'notifications' | 'conditions' | 'tri'>('profil')

  // Profile state
  const [profile, setProfile] = useState<OwnerProfileData | null>(null)
  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    bio: '',
    companyName: '',
    showPhone: true,
    showEmail: false,
  })
  const [profileSaving, setProfileSaving] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  // Notification preferences state
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences | null>(null)
  const [notifLoading, setNotifLoading] = useState(false)
  const [notifSaving, setNotifSaving] = useState<Record<string, boolean>>({})

  // Default conditions state
  const [conditions, setConditions] = useState<DefaultConditions | null>(null)
  const [conditionsLoading, setConditionsLoading] = useState(false)
  const [conditionsSaving, setConditionsSaving] = useState(false)

  // ── Fetch profile data ──────────────────────────────────────────────────
  const fetchProfile = useCallback(async () => {
    if (!user) return
    try {
      const result = await authFetch<{ user: OwnerProfileData }>('/api/profile')
      const p = result.user
      setProfile(p)
      setProfileForm({
        firstName: p.firstName || '',
        lastName: p.lastName || '',
        phone: p.phone || '',
        bio: (p as Record<string, unknown>).bio as string || '',
        companyName: (p as Record<string, unknown>).companyName as string || '',
        showPhone: (p as Record<string, unknown>).showPhone as boolean ?? true,
        showEmail: (p as Record<string, unknown>).showEmail as boolean ?? false,
      })
    } catch {
      // Silent
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  // ── Fetch notification preferences ──────────────────────────────────────
  useEffect(() => {
    if (activeTab === 'notifications' && user) {
      setNotifLoading(true)
      authFetch<{ preferences: NotificationPreferences }>('/api/user/notification-preferences')
        .then((data) => setNotifPrefs(data.preferences))
        .catch(() => {})
        .finally(() => setNotifLoading(false))
    }
  }, [activeTab, user])

  // ── Fetch default conditions ────────────────────────────────────────────
  useEffect(() => {
    if (activeTab === 'conditions' && user) {
      setConditionsLoading(true)
      authFetch<{ conditions: DefaultConditions }>('/api/user/default-conditions')
        .then((data) => setConditions(data.conditions))
        .catch(() => {})
        .finally(() => setConditionsLoading(false))
    }
  }, [activeTab, user])

  // ── Fetch conditions also for tri tab ────────────────────────────────────
  useEffect(() => {
    if (activeTab === 'tri' && user && !conditions) {
      setConditionsLoading(true)
      authFetch<{ conditions: DefaultConditions }>('/api/user/default-conditions')
        .then((data) => setConditions(data.conditions))
        .catch(() => {})
        .finally(() => setConditionsLoading(false))
    }
  }, [activeTab, user, conditions])

  // ── Save profile ────────────────────────────────────────────────────────
  const handleSaveProfile = useCallback(async () => {
    setProfileSaving(true)
    try {
      const result = await authFetch<{ user: OwnerProfileData }>('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileForm),
      })
      setProfile(result.user)
      updateUser({
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        avatarUrl: result.user.avatarUrl,
      })
      toast.success('Profil mis à jour avec succès')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde')
    } finally {
      setProfileSaving(false)
    }
  }, [profileForm, updateUser])

  // ── Toggle notification preference ──────────────────────────────────────
  const handleToggleNotif = useCallback(async (key: keyof NotificationPreferences, value: boolean) => {
    if (key === 'id') return
    setNotifSaving((prev) => ({ ...prev, [key]: true }))
    try {
      await authFetch('/api/user/notification-preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      })
      setNotifPrefs((prev) => prev ? { ...prev, [key]: value } : prev)
      toast.success('Préférence mise à jour')
    } catch {
      toast.error('Erreur lors de la mise à jour')
    } finally {
      setNotifSaving((prev) => ({ ...prev, [key]: false }))
    }
  }, [])

  // ── Save default conditions ─────────────────────────────────────────────
  const handleSaveConditions = useCallback(async (data: Partial<DefaultConditions>) => {
    setConditionsSaving(true)
    try {
      const result = await authFetch<{ conditions: DefaultConditions }>('/api/user/default-conditions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      setConditions(result.conditions)
      toast.success('Conditions par défaut mises à jour')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde')
    } finally {
      setConditionsSaving(false)
    }
  }, [])

  // ── Avatar upload handler ───────────────────────────────────────────────
  const handleAvatarUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Format d\'image invalide. Utilisez JPG, PNG ou WEBP.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('L\'image est trop volumineuse (max 2 Mo).')
      return
    }

    setAvatarUploading(true)
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const SIZE = 200
          canvas.width = SIZE
          canvas.height = SIZE
          const ctx = canvas.getContext('2d')
          if (!ctx) { reject(new Error('Canvas non supporté')); return }
          const sourceSize = Math.min(img.width, img.height)
          const sx = (img.width - sourceSize) / 2
          const sy = (img.height - sourceSize) / 2
          ctx.drawImage(img, sx, sy, sourceSize, sourceSize, 0, 0, SIZE, SIZE)
          resolve(canvas.toDataURL('image/jpeg', 0.85))
        }
        img.onerror = () => reject(new Error('Impossible de charger l\'image'))
        img.src = URL.createObjectURL(file)
      })

      const result = await authFetch<{ user: { avatarUrl: string | null } }>('/api/profile/avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar: dataUrl }),
      })

      setProfile((prev) => prev ? { ...prev, avatarUrl: result.user.avatarUrl } : prev)
      updateUser({ avatarUrl: result.user.avatarUrl })
      toast.success('Photo de profil mise à jour !')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors du chargement de la photo')
    } finally {
      setAvatarUploading(false)
    }
  }, [updateUser])

  // ── Avatar delete handler ───────────────────────────────────────────────
  const handleAvatarDelete = useCallback(async () => {
    setAvatarUploading(true)
    try {
      await authFetch('/api/profile/avatar', { method: 'DELETE' })
      setProfile((prev) => prev ? { ...prev, avatarUrl: null } : prev)
      updateUser({ avatarUrl: null })
      toast.success('Photo de profil supprimée')
    } catch {
      toast.error('Erreur lors de la suppression de la photo')
    } finally {
      setAvatarUploading(false)
    }
  }, [updateUser])

  // ── Loading state ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted rounded-lg animate-pulse" />
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-48 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  // Tab navigation items
  const tabs = [
    { id: 'profil' as const, label: 'Mon Profil', icon: User },
    { id: 'notifications' as const, label: 'Notifications', icon: Bell },
    { id: 'conditions' as const, label: 'Conditions', icon: FileText },
    { id: 'tri' as const, label: 'Tri & Filtres', icon: Sliders },
  ]

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold text-foreground">Paramètres</h1>
        <p className="text-muted-foreground mt-1">Gérez votre profil propriétaire et vos préférences</p>
      </motion.div>

      {/* User Info Card */}
      <motion.div variants={itemVariants}>
        <Card className="border-border overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="relative shrink-0 group">
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={avatarUploading}
                  className="relative size-14 rounded-full overflow-hidden focus:outline-none focus:ring-2 focus:ring-brand-400 focus:ring-offset-2"
                  title="Changer la photo de profil"
                >
                  {profile?.avatarUrl ? (
                    <img src={profile.avatarUrl} alt="Photo de profil" className="size-full object-cover" />
                  ) : (
                    <div className="flex size-full items-center justify-center bg-brand-50 text-brand-500">
                      <span className="text-lg font-bold">
                        {profile?.firstName?.charAt(0)?.toUpperCase() || 'P'}
                        {profile?.lastName?.charAt(0)?.toUpperCase() || ''}
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    {avatarUploading ? <Loader2 className="size-5 animate-spin text-white" /> : <Camera className="size-5 text-white" />}
                  </div>
                </button>
                {profile?.avatarUrl && !avatarUploading && (
                  <button
                    onClick={handleAvatarDelete}
                    className="absolute -bottom-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full bg-red-500 text-white shadow-sm hover:bg-red-600 transition-colors"
                    title="Supprimer la photo"
                  >
                    <Trash2 className="size-3" />
                  </button>
                )}
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-foreground truncate">
                  {profile?.firstName || user?.firstName} {profile?.lastName || user?.lastName}
                </h3>
                <div className="space-y-1 mt-1.5">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="size-3.5 shrink-0" />
                    <span className="truncate">{profile?.email || user?.email || 'Non renseigné'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="size-3.5 shrink-0" />
                    <span>{profile?.phone || user?.phone || 'Non renseigné'}</span>
                  </div>
                </div>
              </div>
              <Badge className="bg-brand-50 text-brand-700 border-brand-200 border text-xs font-semibold px-3 py-1 shrink-0">
                <ShieldCheck className="size-3.5 mr-1" />
                Propriétaire
              </Badge>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Tab Navigation */}
      <motion.div variants={itemVariants}>
        <div className="flex gap-1 p-1 bg-muted rounded-xl overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex-1 justify-center whitespace-nowrap ${
                  isActive
                    ? 'bg-card text-brand-600 shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="size-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            )
          })}
        </div>
      </motion.div>

      {/* ── Tab Content ──────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">

        {/* ── PROFIL TAB (US-P-111) ─────────────────────────────────────── */}
        {activeTab === 'profil' && (
          <motion.div
            key="profil"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Profile form */}
            <Card className="border-border">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <User className="size-4 text-brand-500" />
                  Profil public
                </CardTitle>
                <CardDescription>
                  Ces informations sont visibles par les candidats locataires
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Name fields */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="owner-firstName" className="text-xs font-medium text-foreground">
                      Prénom <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      id="owner-firstName"
                      value={profileForm.firstName}
                      onChange={(e) => setProfileForm((prev) => ({ ...prev, firstName: e.target.value }))}
                      placeholder="Votre prénom"
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="owner-lastName" className="text-xs font-medium text-foreground">
                      Nom <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      id="owner-lastName"
                      value={profileForm.lastName}
                      onChange={(e) => setProfileForm((prev) => ({ ...prev, lastName: e.target.value }))}
                      placeholder="Votre nom"
                      className="h-9 text-sm"
                    />
                  </div>
                </div>

                {/* Phone with visibility toggle */}
                <div className="space-y-1.5">
                  <Label htmlFor="owner-phone" className="text-xs font-medium text-foreground flex items-center gap-1.5">
                    <Phone className="size-3" /> Téléphone
                    {profile?.isPhoneVerified && (
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[9px] px-1 py-0 border">
                        <CheckCircle2 className="size-2.5 mr-0.5" /> Vérifié
                      </Badge>
                    )}
                  </Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="owner-phone"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm((prev) => ({ ...prev, phone: e.target.value }))}
                      placeholder="+225 XX XX XX XX"
                      className="h-9 text-sm flex-1"
                    />
                    <div className="flex items-center gap-2 shrink-0">
                      <Switch
                        checked={profileForm.showPhone}
                        onCheckedChange={(val) => setProfileForm((prev) => ({ ...prev, showPhone: val }))}
                      />
                      <span className="text-xs text-muted-foreground">
                        {profileForm.showPhone ? (
                          <Eye className="size-3.5 text-emerald-500" />
                        ) : (
                          <EyeOff className="size-3.5 text-muted-foreground" />
                        )}
                      </span>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {profileForm.showPhone ? 'Visible par les candidats' : 'Masqué pour les candidats'}
                  </p>
                </div>

                {/* Email with visibility toggle */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                    <Mail className="size-3" /> Email
                    {profile?.isEmailVerified && (
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[9px] px-1 py-0 border">
                        <CheckCircle2 className="size-2.5 mr-0.5" /> Vérifié
                      </Badge>
                    )}
                  </Label>
                  <div className="flex items-center gap-3">
                    <Input
                      value={profile?.email || user?.email || ''}
                      disabled
                      className="h-9 text-sm bg-muted text-muted-foreground flex-1"
                    />
                    <div className="flex items-center gap-2 shrink-0">
                      <Switch
                        checked={profileForm.showEmail}
                        onCheckedChange={(val) => setProfileForm((prev) => ({ ...prev, showEmail: val }))}
                      />
                      <span className="text-xs text-muted-foreground">
                        {profileForm.showEmail ? (
                          <Eye className="size-3.5 text-emerald-500" />
                        ) : (
                          <EyeOff className="size-3.5 text-muted-foreground" />
                        )}
                      </span>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {profileForm.showEmail ? 'Visible par les candidats' : 'Masqué pour les candidats'}
                  </p>
                </div>

                <Separator />

                {/* Company name */}
                <div className="space-y-1.5">
                  <Label htmlFor="owner-company" className="text-xs font-medium text-foreground flex items-center gap-1.5">
                    <Building2 className="size-3" /> Nom de l&apos;entreprise
                  </Label>
                  <Input
                    id="owner-company"
                    value={profileForm.companyName}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, companyName: e.target.value }))}
                    placeholder="Ex: SCI Mon Toit, SARL..."
                    className="h-9 text-sm"
                  />
                  <p className="text-[10px] text-muted-foreground">Optionnel — si vous louez via une entreprise</p>
                </div>

                {/* Bio */}
                <div className="space-y-1.5">
                  <Label htmlFor="owner-bio" className="text-xs font-medium text-foreground">
                    Description / Biographie
                  </Label>
                  <Textarea
                    id="owner-bio"
                    value={profileForm.bio}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, bio: e.target.value }))}
                    placeholder="Présentez-vous brièvement aux candidats locataires..."
                    className="min-h-[80px] text-sm resize-none"
                    maxLength={500}
                  />
                  <p className="text-[10px] text-muted-foreground text-right">
                    {profileForm.bio.length}/500 caractères
                  </p>
                </div>

                {/* Save button */}
                <div className="flex justify-end pt-2">
                  <Button
                    onClick={handleSaveProfile}
                    disabled={profileSaving}
                    className="bg-brand-500 hover:bg-brand-600 text-white"
                  >
                    {profileSaving ? (
                      <><Loader2 className="size-4 mr-2 animate-spin" /> Enregistrement...</>
                    ) : (
                      <><Save className="size-4 mr-2" /> Enregistrer le profil</>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ── NOTIFICATIONS TAB (US-P-110) ──────────────────────────────── */}
        {activeTab === 'notifications' && (
          <motion.div
            key="notifications"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <Card className="border-border">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Bell className="size-4 text-brand-500" />
                  Préférences de notification
                </CardTitle>
                <CardDescription>
                  Choisissez les notifications que vous souhaitez recevoir
                </CardDescription>
              </CardHeader>
              <CardContent>
                {notifLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="h-14 bg-muted rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {[
                      { key: 'messages' as const, label: 'Messages', description: 'Nouveaux messages des candidats', icon: Mail },
                      { key: 'dossierUpdates' as const, label: 'Mises à jour des dossiers', description: 'Changements de statut des dossiers locatifs', icon: FileText },
                      { key: 'visitReminders' as const, label: 'Rappels de visite', description: 'Demandes de visite et rappels', icon: CalendarDays },
                      { key: 'paymentAlerts' as const, label: 'Alertes de paiement', description: 'Paiements reçus et en retard', icon: DollarSign },
                      { key: 'promotions' as const, label: 'Promotions', description: 'Offres spéciales et nouveautés de la plateforme', icon: Settings },
                    ].map(({ key, label, description, icon: Icon }) => (
                      <div
                        key={key}
                        className="flex items-center justify-between p-4 rounded-xl border border-border hover:bg-accent transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-500">
                            <Icon className="size-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{label}</p>
                            <p className="text-xs text-muted-foreground">{description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {notifSaving[key] && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
                          <Switch
                            checked={notifPrefs?.[key] ?? true}
                            onCheckedChange={(val) => handleToggleNotif(key, val)}
                            disabled={notifSaving[key]}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ── CONDITIONS TAB (US-P-113) ─────────────────────────────────── */}
        {activeTab === 'conditions' && (
          <motion.div
            key="conditions"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <Card className="border-border">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <FileText className="size-4 text-brand-500" />
                  Conditions locatives par défaut
                </CardTitle>
                <CardDescription>
                  Ces valeurs pré-remplissent vos nouvelles annonces de propriété
                </CardDescription>
              </CardHeader>
              <CardContent>
                {conditionsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-14 bg-muted rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : conditions ? (
                  <div className="space-y-5">
                    {/* Financial conditions */}
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                        <DollarSign className="size-4 text-brand-500" />
                        Conditions financières
                      </h4>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-foreground">Caution (mois de loyer)</Label>
                          <Select
                            value={String(conditions.depositMonths)}
                            onValueChange={(val) => handleSaveConditions({ depositMonths: parseInt(val, 10) })}
                          >
                            <SelectTrigger className="h-9 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">Aucune caution</SelectItem>
                              <SelectItem value="1">1 mois</SelectItem>
                              <SelectItem value="2">2 mois</SelectItem>
                              <SelectItem value="3">3 mois</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-foreground">Durée du bail</Label>
                          <Select
                            value={String(conditions.leaseDurationMonths)}
                            onValueChange={(val) => handleSaveConditions({ leaseDurationMonths: parseInt(val, 10) })}
                          >
                            <SelectTrigger className="h-9 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="6">6 mois</SelectItem>
                              <SelectItem value="12">1 an (12 mois)</SelectItem>
                              <SelectItem value="24">2 ans (24 mois)</SelectItem>
                              <SelectItem value="36">3 ans (36 mois)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="mt-4 space-y-1.5">
                        <Label htmlFor="default-charges" className="text-xs font-medium text-foreground">
                          Charges par défaut (FCFA)
                        </Label>
                        <Input
                          id="default-charges"
                          type="number"
                          value={conditions.defaultCharges}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10)
                            if (!isNaN(val) && val >= 0) {
                              setConditions((prev) => prev ? { ...prev, defaultCharges: val } : prev)
                            }
                          }}
                          onBlur={() => handleSaveConditions({ defaultCharges: conditions.defaultCharges })}
                          placeholder="0"
                          className="h-9 text-sm max-w-xs"
                          min={0}
                        />
                      </div>
                    </div>

                    <Separator />

                    {/* Policies */}
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                        <Sliders className="size-4 text-brand-500" />
                        Politiques
                      </h4>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                            <Cigarette className="size-3" /> Politique fumeur
                          </Label>
                          <Select
                            value={conditions.smokingPolicy}
                            onValueChange={(val) => handleSaveConditions({ smokingPolicy: val as DefaultConditions['smokingPolicy'] })}
                          >
                            <SelectTrigger className="h-9 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="NON_SPECIFIE">Non spécifié</SelectItem>
                              <SelectItem value="INTERDIT">Interdit</SelectItem>
                              <SelectItem value="AUTORISE">Autorisé</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                            <PawPrint className="size-3" /> Politique animaux
                          </Label>
                          <Select
                            value={conditions.petPolicy}
                            onValueChange={(val) => handleSaveConditions({ petPolicy: val as DefaultConditions['petPolicy'] })}
                          >
                            <SelectTrigger className="h-9 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="NON_SPECIFIE">Non spécifié</SelectItem>
                              <SelectItem value="INTERDIT">Interdit</SelectItem>
                              <SelectItem value="AUTORISE">Autorisé</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">Impossible de charger les conditions</p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ── TRI & FILTRES TAB (US-P-112) ──────────────────────────────── */}
        {activeTab === 'tri' && (
          <motion.div
            key="tri"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Default sort */}
            <Card className="border-border">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <ArrowUpDown className="size-4 text-brand-500" />
                  Tri des candidatures par défaut
                </CardTitle>
                <CardDescription>
                  Définissez l&apos;ordre d&apos;affichage des candidatures reçues
                </CardDescription>
              </CardHeader>
              <CardContent>
                {conditionsLoading ? (
                  <div className="h-14 bg-muted rounded-lg animate-pulse" />
                ) : conditions ? (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-foreground">Trier par</Label>
                      <Select
                        value={conditions.defaultSort}
                        onValueChange={(val) => handleSaveConditions({ defaultSort: val as DefaultConditions['defaultSort'] })}
                      >
                        <SelectTrigger className="h-9 text-sm max-w-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DATE">Date de candidature</SelectItem>
                          <SelectItem value="REVENUE">Revenu du candidat</SelectItem>
                          <SelectItem value="CATEGORY">Catégorie du candidat</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">Impossible de charger</p>
                )}
              </CardContent>
            </Card>

            {/* Auto-reject criteria */}
            <Card className="border-border">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Filter className="size-4 text-brand-500" />
                  Critères de rejet automatique
                </CardTitle>
                <CardDescription>
                  Les candidatures ne respectant pas ces critères seront automatiquement rejetées
                </CardDescription>
              </CardHeader>
              <CardContent>
                {conditionsLoading ? (
                  <div className="space-y-4">
                    {[1, 2].map((i) => (
                      <div key={i} className="h-14 bg-muted rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : conditions ? (
                  <div className="space-y-5">
                    <div className="space-y-1.5">
                      <Label htmlFor="min-income-ratio" className="text-xs font-medium text-foreground">
                        Ratio revenu/loyer minimum
                      </Label>
                      <div className="flex items-center gap-3 max-w-xs">
                        <Input
                          id="min-income-ratio"
                          type="number"
                          value={conditions.minIncomeRatio}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value)
                            if (!isNaN(val) && val >= 1 && val <= 10) {
                              setConditions((prev) => prev ? { ...prev, minIncomeRatio: val } : prev)
                            }
                          }}
                          onBlur={() => handleSaveConditions({ minIncomeRatio: conditions.minIncomeRatio })}
                          min={1}
                          max={10}
                          step={0.5}
                          className="h-9 text-sm"
                        />
                        <span className="text-xs text-muted-foreground shrink-0">x le loyer</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Ex: 3 = le revenu doit être au moins 3 fois le loyer
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="min-documents" className="text-xs font-medium text-foreground">
                        Nombre minimum de documents
                      </Label>
                      <div className="flex items-center gap-3 max-w-xs">
                        <Input
                          id="min-documents"
                          type="number"
                          value={conditions.minDocuments}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10)
                            if (!isNaN(val) && val >= 0 && val <= 20) {
                              setConditions((prev) => prev ? { ...prev, minDocuments: val } : prev)
                            }
                          }}
                          onBlur={() => handleSaveConditions({ minDocuments: conditions.minDocuments })}
                          min={0}
                          max={20}
                          className="h-9 text-sm"
                        />
                        <span className="text-xs text-muted-foreground shrink-0">documents</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Les candidatures avec moins de documents seront rejetées automatiquement
                      </p>
                    </div>

                    {/* Info box */}
                    <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                      <div className="flex items-start gap-2">
                        <ChevronRight className="size-4 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-medium text-amber-700">Note</p>
                          <p className="text-[11px] text-amber-600 mt-0.5">
                            Les critères de rejet automatique s&apos;appliquent à toutes les nouvelles candidatures.
                            Vous pouvez toujours réviser manuellement une candidature rejetée.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">Impossible de charger</p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
