'use client'

import { useCallback, useEffect, useState } from 'react'
import { Megaphone, Star, Eye, Plus, Settings, Sparkles } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { useRealtimeProperties } from '@/hooks/use-realtime-properties'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } }
const itemVariants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }

interface PropertyListing {
  id: string; title: string; viewsCount: number; featured: boolean
}

export function AgenceMarketing() {
  const { user, isAuthenticated } = useAuthStore()
  const [listings, setListings] = useState<PropertyListing[]>([])
  const [loading, setLoading] = useState(true)
  const [agencyName, setAgencyName] = useState(user?.companyName || '')
  const [agencyAddress, setAgencyAddress] = useState(user?.address || '')
  const [featureDialogOpen, setFeatureDialogOpen] = useState(false)
  const [selectedPropertyId, setSelectedPropertyId] = useState('')
  const [savingBranding, setSavingBranding] = useState(false)
  const [featuring, setFeaturing] = useState(false)

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) { setLoading(false); return }
    try {
      // Pour les agences, utiliser /api/dashboard/agence qui inclut properties via les mandats
      const data = await authFetch<{ properties: PropertyListing[] }>('/api/dashboard/agence')
      setListings(data.properties || [])
    } catch (err) {
      if (err instanceof AuthError && err.status === 401) return
      console.error('Failed to fetch listings:', err)
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => { fetchData() }, [fetchData])

  useRealtimeProperties({
    userId: user?.id,
    watchAll: true,
    onPropertyChange: useCallback(() => {
      fetchData()
    }, [fetchData]),
  })

  if (loading) return <div className="space-y-4">{[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}</div>

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
                <Star className="size-4 text-[#FF6C2F]" /> Annonces
              </CardTitle>
              <Button size="sm" className="bg-[#FF6C2F] hover:bg-[#e55e27] text-white gap-1" onClick={() => { setSelectedPropertyId(''); setFeatureDialogOpen(true) }}>
                <Plus className="size-3" /> Mettre en avant
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {listings.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Aucune annonce</p>
            ) : (
              listings.map((listing) => (
                <div key={listing.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/50">
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded bg-orange-50 flex items-center justify-center">
                      <Eye className="size-4 text-[#FF6C2F]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{listing.title}</p>
                      <p className="text-xs text-muted-foreground">{listing.viewsCount} vues</p>
                    </div>
                  </div>
                  <Badge className={listing.featured ? 'bg-[#FF6C2F] text-white' : 'bg-neutral-100 text-neutral-600'}>
                    {listing.featured ? 'Mis en avant' : 'Standard'}
                  </Badge>
                </div>
              ))
            )}
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
            <Button
              className="bg-[#FF6C2F] hover:bg-[#e55e27] text-white"
              disabled={savingBranding}
              onClick={async () => {
                if (!agencyName.trim()) {
                  toast.error('Le nom de l\'agence est requis')
                  return
                }
                setSavingBranding(true)
                try {
                  await authFetch('/api/user/profile', {
                    method: 'PATCH',
                    body: JSON.stringify({
                      companyName: agencyName,
                      address: agencyAddress,
                    }),
                  })
                  toast.success('Paramètres sauvegardés')
                } catch {
                  toast.error('Erreur lors de la sauvegarde')
                } finally {
                  setSavingBranding(false)
                }
              }}
            >
              {savingBranding ? 'Sauvegarde...' : 'Sauvegarder'}
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* View Stats per Listing */}
      <motion.div variants={itemVariants}>
        <Card className="border-border">
          <CardHeader className="pb-3"><CardTitle className="text-base font-semibold">Statistiques par annonce</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {listings.map((listing) => (
                <div key={listing.id} className="flex items-center gap-3">
                  <span className="text-sm font-medium min-w-0 sm:w-40 truncate">{listing.title}</span>
                  <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-[#FF6C2F] rounded-full" style={{ width: `${Math.min((listing.views / 300) * 100, 100)}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground w-12 text-right">{listing.views}</span>
                </div>
              ))}
              {listings.length === 0 && <p className="text-sm text-muted-foreground text-center">Aucune donnée</p>}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Feature Dialog */}
      <Dialog open={featureDialogOpen} onOpenChange={setFeatureDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Sparkles className="size-4 text-[#FF6C2F]" />
              Mettre une annonce en avant
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
              <SelectTrigger><SelectValue placeholder="Sélectionnez une annonce" /></SelectTrigger>
              <SelectContent>
                {listings.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.title} {l.featured ? '(déjà en avant)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              className="w-full bg-[#FF6C2F] hover:bg-[#e55e27] text-white"
              disabled={!selectedPropertyId || featuring}
              onClick={async () => {
                setFeaturing(true)
                try {
                  await authFetch(`/api/properties/${selectedPropertyId}`, {
                    method: 'PATCH',
                    body: JSON.stringify({ featured: true }),
                  })
                  toast.success('Annonce mise en avant avec succès')
                  setFeatureDialogOpen(false)
                  fetchData()
                } catch {
                  toast.error('Erreur lors de la mise en avant')
                } finally {
                  setFeaturing(false)
                }
              }}
            >
              <Sparkles className="size-3.5" />
              {featuring ? 'Mise en avant...' : 'Confirmer la mise en avant'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
