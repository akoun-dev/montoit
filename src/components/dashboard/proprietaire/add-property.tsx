'use client'

import { useState } from 'react'
import { PlusCircle, Upload, ImagePlus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { motion } from 'framer-motion'

export function AddProperty() {
  const [form, setForm] = useState({
    title: '', description: '', type: 'APPARTEMENT', price: '', area: '',
    bedrooms: '', bathrooms: '', address: '', city: '', commune: '',
    isFurnished: false, hasParking: false, hasGarden: false, hasPool: false,
  })

  const update = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = () => {
    toast.success('Bien ajouté avec succès ! Il sera visible après validation.')
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Ajouter un bien</h1>
        <p className="text-muted-foreground mt-1">Publiez une nouvelle annonce immobilière</p>
      </div>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg">Informations du bien</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Titre de l&apos;annonce *</Label>
            <Input placeholder="Appartement F3 Cocody..." value={form.title} onChange={(e) => update('title', e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Description *</Label>
            <Textarea placeholder="Décrivez votre bien..." rows={4} value={form.description} onChange={(e) => update('description', e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type de bien</Label>
              <Select value={form.type} onValueChange={(v) => update('type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
            <div className="space-y-2">
              <Label>Loyer mensuel (FCFA) *</Label>
              <Input type="number" placeholder="250000" value={form.price} onChange={(e) => update('price', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Surface (m²) *</Label>
              <Input type="number" placeholder="85" value={form.area} onChange={(e) => update('area', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Chambres</Label>
              <Input type="number" placeholder="2" value={form.bedrooms} onChange={(e) => update('bedrooms', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Salles de bain</Label>
              <Input type="number" placeholder="1" value={form.bathrooms} onChange={(e) => update('bathrooms', e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Adresse *</Label>
            <Input placeholder="Riviera 3, Cocody" value={form.address} onChange={(e) => update('address', e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Ville *</Label>
              <Input placeholder="Abidjan" value={form.city} onChange={(e) => update('city', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Commune</Label>
              <Input placeholder="Cocody" value={form.commune} onChange={(e) => update('commune', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { key: 'isFurnished', label: 'Meublé' },
              { key: 'hasParking', label: 'Parking' },
              { key: 'hasGarden', label: 'Jardin' },
              { key: 'hasPool', label: 'Piscine' },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between p-3 rounded-lg border border-border">
                <Label className="cursor-pointer">{item.label}</Label>
                <Switch
                  checked={form[item.key as keyof typeof form] as boolean}
                  onCheckedChange={(v) => update(item.key, v)}
                />
              </div>
            ))}
          </div>

          {/* Image upload placeholder */}
          <div className="space-y-2">
            <Label>Photos du bien</Label>
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-brand-300 transition-colors cursor-pointer">
              <ImagePlus className="size-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Cliquez ou glissez vos photos ici</p>
              <p className="text-xs text-muted-foreground mt-1">JPG, PNG — Max 5 MB par image</p>
            </div>
          </div>

          <Button onClick={handleSubmit} className="w-full h-12 bg-brand-500 hover:bg-brand-600 text-white font-semibold gap-2">
            <PlusCircle className="size-5" />
            Publier l&apos;annonce
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  )
}
