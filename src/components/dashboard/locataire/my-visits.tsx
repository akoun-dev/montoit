'use client'

import { useCallback, useEffect, useState } from 'react'
import { Eye, Calendar, Clock, MapPin, ChevronRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
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
    COUNTER_PROPOSED: { label: 'Contre-proposition', className: 'bg-brand-100 text-brand-700' },
    COMPLETED: { label: 'Complété', className: 'bg-muted text-foreground' },
    CANCELLED: { label: 'Annulé', className: 'bg-muted text-muted-foreground' },
  }
  const c = config[status] || { label: status, className: 'bg-muted text-foreground' }
  return <Badge className={`${c.className} text-[10px]`}>{c.label}</Badge>
}

interface MyVisitsProps {
  onDetail: (id: string) => void
}

export function MyVisits({ onDetail }: MyVisitsProps) {
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
    return <div className="space-y-4">{[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}</div>
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Mes visites</h1>
        <p className="text-muted-foreground mt-1">Suivez vos demandes de visite</p>
      </div>

      {!data?.visitRequests.length ? (
        <Card className="border-border">
          <CardContent className="py-12 text-center">
            <Eye className="size-12 text-neutral-300 mx-auto mb-4" />
            <p className="text-muted-foreground">Aucune visite planifiée</p>
            <p className="text-sm text-muted-foreground mt-1">Explorez les biens disponibles pour demander une visite</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.visitRequests.map((vr) => (
            <Card
              key={vr.id}
              className="border-border hover:shadow-sm transition-shadow cursor-pointer"
              onClick={() => onDetail(vr.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {/* Property image */}
                  {vr.property.images?.[0] ? (
                    <div className="size-14 sm:size-16 rounded-lg bg-muted overflow-hidden shrink-0">
                      <img
                        src={vr.property.images[0].url}
                        alt={vr.property.title}
                        className="size-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="size-14 sm:size-16 rounded-lg bg-brand-50 flex items-center justify-center shrink-0">
                      <Eye className="size-6 text-brand-400" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-foreground text-sm truncate">{vr.property.title}</h3>
                      <StatusBadge status={vr.status} />
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                      <MapPin className="size-3" />
                      {vr.property.city}
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3" />
                        {new Date(vr.requestedDate).toLocaleDateString('fr-FR')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" />
                        {vr.timeSlot}
                      </span>
                    </div>
                    {vr.status === 'COUNTER_PROPOSED' && vr.counterDate && (
                      <div className="mt-2 p-2 rounded bg-brand-50 text-xs text-brand-700">
                        Contre-proposition : {new Date(vr.counterDate).toLocaleDateString('fr-FR')} — {vr.counterTimeSlot}
                      </div>
                    )}
                  </div>

                  <ChevronRight className="size-5 text-neutral-300 shrink-0 self-center" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </motion.div>
  )
}
