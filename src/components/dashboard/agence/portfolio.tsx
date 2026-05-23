'use client'

import { useEffect, useState, useCallback } from 'react'
import { Building2, Grid3X3, List, Eye, Filter } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { useRealtimeProperties } from '@/hooks/use-realtime-properties'
import { motion } from 'framer-motion'

interface Property {
  id: string; title: string; type: string; price: number; city: string; commune: string | null
  status: string; rentalStatus: string; bedrooms: number | null; area: number
  images: Array<{ url: string }>; hasMandat: boolean; viewsCount: number
}

interface AgenceData {
  properties: Property[]
}

const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } }
const itemVariants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }

const statusLabels: Record<string, { label: string; cls: string }> = {
  DRAFT: { label: 'Brouillon', cls: 'bg-neutral-100 text-neutral-600' },
  PENDING_VERIFICATION: { label: 'En vérification', cls: 'bg-amber-100 text-amber-700' },
  ACTIVE: { label: 'Actif', cls: 'bg-green-100 text-green-700' },
  RENTED: { label: 'Loué', cls: 'bg-orange-100 text-orange-700' },
  SUSPENDED: { label: 'Suspendu', cls: 'bg-red-100 text-red-700' },
  CLOSED: { label: 'Fermé', cls: 'bg-neutral-100 text-neutral-500' },
}

export function Portfolio() {
  const { isAuthenticated, user } = useAuthStore()
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [communeFilter, setCommuneFilter] = useState<string>('all')

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) { setLoading(false); return }
    try {
      const d = await authFetch<AgenceData>('/api/dashboard/agence')
      setProperties(d.properties ?? [])
    } catch (err) {
      if (err instanceof AuthError && err.status === 401) return
      console.error('Failed to fetch portfolio:', err)
    } finally { setLoading(false) }
  }, [isAuthenticated])

  useEffect(() => { fetchData() }, [fetchData])

  // Realtime subscription
  useRealtimeProperties({
    userId: user?.id,
    onPropertyChange: () => { fetchData() },
  })

  const communes = [...new Set(properties.map((p) => p.commune).filter(Boolean))]
  const filtered = properties.filter((p) => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false
    if (communeFilter !== 'all' && p.commune !== communeFilter) return false
    return true
  })
  const mostViewed = [...properties].sort((a, b) => b.viewsCount - a.viewsCount).slice(0, 3)
  const mostViewedIds = new Set(mostViewed.map((p) => p.id))

  if (loading) return <div className="space-y-4">{[1, 2, 3].map((i) => <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />)}</div>

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={itemVariants}>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
          <Building2 className="size-5 sm:size-6 text-[#FF6C2F]" /> Portfolio
        </h1>
        <p className="text-muted-foreground mt-1">{properties.length} bien{properties.length > 1 ? 's' : ''} géré{properties.length > 1 ? 's' : ''}</p>
      </motion.div>

      {/* Filters & View Toggle */}
      <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="size-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Statut" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="ACTIVE">Actif</SelectItem>
              <SelectItem value="RENTED">Loué</SelectItem>
              <SelectItem value="DRAFT">Brouillon</SelectItem>
              <SelectItem value="PENDING_VERIFICATION">En vérification</SelectItem>
            </SelectContent>
          </Select>
          <Select value={communeFilter} onValueChange={setCommuneFilter}>
            <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Commune" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les communes</SelectItem>
              {communes.map((c) => <SelectItem key={c} value={c!}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto flex items-center gap-1 border rounded-lg p-0.5">
          <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="sm" className={viewMode === 'grid' ? 'bg-[#FF6C2F] text-white' : ''} onClick={() => setViewMode('grid')}>
            <Grid3X3 className="size-4" />
          </Button>
          <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="sm" className={viewMode === 'list' ? 'bg-[#FF6C2F] text-white' : ''} onClick={() => setViewMode('list')}>
            <List className="size-4" />
          </Button>
        </div>
      </motion.div>

      {/* Most Viewed */}
      {mostViewed.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card className="border-[#FF6C2F]/20 bg-orange-50/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Eye className="size-4 text-[#FF6C2F]" /> Biens les plus consultés
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              {mostViewed.map((p) => (
                <div key={p.id} className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-orange-200">
                  {p.images?.[0] ? <img src={p.images[0].url} alt="" className="size-8 rounded object-cover" /> : <Building2 className="size-4 text-[#FF6C2F]" />}
                  <span className="text-sm font-medium">{p.title || 'Sans titre'}</span>
                  <Badge className="bg-orange-100 text-orange-700 text-[10px]">{p.viewsCount} vues</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Properties */}
      {filtered.length === 0 ? (
        <Card className="border-border"><CardContent className="p-8 text-center text-muted-foreground">Aucun bien trouvé avec ces filtres</CardContent></Card>
      ) : viewMode === 'grid' ? (
        <motion.div variants={containerVariants} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <motion.div key={p.id} variants={itemVariants}>
              <Card className={`border-border overflow-hidden hover:shadow-md transition-shadow ${mostViewedIds.has(p.id) ? 'ring-1 ring-[#FF6C2F]/30' : ''}`}>
                <div className="relative h-40 sm:h-48 bg-muted">
                  {p.images?.[0] ? <img src={p.images[0].url} alt="" className="size-full object-cover" /> : (
                    <div className="size-full flex items-center justify-center"><Building2 className="size-8 text-muted-foreground" /></div>
                  )}
                  {mostViewedIds.has(p.id) && (
                    <Badge className="absolute top-2 left-2 bg-[#FF6C2F] text-white text-[10px] gap-1">
                      <Eye className="size-3" /> {p.viewsCount}
                    </Badge>
                  )}
                  <Badge className={`absolute top-2 right-2 ${statusLabels[p.status]?.cls || 'bg-neutral-100 text-neutral-600'}`}>
                    {statusLabels[p.status]?.label || p.status}
                  </Badge>
                </div>
                <CardContent className="p-3">
                  <p className="text-sm font-semibold text-foreground truncate">{p.title || 'Sans titre'}</p>
                  <p className="text-xs text-muted-foreground">{p.city}{p.commune ? ` · ${p.commune}` : ''}</p>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-sm font-bold text-[#FF6C2F]">{p.price.toLocaleString('fr-FR')} FCFA</p>
                    {p.bedrooms && <span className="text-xs text-muted-foreground">{p.bedrooms} ch · {p.area} m²</span>}
                  </div>
                  {p.hasMandat && <Badge className="mt-2 bg-emerald-50 text-emerald-700 text-[10px]">Mandat actif</Badge>}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <motion.div variants={itemVariants}>
          <Card className="border-border">
            <CardContent className="p-0">
              <div className="divide-y">
                {filtered.map((p) => (
                  <div key={p.id} className={`flex items-center gap-3 p-3 hover:bg-accent/50 transition-colors ${mostViewedIds.has(p.id) ? 'bg-orange-50/50' : ''}`}>
                    <div className="size-12 rounded-lg bg-muted overflow-hidden shrink-0">
                      {p.images?.[0] ? <img src={p.images[0].url} alt="" className="size-full object-cover" /> : <Building2 className="size-5 text-muted-foreground m-3" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{p.title || 'Sans titre'}</p>
                      <p className="text-xs text-muted-foreground">{p.city}{p.commune ? ` · ${p.commune}` : ''} · {p.area} m²</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-[#FF6C2F]">{p.price.toLocaleString('fr-FR')} FCFA</p>
                      <Badge className={`${statusLabels[p.status]?.cls || 'bg-neutral-100'} text-[10px]`}>
                        {statusLabels[p.status]?.label || p.status}
                      </Badge>
                    </div>
                    {mostViewedIds.has(p.id) && (
                      <Badge className="bg-orange-100 text-orange-700 text-[10px] gap-1 shrink-0"><Eye className="size-3" />{p.viewsCount}</Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  )
}
