'use client'

import { useState } from 'react'
import { FileText, Upload, CheckCircle2, AlertCircle, ChevronRight, ChevronLeft } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/lib/auth-store'
import { toast } from 'sonner'
import { motion } from 'framer-motion'

const steps = [
  { id: 1, title: 'Informations personnelles' },
  { id: 2, title: 'Revenus & Emploi' },
  { id: 3, title: 'Garant' },
  { id: 4, title: 'Documents' },
]

export function RentalFileForm() {
  const { user } = useAuthStore()
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    monthlyIncome: '',
    employer: '',
    employmentType: 'CDI',
    guarantorName: '',
    guarantorPhone: '',
    guarantorRelation: '',
    documents: [] as string[],
  })

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = () => {
    toast.success('Dossier locatif soumis avec succès ! Il sera examiné par un Tiers de Confiance.')
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Dossier locatif</h1>
        <p className="text-neutral-500 mt-1">Complétez votre dossier pour postuler aux logements</p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2">
            <div className={`flex items-center justify-center size-8 rounded-full text-sm font-medium ${
              step >= s.id ? 'bg-brand-500 text-white' : 'bg-neutral-100 text-neutral-400'
            }`}>
              {step > s.id ? <CheckCircle2 className="size-5" /> : s.id}
            </div>
            <span className={`text-sm hidden sm:inline ${
              step >= s.id ? 'text-neutral-900 font-medium' : 'text-neutral-400'
            }`}>
              {s.title}
            </span>
            {i < steps.length - 1 && (
              <div className={`hidden sm:block w-8 h-0.5 ${step > s.id ? 'bg-brand-500' : 'bg-neutral-200'}`} />
            )}
          </div>
        ))}
      </div>

      <Card className="border-neutral-200">
        <CardHeader>
          <CardTitle className="text-lg">{steps[step - 1].title}</CardTitle>
          <CardDescription>Étape {step} sur {steps.length}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Step 1: Personal Info */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Prénom</Label>
                  <Input value={user?.firstName || ''} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Nom</Label>
                  <Input value={user?.lastName || ''} disabled />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Téléphone</Label>
                <Input value={user?.phone || ''} disabled />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={user?.email || ''} disabled />
              </div>
            </div>
          )}

          {/* Step 2: Income */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Revenus mensuels (FCFA)</Label>
                <Input
                  type="number"
                  placeholder="500000"
                  value={formData.monthlyIncome}
                  onChange={(e) => updateField('monthlyIncome', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Employeur</Label>
                <Input
                  placeholder="Nom de l'entreprise"
                  value={formData.employer}
                  onChange={(e) => updateField('employer', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Type d&apos;emploi</Label>
                <Select value={formData.employmentType} onValueChange={(v) => updateField('employmentType', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CDI">CDI</SelectItem>
                    <SelectItem value="CDD">CDD</SelectItem>
                    <SelectItem value="FREELANCE">Free-lance</SelectItem>
                    <SelectItem value="RETIRED">Retraité</SelectItem>
                    <SelectItem value="OTHER">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Step 3: Guarantor */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nom du garant</Label>
                <Input
                  placeholder="Nom complet du garant"
                  value={formData.guarantorName}
                  onChange={(e) => updateField('guarantorName', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Téléphone du garant</Label>
                <Input
                  placeholder="+225 XX XX XX XX"
                  value={formData.guarantorPhone}
                  onChange={(e) => updateField('guarantorPhone', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Relation avec le garant</Label>
                <Select value={formData.guarantorRelation} onValueChange={(v) => updateField('guarantorRelation', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="parent">Parent</SelectItem>
                    <SelectItem value="frere_soeur">Frère/Sœur</SelectItem>
                    <SelectItem value="ami">Ami</SelectItem>
                    <SelectItem value="autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Step 4: Documents */}
          {step === 4 && (
            <div className="space-y-4">
              <p className="text-sm text-neutral-500">
                Téléchargez les documents nécessaires pour votre dossier locatif.
              </p>
              {['Carte d\'identité / Passeport', 'Fiche de paie (3 derniers mois)', 'Contrat de travail', 'Relevé bancaire', 'Pièce d\'identité du garant', 'Justificatif de domicile'].map((doc, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-neutral-200">
                  <div className="flex items-center gap-3">
                    <FileText className="size-4 text-neutral-400" />
                    <span className="text-sm text-neutral-700">{doc}</span>
                  </div>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Upload className="size-3.5" />
                    Télécharger
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-4 border-t border-neutral-100">
            <Button
              variant="outline"
              onClick={() => setStep(Math.max(1, step - 1))}
              disabled={step === 1}
              className="gap-1"
            >
              <ChevronLeft className="size-4" />
              Précédent
            </Button>
            {step < steps.length ? (
              <Button
                onClick={() => setStep(step + 1)}
                className="bg-brand-500 hover:bg-brand-600 text-white gap-1"
              >
                Suivant
                <ChevronRight className="size-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                className="bg-brand-500 hover:bg-brand-600 text-white gap-1"
              >
                <CheckCircle2 className="size-4" />
                Soumettre le dossier
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
