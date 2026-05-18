'use client'

import { useState } from 'react'
import { Settings, Building2, CreditCard, FileText, Bell, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useAuthStore } from '@/lib/auth-store'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } }
const itemVariants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }

export function AgenceSettings() {
  const { user } = useAuthStore()
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

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Settings className="size-6 text-[#FF6C2F]" /> Paramètres
        </h1>
        <p className="text-muted-foreground mt-1">Configurez votre espace agence</p>
      </motion.div>

      {/* Agency Profile */}
      <motion.div variants={itemVariants}>
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Building2 className="size-4 text-[#FF6C2F]" /> Profil de l&apos;agence
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Nom de l&apos;agence</label>
                <Input value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Email</label>
                <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Téléphone</label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Ville</label>
                <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Adresse</label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Default Commission */}
      <motion.div variants={itemVariants}>
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <CreditCard className="size-4 text-[#FF6C2F]" /> Commissions par défaut
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Taux de commission</label>
                <Input type="number" step="0.5" value={form.defaultCommissionRate}
                  onChange={(e) => setForm({ ...form, defaultCommissionRate: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Type</label>
                <Select value={form.defaultCommissionType} onValueChange={(v) => setForm({ ...form, defaultCommissionType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERCENTAGE">Pourcentage</SelectItem>
                    <SelectItem value="FIXED">Montant fixe</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Document Templates */}
      <motion.div variants={itemVariants}>
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <FileText className="size-4 text-[#FF6C2F]" /> Modèles de documents
            </CardTitle>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer">
              <FileText className="size-5 text-[#FF6C2F] mb-1" />
              <p className="text-sm font-medium">Bail type</p>
              <p className="text-[10px] text-muted-foreground">Dernière mise à jour : 01/05/2025</p>
            </div>
            <div className="p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer">
              <FileText className="size-5 text-[#FF6C2F] mb-1" />
              <p className="text-sm font-medium">Mandat</p>
              <p className="text-[10px] text-muted-foreground">Dernière mise à jour : 15/04/2025</p>
            </div>
            <div className="p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer">
              <FileText className="size-5 text-[#FF6C2F] mb-1" />
              <p className="text-sm font-medium">État des lieux</p>
              <p className="text-[10px] text-muted-foreground">Dernière mise à jour : 20/03/2025</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Team Permissions */}
      <motion.div variants={itemVariants}>
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Users className="size-4 text-[#FF6C2F]" /> Permissions de l&apos;équipe
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg border border-border">
              <div>
                <p className="text-sm font-medium">Agent</p>
                <p className="text-xs text-muted-foreground">Gérer les biens, visites et candidatures</p>
              </div>
              <Button variant="outline" size="sm" className="text-[#FF6C2F]">Configurer</Button>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border border-border">
              <div>
                <p className="text-sm font-medium">Lecture seule</p>
                <p className="text-xs text-muted-foreground">Consultation uniquement</p>
              </div>
              <Button variant="outline" size="sm" className="text-[#FF6C2F]">Configurer</Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Auto Notifications */}
      <motion.div variants={itemVariants}>
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Bell className="size-4 text-[#FF6C2F]" /> Notifications automatiques
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(notifications).map(([key, enabled]) => (
              <div key={key} className="flex items-center justify-between p-3 rounded-lg border border-border">
                <span className="text-sm">{key === 'messages' ? 'Nouveaux messages' : key === 'dossierUpdates' ? 'Mises à jour de dossier' : key === 'visitReminders' ? 'Rappels de visite' : key === 'paymentAlerts' ? 'Alertes de paiement' : 'Promotions'}</span>
                <button onClick={() => setNotifications({ ...notifications, [key]: !enabled })}
                  className={`relative w-10 h-5 rounded-full transition-colors ${enabled ? 'bg-[#FF6C2F]' : 'bg-neutral-300'}`}>
                  <div className={`absolute top-0.5 size-4 rounded-full bg-white transition-transform ${enabled ? 'left-5' : 'left-0.5'}`} />
                </button>
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Button className="bg-[#FF6C2F] hover:bg-[#e55e27] text-white w-full sm:w-auto" onClick={handleSave}>
          Sauvegarder les paramètres
        </Button>
      </motion.div>
    </motion.div>
  )
}
