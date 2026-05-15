'use client'

import { useCallback, useEffect, useState } from 'react'
import { FileSignature, Building2, User } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { motion } from 'framer-motion'

export function ProprietaireLeases() {
  const { isAuthenticated } = useAuthStore()
  const [data, setData] = useState<Array<{
    id: string; status: string; monthlyRent: number; charges: number; startDate: string; endDate: string
    tenant: { firstName: string; lastName: string }
    property: { title: string }
  }>>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false)
      return
    }

    try {
      const d = await authFetch<{ activeLeases?: Array<{
        id: string; status: string; monthlyRent: number; charges: number; startDate: string; endDate: string
        tenant: { firstName: string; lastName: string }
        property: { title: string }
      }> }>('/api/dashboard/proprietaire')
      setData(d.activeLeases || [])
    } catch (err) {
      if (err instanceof AuthError && err.status === 401) {
        // authFetch already handled logout — just show default data
        setData([])
        return
      }
      setData([])
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) return <div className="space-y-4">{[1, 2].map((i) => <div key={i} className="h-32 rounded-xl bg-neutral-100 animate-pulse" />)}</div>

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Mes baux</h1>
        <p className="text-neutral-500 mt-1">Contrats de location actifs et passés</p>
      </div>

      {data.length === 0 ? (
        <Card className="border-neutral-200">
          <CardContent className="py-12 text-center">
            <FileSignature className="size-12 text-neutral-300 mx-auto mb-4" />
            <p className="text-neutral-500">Aucun bail</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {data.map((lease) => (
            <Card key={lease.id} className="border-neutral-200">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-neutral-900">{lease.property.title}</h3>
                    <p className="text-sm text-neutral-500 flex items-center gap-1 mt-0.5">
                      <User className="size-3.5" /> {lease.tenant.firstName} {lease.tenant.lastName}
                    </p>
                  </div>
                  <Badge className={lease.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-600'}>
                    {lease.status === 'ACTIVE' ? 'Actif' : lease.status}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-lg bg-neutral-50">
                  <div>
                    <p className="text-xs text-neutral-500">Loyer</p>
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
