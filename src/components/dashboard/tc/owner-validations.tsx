'use client'

import { useCallback, useEffect, useState } from 'react'
import { BadgeCheck, FileText, Check, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

export function OwnerValidations() {
  const { isAuthenticated } = useAuthStore()
  const [docs, setDocs] = useState<Array<{
    id: string; type: string; name: string; status: string; createdAt: string
    owner: { firstName: string; lastName: string; phone: string }
  }>>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false)
      return
    }

    try {
      const d = await authFetch<{ pendingOwnershipDocs?: Array<{
        id: string; type: string; name: string; status: string; createdAt: string
        owner: { firstName: string; lastName: string; phone: string }
      }> }>('/api/dashboard/tc')
      setDocs(d.pendingOwnershipDocs || [])
    } catch (err) {
      if (err instanceof AuthError && err.status === 401) {
        // authFetch already handled logout — just show default data
        setDocs([])
        return
      }
      setDocs([])
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) return <div className="space-y-4">{[1, 2].map((i) => <div key={i} className="h-32 rounded-xl bg-neutral-100 animate-pulse" />)}</div>

  const typeLabels: Record<string, string> = {
    TITRE_FONCIER: 'Titre foncier',
    ACTE_NOTARIE: 'Acte notarié',
    ATTESTATION_PROPRIETE: 'Attestation de propriété',
    RCCM: 'RCCM',
    AGREMENT: 'Agrément',
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Validations propriétaires</h1>
        <p className="text-neutral-500 mt-1">Vérifiez les documents de propriété</p>
      </div>

      {docs.length === 0 ? (
        <Card className="border-neutral-200">
          <CardContent className="py-12 text-center">
            <BadgeCheck className="size-12 text-neutral-300 mx-auto mb-4" />
            <p className="text-neutral-500">Aucun document en attente de validation</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {docs.map((doc) => (
            <Card key={doc.id} className="border-neutral-200">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-neutral-900">{doc.owner.firstName} {doc.owner.lastName}</h3>
                    <p className="text-sm text-neutral-500">{doc.owner.phone}</p>
                  </div>
                  <Badge variant="outline">{typeLabels[doc.type] || doc.type}</Badge>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-neutral-50 mb-3">
                  <FileText className="size-5 text-neutral-400" />
                  <div>
                    <p className="text-sm font-medium">{doc.name}</p>
                    <p className="text-xs text-neutral-500">Soumis le {new Date(doc.createdAt).toLocaleDateString('fr-FR')}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white gap-1" onClick={() => toast.success('Document validé')}>
                    <Check className="size-4" /> Valider
                  </Button>
                  <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50 gap-1" onClick={() => toast.error('Document rejeté')}>
                    <X className="size-4" /> Rejeter
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </motion.div>
  )
}
