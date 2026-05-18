'use client'

import { Settings, Save, Bell, Shield, Globe } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

export function AdminSettings() {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Paramètres</h1>
        <p className="text-muted-foreground mt-1">Configuration de la plateforme Mon Toit</p>
      </div>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="size-5 text-brand-500" />
            Sécurité & Authentification
          </CardTitle>
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
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="size-5 text-brand-500" />
            Notifications
          </CardTitle>
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
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Globe className="size-5 text-brand-500" />
            SLA & Délais
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Délai de validation TC (heures)</Label>
            <Input type="number" defaultValue="48" className="w-32" />
          </div>
          <div className="space-y-2">
            <Label>Délai de réponse propriétaire (heures)</Label>
            <Input type="number" defaultValue="24" className="w-32" />
          </div>
        </CardContent>
      </Card>

      <Button className="bg-brand-500 hover:bg-brand-600 text-white gap-2" onClick={() => toast.success('Paramètres sauvegardés')}>
        <Save className="size-4" />
        Sauvegarder les paramètres
      </Button>
    </motion.div>
  )
}
