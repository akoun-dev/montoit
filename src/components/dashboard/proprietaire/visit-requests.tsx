'use client'

import { useCallback, useEffect, useState } from 'react'
import { Eye, Check, X, Clock, MapPin, Calendar, User, Phone } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

export function VisitRequests() {
  const { isAuthenticated } = useAuthStore()
  const [data, setData] = useState<Array<{
    id: string; status: string; requestedDate: string; timeSlot: string
    counterDate: string | null; counterTimeSlot: string | null; ownerComment: string | null
    tenant: { firstName: string; lastName: string; phone: string }
    property: { title: string; city: string }
  }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false)
      return
    }

    try {
      const d = await authFetch<{ visitRequests?: Array<{
        id: string; status: string; requestedDate: string; timeSlot: string
        counterDate: string | null; counterTimeSlot: string | null; ownerComment: string | null
        tenant: { firstName: string; lastName: string; phone: string }
        property: { title: string; city: string }
      }> }>('/api/dashboard/proprietaire')
      setData(d.visitRequests || [])
    } catch (err) {
      if (err instanceof AuthError && err.status === 401) {
        // authFetch already handled logout — just show default data
        setData([])
        return
      }
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
      setData([])
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) return <div className="space-y-4">{[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />)}</div>

  if (error) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Demandes de visite</h1>
          <p className="text-muted-foreground mt-1">Gérez les demandes de visite de vos biens</p>
        </div>
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <p className="text-sm text-amber-700">Impossible de charger les demandes de visite. Veuillez réessayer.</p>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  const handleAccept = async (id: string) => {
    try {
      await authFetch(`/api/visits/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ACCEPTED' }),
      })
      toast.success('Visite acceptée !')
      fetchData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de l\'acceptation')
    }
  }

  const handleReject = async (id: string) => {
    try {
      await authFetch(`/api/visits/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'REJECTED' }),
      })
      toast.success('Visite refusée')
      fetchData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors du refus')
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Demandes de visite</h1>
        <p className="text-muted-foreground mt-1">Gérez les demandes de visite de vos biens</p>
      </div>

      {data.length === 0 ? (
        <Card className="border-border">
          <CardContent className="py-12 text-center">
            <Eye className="size-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground">Aucune demande de visite</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {data.map((vr) => (
            <Card key={vr.id} className="border-border">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-foreground">{vr.property.title}</h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="size-3.5" /> {vr.property.city}
                    </p>
                  </div>
                  <Badge className={
                    vr.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                    vr.status === 'ACCEPTED' ? 'bg-green-100 text-green-700' :
                    vr.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                    'bg-neutral-100 text-neutral-600'
                  }>
                    {vr.status === 'PENDING' ? 'En attente' : vr.status === 'ACCEPTED' ? 'Accepté' : vr.status === 'REJECTED' ? 'Rejeté' : vr.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4 p-3 rounded-lg bg-muted">
                  <div className="flex items-center gap-2 text-sm text-foreground">
                    <User className="size-4 text-muted-foreground" />
                    {vr.tenant.firstName} {vr.tenant.lastName}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-foreground">
                    <Phone className="size-4 text-muted-foreground" />
                    {vr.tenant.phone}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-foreground">
                    <Calendar className="size-4 text-muted-foreground" />
                    {new Date(vr.requestedDate).toLocaleDateString('fr-FR')}
                  </div>
                </div>

                {vr.status === 'PENDING' && (
                  <div className="flex gap-2">
                    <Button onClick={() => handleAccept(vr.id)} size="sm" className="bg-green-600 hover:bg-green-700 text-white gap-1">
                      <Check className="size-4" /> Accepter
                    </Button>
                    <Button onClick={() => handleReject(vr.id)} variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50 gap-1">
                      <X className="size-4" /> Refuser
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </motion.div>
  )
}
