'use client'

import { useCallback, useEffect, useState } from 'react'
import { FileSignature, Building2, Calendar, User, ChevronRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { motion } from 'framer-motion'

interface MyLeasesProps {
  onDetail: (id: string) => void
}

export function MyLeases({ onDetail }: MyLeasesProps) {
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
        <div className="space-y-3">
          {data.activeLeases.map((lease) => (
            <Card
              key={lease.id}
              className="border-neutral-200 hover:shadow-sm transition-shadow cursor-pointer"
              onClick={() => onDetail(lease.id)}
            >
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  {/* Property image */}
                  {lease.property.images?.[0] ? (
                    <div className="size-14 sm:size-16 rounded-lg bg-neutral-100 overflow-hidden shrink-0">
                      <img src={lease.property.images[0].url} alt="" className="size-full object-cover" />
                    </div>
                  ) : (
                    <div className="size-14 sm:size-16 rounded-lg bg-brand-50 flex items-center justify-center shrink-0">
                      <Building2 className="size-6 text-brand-400" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-neutral-900 text-sm truncate">{lease.property.title}</h3>
                        <div className="flex items-center gap-1.5 text-xs text-neutral-500 mt-0.5">
                          <User className="size-3" />
                          {lease.owner.firstName} {lease.owner.lastName}
                        </div>
                      </div>
                      <Badge className="bg-emerald-50 text-emerald-700 text-[10px] shrink-0">Actif</Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-3 text-xs">
                      <div>
                        <span className="text-neutral-400">Loyer</span>
                        <p className="font-semibold text-neutral-900">{lease.monthlyRent.toLocaleString('fr-FR')} FCFA</p>
                      </div>
                      <div>
                        <span className="text-neutral-400">Charges</span>
                        <p className="font-semibold text-neutral-900">{lease.charges?.toLocaleString('fr-FR') || 0} FCFA</p>
                      </div>
                      <div>
                        <span className="text-neutral-400">Début</span>
                        <p className="font-medium text-neutral-700">{new Date(lease.startDate).toLocaleDateString('fr-FR')}</p>
                      </div>
                      <div>
                        <span className="text-neutral-400">Fin</span>
                        <p className="font-medium text-neutral-700">{new Date(lease.endDate).toLocaleDateString('fr-FR')}</p>
                      </div>
                    </div>
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
