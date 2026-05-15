'use client'

import { useEffect, useState } from 'react'
import { Eye, Check, X, Clock, MapPin, Calendar, User, Phone } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

export function VisitRequests() {
  const [data, setData] = useState<Array<{
    id: string; status: string; requestedDate: string; timeSlot: string
    counterDate: string | null; counterTimeSlot: string | null; ownerComment: string | null
    tenant: { firstName: string; lastName: string; phone: string }
    property: { title: string; city: string }
  }>[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard/proprietaire')
      .then((r) => r.json())
      .then((d) => setData(d.visitRequests || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="space-y-4">{[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-xl bg-neutral-100 animate-pulse" />)}</div>

  const handleAccept = (id: string) => { toast.success('Visite acceptée !') }
  const handleReject = (id: string) => { toast.error('Visite refusée') }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Demandes de visite</h1>
        <p className="text-neutral-500 mt-1">Gérez les demandes de visite de vos biens</p>
      </div>

      {data.length === 0 ? (
        <Card className="border-neutral-200">
          <CardContent className="py-12 text-center">
            <Eye className="size-12 text-neutral-300 mx-auto mb-4" />
            <p className="text-neutral-500">Aucune demande de visite</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {data.map((vr) => (
            <Card key={vr.id} className="border-neutral-200">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-neutral-900">{vr.property.title}</h3>
                    <p className="text-sm text-neutral-500 flex items-center gap-1 mt-0.5">
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

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4 p-3 rounded-lg bg-neutral-50">
                  <div className="flex items-center gap-2 text-sm text-neutral-700">
                    <User className="size-4 text-neutral-400" />
                    {vr.tenant.firstName} {vr.tenant.lastName}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-neutral-700">
                    <Phone className="size-4 text-neutral-400" />
                    {vr.tenant.phone}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-neutral-700">
                    <Calendar className="size-4 text-neutral-400" />
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
