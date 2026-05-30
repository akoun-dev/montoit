'use client'

import { useState, useEffect, useCallback } from 'react'
import { Settings, Building2, CreditCard, Bell, FileText, Save, Lock, Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch } from '@/lib/auth-fetch'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { AgenceSecurity } from './security'

const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } }
const itemVariants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }

export function AgenceSettings() {
  const { user, updateUser } = useAuthStore()
  const [activeTab, setActiveTab] = useState<'profil' | 'commissions' | 'notifications' | 'security'>('profil')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notifLoading, setNotifLoading] = useState(false)

  const [form, setForm] = useState({
    companyName: user?.companyName || '',
    address: user?.address || '',
    city: user?.city || '',
    email: user?.email || '',
    phone: user?.phone || '',
  })

  const [commission, setCommission] = useState({
    rate: '8.5',
    type: 'PERCENTAGE',
  })

  const [notifications, setNotifications] = useState({
    messages: true,
    dossierUpdates: true,
    visitReminders: true,
    paymentAlerts: true,
    promotions: false,
  })
  const [notifSaving, setNotifSaving] = useState<Record<string, boolean>>({})

  // Fetch profile from API
  const fetchProfile = useCallback(async () => {
    if (!user) return
    try {
      const result = await authFetch<{ user: any }>('/api/profile')
      const p = result.user
      setForm({
        companyName: p.companyName || user?.companyName || '',
        address: p.address || user?.address || '',
        city: p.city || user?.city || '',
        email: p.email || user?.email || '',
        phone: p.phone || user?.phone || '',
      })
    } catch {}
    setLoading(false)
  }, [user])

  useEffect(() => { fetchProfile() }, [fetchProfile])

  // Fetch commission settings from API
  const fetchCommissionSettings = useCallback(async () => {
    try {
      const data = await authFetch<{ settings: any }>('/api/agence/settings')
      if (data.settings) {
        setCommission({
          rate: data.settings.commissionRate || '8.5',
          type: data.settings.commissionType || 'PERCENTAGE',
        })
      }
    } catch {}
  }, [])

  // Fetch notification preferences when tab changes
  useEffect(() => {
    if (activeTab === 'notifications' && user) {
      setNotifLoading(true)
      authFetch<{ preferences: any }>('/api/settings/notifications')
        .then((data) => {
          if (data.preferences) {
            setNotifications({
              messages: data.preferences.messages ?? true,
              dossierUpdates: data.preferences.dossierUpdates ?? true,
              visitReminders: data.preferences.visitReminders ?? true,
              paymentAlerts: data.preferences.paymentAlerts ?? true,
              promotions: data.preferences.promotions ?? false,
            })
          }
        })
        .catch(() => {})
        .finally(() => setNotifLoading(false))
    }
  }, [activeTab, user])

  // Save profile
  const handleSaveProfile = async () => {
    setSaving(true)
    try {
      const result = await authFetch<{ user: any }>('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: user?.firstName,
          lastName: user?.lastName,
          phone: form.phone,
          companyName: form.companyName,
          address: form.address,
          city: form.city,
        }),
      })
      if (result.user) {
        updateUser({
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          avatarUrl: result.user.avatarUrl,
        })
      }
      toast.success('Profil mis à jour avec succès')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  // Load commission settings when tab changes
  useEffect(() => {
    if (activeTab === 'commissions') {
      fetchCommissionSettings()
    }
  }, [activeTab, fetchCommissionSettings])

  // Save commission settings
  const handleSaveCommission = async () => {
    setSaving(true)
    try {
      await authFetch('/api/agence/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commissionRate: commission.rate,
          commissionType: commission.type,
        }),
      })
      toast.success('Taux de commission sauvegardé')
    } catch {
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  // Toggle notification
  const handleToggleNotif = useCallback(async (key: string, value: boolean) => {
    setNotifSaving((prev) => ({ ...prev, [key]: true }))
    try {
      await authFetch('/api/settings/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      })
      setNotifications((prev) => ({ ...prev, [key]: value }))
      toast.success('Préférence mise à jour')
    } catch {
      toast.error('Erreur lors de la mise à jour')
      // Revert on error
      setNotifications((prev) => ({ ...prev, [key]: !value }))
    } finally {
      setNotifSaving((prev) => ({ ...prev, [key]: false }))
    }
  }, [])

  const tabs = [
    { id: 'profil' as const, label: 'Profil', icon: Building2 },
    { id: 'commissions' as const, label: 'Commissions', icon: CreditCard },
    { id: 'notifications' as const, label: 'Notifications', icon: Bell },
    { id: 'security' as const, label: 'Sécurité', icon: Lock },
  ]

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={itemVariants}>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
          <Settings className="size-5 sm:size-6 text-brand-500" /> Paramètres
        </h1>
        <p className="text-muted-foreground mt-1">Configurez votre espace agence</p>
      </motion.div>

      {/* Tab Navigation */}
      <motion.div variants={itemVariants}>
        <div className="flex gap-1 p-1 bg-muted rounded-xl">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex-1 justify-center ${
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

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {/* ── PROFIL TAB ──────────────────────────────────────────────── */}
        {activeTab === 'profil' && (
          <motion.div
            key="profil"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Building2 className="size-4 text-brand-500" /> Profil de l&apos;agence
                </CardTitle>
                <CardDescription>Informations principales de votre agence</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">Nom de l&apos;agence</label>
                    <Input value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">Email</label>
                    <Input value={form.email} disabled className="h-9 text-sm bg-muted text-muted-foreground" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">Téléphone</label>
                    <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">Ville</label>
                    <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="h-9 text-sm" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Adresse</label>
                  <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="h-9 text-sm" />
                </div>

                <div className="flex justify-end pt-2">
                  <Button onClick={handleSaveProfile} disabled={saving} className="bg-brand-500 hover:bg-brand-600 text-white">
                    {saving ? <><Loader2 className="size-4 mr-2 animate-spin" /> Sauvegarde...</> : <><Save className="size-4 mr-2" /> Sauvegarder</>}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Document Templates */}
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <FileText className="size-4 text-brand-500" /> Modèles de documents
                </CardTitle>
                <CardDescription>Gérez vos modèles de documents agence</CardDescription>
              </CardHeader>
              <CardContent className="grid sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl border border-border hover:bg-accent/50 transition-colors cursor-pointer">
                  <FileText className="size-5 text-brand-500 mb-1" />
                  <p className="text-sm font-medium">Bail type</p>
                  <p className="text-[10px] text-muted-foreground">Dernière mise à jour : 01/05/2025</p>
                </div>
                <div className="p-3 rounded-xl border border-border hover:bg-accent/50 transition-colors cursor-pointer">
                  <FileText className="size-5 text-brand-500 mb-1" />
                  <p className="text-sm font-medium">Mandat</p>
                  <p className="text-[10px] text-muted-foreground">Dernière mise à jour : 15/04/2025</p>
                </div>
                <div className="p-3 rounded-xl border border-border hover:bg-accent/50 transition-colors cursor-pointer">
                  <FileText className="size-5 text-brand-500 mb-1" />
                  <p className="text-sm font-medium">État des lieux</p>
                  <p className="text-[10px] text-muted-foreground">Dernière mise à jour : 20/03/2025</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ── COMMISSIONS TAB ──────────────────────────────────────────── */}
        {activeTab === 'commissions' && (
          <motion.div
            key="commissions"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <CreditCard className="size-4 text-brand-500" /> Commissions par défaut
                </CardTitle>
                <CardDescription>Configurez les taux de commission appliqués aux transactions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">Taux de commission</label>
                    <Input type="number" step="0.5" value={commission.rate}
                      onChange={(e) => setCommission({ ...commission, rate: e.target.value })}
                      className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">Type</label>
                    <Select value={commission.type} onValueChange={(v) => setCommission({ ...commission, type: v })}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PERCENTAGE">Pourcentage</SelectItem>
                        <SelectItem value="FIXED">Montant fixe</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button onClick={handleSaveCommission} disabled={saving} className="bg-brand-500 hover:bg-brand-600 text-white">
                    {saving ? <><Loader2 className="size-4 mr-2 animate-spin" /> Sauvegarde...</> : <><Save className="size-4 mr-2" /> Enregistrer</>}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ── NOTIFICATIONS TAB ────────────────────────────────────────── */}
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
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Bell className="size-4 text-brand-500" /> Notifications automatiques
                </CardTitle>
                <CardDescription>Configurez les notifications envoyées à vos clients</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {notifLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="h-14 bg-muted rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {Object.entries(notifications).map(([key, enabled]) => (
                      <div key={key} className="flex items-center justify-between p-3 rounded-xl border border-border hover:bg-accent/30 transition-colors">
                        <span className="text-sm font-medium text-foreground">
                          {key === 'messages' ? 'Nouveaux messages' : key === 'dossierUpdates' ? 'Mises à jour de dossier' : key === 'visitReminders' ? 'Rappels de visite' : key === 'paymentAlerts' ? 'Alertes de paiement' : 'Promotions'}
                        </span>
                        <div className="flex items-center gap-2">
                          {notifSaving[key] && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
                          <Switch
                            checked={enabled}
                            onCheckedChange={(v) => handleToggleNotif(key, v)}
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

        {/* ── SÉCURITÉ TAB ─────────────────────────────────────────────── */}
        {activeTab === 'security' && (
          <motion.div
            key="security"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <AgenceSecurity />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
