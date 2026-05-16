'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, Eye, Check, MessageSquare } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

interface Dispute {
  id: string; type: string; description: string; status: string; createdAt: string
  reportedBy: { firstName: string; lastName: string }
  lease: { property: { title: string } }
}

const typeLabels: Record<string, string> = {
  UNPAID_RENT: 'Loyer impayé',
  PROPERTY_DAMAGE: 'Détérioration du bien',
  HARASSMENT: 'Harcèlement',
  FRAUD: 'Fraude',
  OTHER: 'Autre',
}

export function Disputes() {
  const { isAuthenticated } = useAuthStore()
  const [disputes, setDisputes] = useState<Dispute[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false)
      return
    }

    try {
      const d = await authFetch<{ disputes?: Dispute[] }>('/api/dashboard/admin')
      setDisputes(d.disputes || [])
    } catch (err) {
      if (err instanceof AuthError && err.status === 401) {
        // authFetch already handled logout — just show default data
        setDisputes([])
        return
      }
      setDisputes([])
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) return <div className="space-y-4">{[1, 2].map((i) => <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />)}</div>

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Litiges</h1>
        <p className="text-muted-foreground mt-1">Résolution des conflits entre locataires et propriétaires</p>
      </div>

      {disputes.length === 0 ? (
        <Card className="border-border">
          <CardContent className="py-12 text-center">
            <AlertTriangle className="size-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground">Aucun litige en cours</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {disputes.map((d) => (
            <Card key={d.id} className="border-border">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className="bg-red-100 text-red-700">{typeLabels[d.type] || d.type}</Badge>
                      <Badge className={d.status === 'OPEN' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}>
                        {d.status === 'OPEN' ? 'Ouvert' : 'En revue'}
                      </Badge>
                    </div>
                    <p className="text-sm text-foreground mt-2">{d.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span>Signalé par : {d.reportedBy.firstName} {d.reportedBy.lastName}</span>
                      <span>Bien : {d.lease.property.title}</span>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">{new Date(d.createdAt).toLocaleDateString('fr-FR')}</span>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white gap-1" onClick={() => toast.success('Litige résolu')}>
                    <Check className="size-4" /> Résoudre
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1" onClick={() => toast.info('Message envoyé')}>
                    <MessageSquare className="size-4" /> Contacter
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
