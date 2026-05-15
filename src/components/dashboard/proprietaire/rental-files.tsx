'use client'

import { useCallback, useEffect, useState } from 'react'
import { ClipboardCheck, FileText } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { motion } from 'framer-motion'

export function ProprietaireRentalFiles() {
  const { isAuthenticated } = useAuthStore()
  const [data, setData] = useState<Array<{
    id: string; status: string; monthlyIncome: number | null; employer: string | null
    tenant: { firstName: string; lastName: string; phone: string }
    documents: Array<{ type: string; status: string; name: string }>
  }>>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false)
      return
    }

    try {
      const d = await authFetch<{ rentalFiles?: Array<{
        id: string; status: string; monthlyIncome: number | null; employer: string | null
        tenant: { firstName: string; lastName: string; phone: string }
        documents: Array<{ type: string; status: string; name: string }>
      }> }>('/api/dashboard/proprietaire')
      setData(d.rentalFiles || [])
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
        <h1 className="text-2xl font-bold text-neutral-900">Dossiers locatifs</h1>
        <p className="text-neutral-500 mt-1">Dossiers validés par les Tiers de Confiance</p>
      </div>

      {data.length === 0 ? (
        <Card className="border-neutral-200">
          <CardContent className="py-12 text-center">
            <ClipboardCheck className="size-12 text-neutral-300 mx-auto mb-4" />
            <p className="text-neutral-500">Aucun dossier locatif validé</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {data.map((rf) => (
            <Card key={rf.id} className="border-neutral-200">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-neutral-900">{rf.tenant.firstName} {rf.tenant.lastName}</h3>
                    <p className="text-sm text-neutral-500">{rf.tenant.phone}</p>
                  </div>
                  <Badge className={
                    rf.status === 'VALIDATED' ? 'bg-green-100 text-green-700' :
                    rf.status === 'TC_REVIEW' ? 'bg-amber-100 text-amber-700' :
                    rf.status === 'SUBMITTED' ? 'bg-blue-100 text-blue-700' :
                    'bg-neutral-100 text-neutral-600'
                  }>
                    {rf.status === 'VALIDATED' ? 'Validé' : rf.status === 'TC_REVIEW' ? 'En revue TC' : rf.status === 'SUBMITTED' ? 'Soumis' : rf.status}
                  </Badge>
                </div>
                {rf.monthlyIncome && (
                  <p className="text-sm text-neutral-600 mb-2">
                    Revenus : {rf.monthlyIncome.toLocaleString('fr-FR')} FCFA · {rf.employer || 'Non renseigné'}
                  </p>
                )}
                <div className="flex flex-wrap gap-2 mt-2">
                  {rf.documents.map((doc, i) => (
                    <Badge key={i} variant="outline" className="text-xs flex items-center gap-1">
                      <FileText className="size-3" />
                      {doc.name}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </motion.div>
  )
}
