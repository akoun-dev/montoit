'use client'

import { useState } from 'react'
import { Megaphone, Star, Eye, Plus, Settings } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/lib/auth-store'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } }
const itemVariants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }

const featuredListings = [
  { id: '1', title: 'Appartement Cocody', views: 245, featured: true },
  { id: '2', title: 'Villa Marcory', views: 189, featured: true },
  { id: '3', title: 'Studio Plateau', views: 156, featured: false },
]

const promotions = [
  { id: '1', name: 'Lancement été', status: 'active', startDate: '01/06/2025', endDate: '30/06/2025' },
  { id: '2', name: 'Bienvenue nouveau locataire', status: 'scheduled', startDate: '01/07/2025', endDate: '31/07/2025' },
]

export function AgenceMarketing() {
  const { user } = useAuthStore()
  const [agencyName, setAgencyName] = useState(user?.companyName || '')
  const [agencyAddress, setAgencyAddress] = useState(user?.address || '')

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={itemVariants}>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
          <Megaphone className="size-5 sm:size-6 text-[#FF6C2F]" /> Marketing
        </h1>
        <p className="text-muted-foreground mt-1">Gérez vos mises en avant et promotions</p>
      </motion.div>

      {/* Featured Listings */}
      <motion.div variants={itemVariants}>
        <Card className="border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Star className="size-4 text-[#FF6C2F]" /> Annonces mises en avant
              </CardTitle>
              <Button size="sm" className="bg-[#FF6C2F] hover:bg-[#e55e27] text-white gap-1" onClick={() => toast.info('Fonctionnalité à venir')}>
                <Plus className="size-3" /> Ajouter
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {featuredListings.map((listing) => (
              <div key={listing.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/50">
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded bg-orange-50 flex items-center justify-center">
                    <Eye className="size-4 text-[#FF6C2F]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{listing.title}</p>
                    <p className="text-xs text-muted-foreground">{listing.views} vues</p>
                  </div>
                </div>
                <Badge className={listing.featured ? 'bg-[#FF6C2F] text-white' : 'bg-neutral-100 text-neutral-600'}>
                  {listing.featured ? 'Mis en avant' : 'Standard'}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.div>

      {/* Agency Branding */}
      <motion.div variants={itemVariants}>
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Settings className="size-4 text-[#FF6C2F]" /> Image de marque
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Nom de l&apos;agence</label>
              <Input value={agencyName} onChange={(e) => setAgencyName(e.target.value)} placeholder="Nom de l'agence" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Adresse</label>
              <Input value={agencyAddress} onChange={(e) => setAgencyAddress(e.target.value)} placeholder="Adresse de l'agence" />
            </div>
            <Button className="bg-[#FF6C2F] hover:bg-[#e55e27] text-white" onClick={() => toast.success('Paramètres sauvegardés')}>
              Sauvegarder
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Promotions */}
      <motion.div variants={itemVariants}>
        <Card className="border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Promotions</CardTitle>
              <Button size="sm" variant="outline" className="gap-1 border-[#FF6C2F] text-[#FF6C2F]" onClick={() => toast.info('Fonctionnalité à venir')}>
                <Plus className="size-3" /> Créer
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {promotions.map((promo) => (
              <div key={promo.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                <div>
                  <p className="text-sm font-medium">{promo.name}</p>
                  <p className="text-xs text-muted-foreground">{promo.startDate} → {promo.endDate}</p>
                </div>
                <Badge className={promo.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}>
                  {promo.status === 'active' ? 'Active' : 'Planifiée'}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.div>

      {/* View Stats per Listing */}
      <motion.div variants={itemVariants}>
        <Card className="border-border">
          <CardHeader className="pb-3"><CardTitle className="text-base font-semibold">Statistiques par annonce</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {featuredListings.map((listing) => (
                <div key={listing.id} className="flex items-center gap-3">
                  <span className="text-sm font-medium min-w-0 sm:w-40 truncate">{listing.title}</span>
                  <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-[#FF6C2F] rounded-full" style={{ width: `${Math.min((listing.views / 300) * 100, 100)}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground w-12 text-right">{listing.views}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
