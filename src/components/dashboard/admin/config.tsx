'use client'

import { Settings, Save, Bell, Mail, Shield, Globe, FileText, ToggleLeft } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { useState } from 'react'

export function AdminConfig() {
  const [smtpHost, setSmtpHost] = useState('smtp.montoit.ci')
  const [smtpPort, setSmtpPort] = useState('587')
  const [smtpUser, setSmtpUser] = useState('noreply@montoit.ci')
  const [features, setFeatures] = useState({
    virtualTours: true,
    kycVerification: true,
    autoValidation: false,
    maintenanceRequests: true,
    fraudDetection: true,
    messaging: true,
  })

  const toggleFeature = (key: keyof typeof features) => {
    setFeatures(prev => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configuration</h1>
        <p className="text-muted-foreground mt-1">Paramètres de la plateforme Mon Toit</p>
      </div>

      <Tabs defaultValue="platform" className="w-full">
        <TabsList className="grid w-full grid-cols-5 bg-muted">
          <TabsTrigger value="platform">Plateforme</TabsTrigger>
          <TabsTrigger value="features">Fonctionnalités</TabsTrigger>
          <TabsTrigger value="smtp">SMTP</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="rgpd">RGPD</TabsTrigger>
        </TabsList>

        <TabsContent value="platform" className="mt-4 space-y-4">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Globe className="size-5 text-[#FF6C2F]" />
                Paramètres généraux
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nom de la plateforme</Label>
                <Input defaultValue="Mon Toit" className="max-w-sm" />
              </div>
              <div className="space-y-2">
                <Label>URL de la plateforme</Label>
                <Input defaultValue="https://montoit.ci" className="max-w-sm" />
              </div>
              <div className="space-y-2">
                <Label>Devise</Label>
                <Input defaultValue="FCFA" className="w-32" />
              </div>
              <div className="space-y-2">
                <Label>Fuseau horaire</Label>
                <Input defaultValue="Africa/Abidjan" className="max-w-sm" />
              </div>
              <Separator />
              <Button className="bg-[#FF6C2F] hover:bg-[#e55f28] text-white gap-2" onClick={() => toast.success('Paramètres sauvegardés')}>
                <Save className="size-4" /> Sauvegarder
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features" className="mt-4 space-y-4">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ToggleLeft className="size-5 text-[#FF6C2F]" />
                Feature flags
              </CardTitle>
              <CardDescription>Activer ou désactiver des fonctionnalités</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: 'virtualTours' as const, label: 'Visites virtuelles', desc: 'Permettre les visites 3D des biens' },
                { key: 'kycVerification' as const, label: 'Vérification KYC', desc: 'Activer la vérification biométrique NeoFace' },
                { key: 'autoValidation' as const, label: 'Validation automatique', desc: 'Approuver automatiquement les dossiers complets' },
                { key: 'maintenanceRequests' as const, label: 'Demandes d\'entretien', desc: 'Permettre aux locataires de soumettre des demandes' },
                { key: 'fraudDetection' as const, label: 'Détection de fraude', desc: 'Système automatique de détection' },
                { key: 'messaging' as const, label: 'Messagerie', desc: 'Système de messagerie entre utilisateurs' },
              ].map((feature) => (
                <div key={feature.key} className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div>
                    <p className="text-sm font-medium text-foreground">{feature.label}</p>
                    <p className="text-xs text-muted-foreground">{feature.desc}</p>
                  </div>
                  <Switch checked={features[feature.key]} onCheckedChange={() => toggleFeature(feature.key)} />
                </div>
              ))}
              <Separator />
              <Button className="bg-[#FF6C2F] hover:bg-[#e55f28] text-white gap-2" onClick={() => toast.success('Feature flags mis à jour')}>
                <Save className="size-4" /> Sauvegarder
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="smtp" className="mt-4 space-y-4">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Mail className="size-5 text-[#FF6C2F]" />
                Configuration SMTP
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Hôte SMTP</Label>
                  <Input value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Port</Label>
                  <Input value={smtpPort} onChange={(e) => setSmtpPort(e.target.value)} className="w-32" />
                </div>
                <div className="space-y-2">
                  <Label>Utilisateur</Label>
                  <Input value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Mot de passe</Label>
                  <Input type="password" placeholder="••••••••" />
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                <div>
                  <p className="text-sm font-medium text-foreground">Chiffrement TLS</p>
                  <p className="text-xs text-muted-foreground">Utiliser TLS pour les emails</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => toast.info('Email de test envoyé')}>Envoyer un test</Button>
                <Button className="bg-[#FF6C2F] hover:bg-[#e55f28] text-white gap-2" onClick={() => toast.success('SMTP configuré')}>
                  <Save className="size-4" /> Sauvegarder
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-4 space-y-4">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Bell className="size-5 text-[#FF6C2F]" />
                Paramètres de notification push
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: 'Nouveaux utilisateurs', desc: 'Notification à chaque inscription' },
                { label: 'Signalements critiques', desc: 'Alertes pour les signalements urgents' },
                { label: 'Paiements en retard', desc: 'Notification des loyers impayés' },
                { label: 'Erreurs système', desc: 'Alertes en cas d\'erreur technique' },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              ))}
              <Separator />
              <Button className="bg-[#FF6C2F] hover:bg-[#e55f28] text-white gap-2" onClick={() => toast.success('Notifications mises à jour')}>
                <Save className="size-4" /> Sauvegarder
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rgpd" className="mt-4 space-y-4">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="size-5 text-[#FF6C2F]" />
                Conformité RGPD
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: 'Consentement cookies', desc: 'Bannière de consentement obligatoire' },
                { label: 'Droit à l\'oubli', desc: 'Permettre la suppression complète des données' },
                { label: 'Export de données', desc: 'Permettre l\'export des données personnelles' },
                { label: 'Rétention des données', desc: 'Suppression automatique après 36 mois' },
                { label: 'Journal des accès', desc: 'Enregistrer tous les accès aux données personnelles' },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              ))}
              <Separator />
              <div className="space-y-2">
                <Label>Politique de confidentialité (URL)</Label>
                <Input defaultValue="https://montoit.ci/privacy" className="max-w-sm" />
              </div>
              <div className="space-y-2">
                <Label>Conditions d&apos;utilisation (URL)</Label>
                <Input defaultValue="https://montoit.ci/terms" className="max-w-sm" />
              </div>
              <Separator />
              <Button className="bg-[#FF6C2F] hover:bg-[#e55f28] text-white gap-2" onClick={() => toast.success('RGPD mis à jour')}>
                <Save className="size-4" /> Sauvegarder
              </Button>
            </CardContent>
          </Card>

          {/* Email Templates */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="size-5 text-[#FF6C2F]" />
                Modèles d&apos;emails
              </CardTitle>
              <CardDescription>Gérer les templates d&apos;emails système</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[
                  'Bienvenue (inscription)',
                  'Vérification email',
                  'Réinitialisation mot de passe',
                  'Nouveau signalement',
                  'Rappel de paiement',
                ].map((template) => (
                  <div key={template} className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <span className="text-sm text-foreground">{template}</span>
                    <Button variant="outline" size="sm" onClick={() => toast.info('Éditeur de template à venir')}>Éditer</Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  )
}
