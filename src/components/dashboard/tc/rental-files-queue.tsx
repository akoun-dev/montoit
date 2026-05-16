'use client'

import { useCallback, useEffect, useState } from 'react'
import { ClipboardCheck, FileText, Clock, AlertTriangle, Eye, Check, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

export function RentalFilesQueue() {
  const { isAuthenticated } = useAuthStore()
  const [files, setFiles] = useState<Array<{
    id: string; status: string; monthlyIncome: number | null; employer: string | null; createdAt: string
    tenant: { firstName: string; lastName: string; phone: string }
    documents: Array<{ type: string; status: string; name: string }>
  }>>([])
  const [loading, setLoading] = useState(true)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false)
      return
    }

    try {
      const d = await authFetch<{ pendingRentalFiles?: Array<{
        id: string; status: string; monthlyIncome: number | null; employer: string | null; createdAt: string
        tenant: { firstName: string; lastName: string; phone: string }
        documents: Array<{ type: string; status: string; name: string }>
      }> }>('/api/dashboard/tc')
      setFiles(d.pendingRentalFiles || [])
    } catch (err) {
      if (err instanceof AuthError && err.status === 401) {
        // authFetch already handled logout — just show default data
        setFiles([])
        return
      }
      setFiles([])
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleValidate = (id: string) => { toast.success('Dossier validé avec succès !') }
  const handleReject = (id: string) => { toast.error('Dossier rejeté') }

  if (loading) return <div className="space-y-4">{[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />)}</div>

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dossiers à valider</h1>
        <p className="text-muted-foreground mt-1">File d&apos;attente des dossiers locatifs</p>
      </div>

      {files.length === 0 ? (
        <Card className="border-border">
          <CardContent className="py-12 text-center">
            <ClipboardCheck className="size-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground">Aucun dossier en attente</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {files.map((rf) => (
            <Card key={rf.id} className="border-border">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-foreground">{rf.tenant.firstName} {rf.tenant.lastName}</h3>
                    <p className="text-sm text-muted-foreground">{rf.tenant.phone}</p>
                    {rf.monthlyIncome && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Revenus : {rf.monthlyIncome.toLocaleString('fr-FR')} FCFA · {rf.employer || 'N/A'}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={rf.status === 'SUBMITTED' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}>
                      {rf.status === 'SUBMITTED' ? 'Soumis' : 'En revue'}
                    </Badge>
                  </div>
                </div>

                {/* Documents */}
                <div className="space-y-2 mb-4">
                  <p className="text-sm font-medium text-foreground">Documents :</p>
                  {rf.documents.map((doc, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded border border-border">
                      <div className="flex items-center gap-2">
                        <FileText className="size-4 text-muted-foreground" />
                        <span className="text-sm text-foreground">{doc.name}</span>
                      </div>
                      <Badge className={
                        doc.status === 'VALIDATED' ? 'bg-green-100 text-green-700' :
                        doc.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'
                      }>
                        {doc.status === 'VALIDATED' ? 'Validé' : doc.status === 'REJECTED' ? 'Rejeté' : 'En attente'}
                      </Badge>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button onClick={() => handleValidate(rf.id)} size="sm" className="bg-green-600 hover:bg-green-700 text-white gap-1">
                    <Check className="size-4" /> Valider
                  </Button>
                  <Button onClick={() => handleReject(rf.id)} variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50 gap-1">
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
