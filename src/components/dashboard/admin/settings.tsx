'use client'

import { useState } from 'react'
import { Settings, Shield, Bell, Globe, Save } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'

const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } }
const itemVariants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }

export function AdminSettings() {
  const [activeTab, setActiveTab] = useState<'securite' | 'notifications' | 'sla'>('securite')

  const tabs = [
    { id: 'securite' as const, label: 'Sécurité', icon: Shield },
    { id: 'notifications' as const, label: 'Notifications', icon: Bell },
    { id: 'sla' as const, label: 'SLA & Délais', icon: Globe },
  ]

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={itemVariants}>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
          <Settings className="size-5 sm:size-6 text-brand-500" /> Paramètres
        </h1>
        <p className="text-muted-foreground mt-1">Configuration de la plateforme Mon Toit</p>
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
        {/* ── SÉCURITÉ TAB ──────────────────────────────────────────────── */}
        {activeTab === 'securite' && (
          <motion.div
            key="securite"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Shield className="size-4 text-brand-500" />
                  Authentification
                </CardTitle>
                <CardDescription>Paramètres de sécurité liés aux connexions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 rounded-lg border border-border">
                  <div>
                    <p className="text-sm font-medium text-foreground">OTP obligatoire</p>
                    <p className="text-xs text-muted-foreground">Exiger un code OTP pour chaque connexion</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 rounded-lg border border-border">
                  <div>
                    <p className="text-sm font-medium text-foreground">Expiration OTP (minutes)</p>
                    <p className="text-xs text-muted-foreground">Durée de validité du code OTP</p>
                  </div>
                  <Input type="number" defaultValue="5" className="w-20 h-9" />
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 rounded-lg border border-border">
                  <div>
                    <p className="text-sm font-medium text-foreground">Session persistante</p>
                    <p className="text-xs text-muted-foreground">Maintenir la session active après fermeture du navigateur</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button className="bg-brand-500 hover:bg-brand-600 text-white gap-2" onClick={() => toast.success('Paramètres de sécurité sauvegardés')}>
                <Save className="size-4" /> Sauvegarder
              </Button>
            </div>
          </motion.div>
        )}

        {/* ── NOTIFICATIONS TAB ─────────────────────────────────────────── */}
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
                  <Bell className="size-4 text-brand-500" />
                  Canaux de notification
                </CardTitle>
                <CardDescription>Configurer les canaux de notification système</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 rounded-lg border border-border">
                  <div>
                    <p className="text-sm font-medium text-foreground">Notifications email</p>
                    <p className="text-xs text-muted-foreground">Envoyer des alertes par email</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 rounded-lg border border-border">
                  <div>
                    <p className="text-sm font-medium text-foreground">Notifications SMS</p>
                    <p className="text-xs text-muted-foreground">Envoyer des alertes par SMS</p>
                  </div>
                  <Switch />
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 rounded-lg border border-border">
                  <div>
                    <p className="text-sm font-medium text-foreground">Notifications push</p>
                    <p className="text-xs text-muted-foreground">Envoyer des notifications dans l'application</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button className="bg-brand-500 hover:bg-brand-600 text-white gap-2" onClick={() => toast.success('Paramètres de notification sauvegardés')}>
                <Save className="size-4" /> Sauvegarder
              </Button>
            </div>
          </motion.div>
        )}

        {/* ── SLA & DÉLAIS TAB ──────────────────────────────────────────── */}
        {activeTab === 'sla' && (
          <motion.div
            key="sla"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Globe className="size-4 text-brand-500" />
                  Délais de traitement
                </CardTitle>
                <CardDescription>Configurer les délais SLA pour les traitements</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-foreground">Délai de validation TC (heures)</Label>
                  <Input type="number" defaultValue="48" className="w-32 h-9 text-sm" />
                  <p className="text-[10px] text-muted-foreground">Temps maximum pour qu'un TC valide un dossier</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-foreground">Délai de réponse propriétaire (heures)</Label>
                  <Input type="number" defaultValue="24" className="w-32 h-9 text-sm" />
                  <p className="text-[10px] text-muted-foreground">Temps maximum pour qu'un propriétaire réponde</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-foreground">Délai de traitement des signalements (heures)</Label>
                  <Input type="number" defaultValue="72" className="w-32 h-9 text-sm" />
                  <p className="text-[10px] text-muted-foreground">Temps maximum pour traiter un signalement</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Globe className="size-4 text-brand-500" />
                  Règles de validation
                </CardTitle>
                <CardDescription>Configuration des seuils de validation automatique</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 rounded-lg border border-border">
                  <div>
                    <p className="text-sm font-medium text-foreground">Validation automatique des dossiers</p>
                    <p className="text-xs text-muted-foreground">Approuver automatiquement les dossiers avec Trust Score ≥ 70</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-foreground">Seuil Trust Score pour auto-validation</Label>
                  <Input type="number" defaultValue="70" className="w-20 h-9 text-sm" />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button className="bg-brand-500 hover:bg-brand-600 text-white gap-2" onClick={() => toast.success('Paramètres SLA sauvegardés')}>
                <Save className="size-4" /> Sauvegarder
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
