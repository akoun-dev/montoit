'use client'

import { useState } from 'react'
import { Settings, Building2, CreditCard, Bell, Users, FileText, Save, Lock } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useAuthStore } from '@/lib/auth-store'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { AgenceSecurity } from './security'

const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } }
const itemVariants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }

export function AgenceSettings() {
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState<'profil' | 'commissions' | 'notifications' | 'equipe' | 'security'>('profil')
  const [form, setForm] = useState({
    companyName: user?.companyName || '',
    address: user?.address || '',
    city: user?.city || '',
    email: user?.email || '',
    phone: user?.phone || '',
    defaultCommissionRate: '8.5',
    defaultCommissionType: 'PERCENTAGE',
  })
  const [notifications, setNotifications] = useState({
    messages: true,
    dossierUpdates: true,
    visitReminders: true,
    paymentAlerts: true,
    promotions: false,
  })

  const handleSave = () => {
    toast.success('Paramètres sauvegardés avec succès')
  }

  const tabs = [
    { id: 'profil' as const, label: 'Profil', icon: Building2 },
    { id: 'commissions' as const, label: 'Commissions', icon: CreditCard },
    { id: 'notifications' as const, label: 'Notifications', icon: Bell },
    { id: 'equipe' as const, label: 'Équipe', icon: Users },
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
                    <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="h-9 text-sm" />
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
                  <Button onClick={handleSave} className="bg-brand-500 hover:bg-brand-600 text-white">
                    <Save className="size-4 mr-2" /> Sauvegarder
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
                    <Input type="number" step="0.5" value={form.defaultCommissionRate}
                      onChange={(e) => setForm({ ...form, defaultCommissionRate: e.target.value })}
                      className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">Type</label>
                    <Select value={form.defaultCommissionType} onValueChange={(v) => setForm({ ...form, defaultCommissionType: v })}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PERCENTAGE">Pourcentage</SelectItem>
                        <SelectItem value="FIXED">Montant fixe</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button onClick={handleSave} className="bg-brand-500 hover:bg-brand-600 text-white">
                    <Save className="size-4 mr-2" /> Enregistrer
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
                {Object.entries(notifications).map(([key, enabled]) => (
                  <div key={key} className="flex items-center justify-between p-3 rounded-xl border border-border hover:bg-accent/30 transition-colors">
                    <span className="text-sm font-medium text-foreground">
                      {key === 'messages' ? 'Nouveaux messages' : key === 'dossierUpdates' ? 'Mises à jour de dossier' : key === 'visitReminders' ? 'Rappels de visite' : key === 'paymentAlerts' ? 'Alertes de paiement' : 'Promotions'}
                    </span>
                    <Switch
                      checked={enabled}
                      onCheckedChange={(v) => setNotifications({ ...notifications, [key]: v })}
                    />
                  </div>
                ))}

                <div className="flex justify-end pt-2">
                  <Button onClick={handleSave} className="bg-brand-500 hover:bg-brand-600 text-white">
                    <Save className="size-4 mr-2" /> Enregistrer
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ── ÉQUIPE TAB ──────────────────────────────────────────────── */}
        {activeTab === 'equipe' && (
          <motion.div
            key="equipe"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Users className="size-4 text-brand-500" /> Permissions de l&apos;équipe
                </CardTitle>
                <CardDescription>Gérez les accès des membres de votre agence</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-4 rounded-xl border border-border hover:bg-accent/30 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-foreground">Agent</p>
                    <p className="text-xs text-muted-foreground">Gérer les biens, visites et candidatures</p>
                  </div>
                  <Button variant="outline" size="sm" className="text-brand-600 border-brand-200 hover:bg-brand-50">Configurer</Button>
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl border border-border hover:bg-accent/30 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-foreground">Lecture seule</p>
                    <p className="text-xs text-muted-foreground">Consultation uniquement</p>
                  </div>
                  <Button variant="outline" size="sm" className="text-brand-600 border-brand-200 hover:bg-brand-50">Configurer</Button>
                </div>
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
