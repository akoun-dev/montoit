'use client'

import { useCallback, useEffect, useState } from 'react'
import { Eye, Calendar, Clock, MapPin } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { motion } from 'framer-motion'

interface VisitData {
  visitRequests: Array<{
    id: string
    status: string
    requestedDate: string
    timeSlot: string
    counterDate: string | null
    counterTimeSlot: string | null
    ownerComment: string | null
    property: { title: string; city: string; images: Array<{ url: string }> }
  }>
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    PENDING: { label: 'En attente', className: 'bg-amber-100 text-amber-700' },
    ACCEPTED: { label: 'Accepté', className: 'bg-green-100 text-green-700' },
    REJECTED: { label: 'Rejeté', className: 'bg-red-100 text-red-700' },
    COUNTER_PROPOSED: { label: 'Contre-proposition', className: 'bg-blue-100 text-blue-700' },
    COMPLETED: { label: 'Complété', className: 'bg-neutral-100 text-neutral-700' },
    CANCELLED: { label: 'Annulé', className: 'bg-neutral-100 text-neutral-500' },
  }
  const c = config[status] || { label: status, className: 'bg-neutral-100 text-neutral-700' }
  return <Badge className={c.className}>{c.label}</Badge>
}

export function MyVisits() {
  const { isAuthenticated } = useAuthStore()
  const [data, setData] = useState<VisitData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false)
      return
    }

    try {
      const d = await authFetch<VisitData>('/api/dashboard/locataire')
      setData(d)
    } catch (err) {
      if (err instanceof AuthError && err.status === 401) {
        // authFetch already handled logout — just show default data
        setData(null)
        return
      }
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) {
    return <div className="space-y-4">{[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-xl bg-neutral-100 animate-pulse" />)}</div>
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Mes visites</h1>
        <p className="text-neutral-500 mt-1">Suivez vos demandes de visite</p>
      </div>

      {!data?.visitRequests.length ? (
        <Card className="border-neutral-200">
          <CardContent className="py-12 text-center">
            <Eye className="size-12 text-neutral-300 mx-auto mb-4" />
            <p className="text-neutral-500">Aucune visite planifiée</p>
            <p className="text-sm text-neutral-400 mt-1">Explorez les biens disponibles pour demander une visite</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.visitRequests.map((vr) => (
            <Card key={vr.id} className="border-neutral-200 hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    {vr.property.images?.[0] && (
                      <div className="size-16 rounded-lg bg-neutral-100 overflow-hidden shrink-0">
                        <img
                          src={vr.property.images[0].url}
                          alt={vr.property.title}
                          className="size-full object-cover"
                        />
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-neutral-900">{vr.property.title}</h3>
                      <div className="flex items-center gap-1.5 mt-1 text-sm text-neutral-500">
                        <MapPin className="size-3.5" />
                        {vr.property.city}
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-sm text-neutral-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="size-3.5" />
                          {new Date(vr.requestedDate).toLocaleDateString('fr-FR')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="size-3.5" />
                          {vr.timeSlot}
                        </span>
                      </div>
                      {vr.ownerComment && (
                        <p className="text-sm text-neutral-600 mt-2 italic">
                          &ldquo;{vr.ownerComment}&rdquo;
                        </p>
                      )}
                      {vr.status === 'COUNTER_PROPOSED' && vr.counterDate && (
                        <div className="mt-2 p-2 rounded bg-blue-50 text-sm text-blue-700">
                          Contre-proposition : {new Date(vr.counterDate).toLocaleDateString('fr-FR')} — {vr.counterTimeSlot}
                        </div>
                      )}
                    </div>
                  </div>
                  <StatusBadge status={vr.status} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </motion.div>
  )
}
