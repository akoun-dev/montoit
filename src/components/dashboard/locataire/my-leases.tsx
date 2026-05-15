'use client'

import { useCallback, useEffect, useState } from 'react'
import { FileSignature, Building2, Calendar, User } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { motion } from 'framer-motion'

export function MyLeases() {
  const { isAuthenticated } = useAuthStore()
  const [data, setData] = useState<{ activeLeases: Array<{
    id: string; status: string; monthlyRent: number; charges: number; deposit: number; startDate: string; endDate: string
    property: { title: string; images: Array<{ url: string }> }
    owner: { firstName: string; lastName: string }
  }> } | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false)
      return
    }

    try {
      const d = await authFetch<{ activeLeases: Array<{
        id: string; status: string; monthlyRent: number; charges: number; deposit: number; startDate: string; endDate: string
        property: { title: string; images: Array<{ url: string }> }
        owner: { firstName: string; lastName: string }
      }> }>('/api/dashboard/locataire')
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
    return <div className="space-y-4">{[1, 2].map((i) => <div key={i} className="h-32 rounded-xl bg-neutral-100 animate-pulse" />)}</div>
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Mes baux</h1>
        <p className="text-neutral-500 mt-1">Consultez vos contrats de location</p>
      </div>

      {!data?.activeLeases.length ? (
        <Card className="border-neutral-200">
          <CardContent className="py-12 text-center">
            <FileSignature className="size-12 text-neutral-300 mx-auto mb-4" />
            <p className="text-neutral-500">Aucun bail actif</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {data.activeLeases.map((lease) => (
            <Card key={lease.id} className="border-neutral-200">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {lease.property.images?.[0] && (
                      <div className="size-14 rounded-lg bg-neutral-100 overflow-hidden">
                        <img src={lease.property.images[0].url} alt="" className="size-full object-cover" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-neutral-900">{lease.property.title}</h3>
                      <div className="flex items-center gap-1.5 text-sm text-neutral-500 mt-0.5">
                        <User className="size-3.5" />
                        {lease.owner.firstName} {lease.owner.lastName}
                      </div>
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-700">Actif</Badge>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-lg bg-neutral-50">
                  <div>
                    <p className="text-xs text-neutral-500">Loyer mensuel</p>
                    <p className="text-sm font-semibold">{lease.monthlyRent.toLocaleString('fr-FR')} FCFA</p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500">Charges</p>
                    <p className="text-sm font-semibold">{lease.charges?.toLocaleString('fr-FR') || 0} FCFA</p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500">Début</p>
                    <p className="text-sm font-semibold">{new Date(lease.startDate).toLocaleDateString('fr-FR')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500">Fin</p>
                    <p className="text-sm font-semibold">{new Date(lease.endDate).toLocaleDateString('fr-FR')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </motion.div>
  )
}
