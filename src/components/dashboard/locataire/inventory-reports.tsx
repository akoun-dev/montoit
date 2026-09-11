'use client'

import { useCallback, useEffect, useState } from 'react'
import { FileText, Eye, PenLine, Calendar, Key, Building2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import {
  ReportDetailDialog, typeLabels, statusConfig, formatDate,
} from '../tc/report-detail-dialog'
import type { InventoryReport } from '../tc/report-detail-dialog'

interface ReportsResponse {
  reports: InventoryReport[]
}

const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } }
const itemVariants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }

export function LocataireInventoryReports() {
  const { isAuthenticated } = useAuthStore()
  const [reports, setReports] = useState<InventoryReport[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [detailReport, setDetailReport] = useState<InventoryReport | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [signingId, setSigningId] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) { setLoading(false); return }
    try {
      // Scoped server-side to the current tenant's own leases.
      const d = await authFetch<ReportsResponse>('/api/tc/inventory-reports')
      setReports(d.reports || [])
    } catch (err) {
      if (err instanceof AuthError && err.status === 401) return
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSign = async (report: InventoryReport & { tenantSignedAt?: string | null }) => {
    setSigningId(report.id)
    try {
      await authFetch('/api/tc/inventory-reports', {
        method: 'PATCH',
        body: JSON.stringify({ reportId: report.id, tenantSigned: true }),
      })
      toast.success('État des lieux signé')
      fetchData()
    } catch {
      toast.error('Erreur lors de la signature')
    } finally {
      setSigningId(null)
    }
  }

  if (loading) return <div className="space-y-6"><div><div className="h-8 w-56 bg-muted animate-pulse rounded" /><div className="h-4 w-72 bg-muted animate-pulse rounded mt-2" /></div>{[1, 2].map((i) => <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />)}</div>

  if (error) return <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6"><div><h1 className="text-xl sm:text-2xl font-bold text-foreground">États des lieux</h1><p className="text-muted-foreground mt-1">Impossible de charger vos états des lieux</p></div><Card className="border-amber-200 bg-amber-50"><CardContent className="p-4"><p className="text-sm text-amber-700">Impossible de charger. Veuillez réessayer.</p></CardContent></Card></motion.div>

  return (
    <motion.div initial="hidden" animate="show" variants={containerVariants} className="space-y-6">
      <motion.div variants={itemVariants}>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
          <FileText className="size-5 sm:size-6 text-[#FF6C2F]" /> États des lieux
        </h1>
        <p className="text-muted-foreground mt-1">Entrée et sortie de vos locations</p>
      </motion.div>

      {reports.length === 0 ? (
        <motion.div variants={itemVariants}>
          <Card className="border-dashed border-border bg-muted/50">
            <CardContent className="py-12 text-center">
              <FileText className="size-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground">Aucun état des lieux pour le moment</p>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <motion.div variants={itemVariants} className="space-y-3">
          {reports.map((r) => {
            const cfg = statusConfig[r.status] || statusConfig.DRAFT
            const StatusIcon = cfg.icon
            const tenantSignedAt = (r as any).tenantSignedAt
            const canSign = (r.status === 'COMPLETED' || r.status === 'SIGNED_OWNER') && !tenantSignedAt
            return (
              <Card key={r.id} className="border-border">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Badge variant="outline" className="text-[10px]">{typeLabels[r.type] || r.type}</Badge>
                        <Badge className={cfg.className}>
                          <StatusIcon className="size-3 mr-1" /> {cfg.label}
                        </Badge>
                        {r.totalKeys != null && r.totalKeys > 0 && (
                          <Badge variant="outline" className="text-[10px] gap-1"><Key className="size-3" /> {r.totalKeys} clé(s)</Badge>
                        )}
                      </div>
                      <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                        <Building2 className="size-3.5 text-muted-foreground shrink-0" />
                        {r.property?.title || 'Bien'}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                        <Calendar className="size-3 shrink-0" /> Créé le {formatDate(r.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => { setDetailReport(r); setDetailOpen(true) }}>
                        <Eye className="size-3.5" /> Voir
                      </Button>
                      {canSign && (
                        <Button size="sm" className="gap-1 bg-brand-500 hover:bg-brand-600 text-white" disabled={signingId === r.id} onClick={() => handleSign(r)}>
                          <PenLine className="size-3.5" /> {signingId === r.id ? 'Signature...' : 'Signer'}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </motion.div>
      )}

      <ReportDetailDialog report={detailReport} open={detailOpen} onOpenChange={setDetailOpen} />
    </motion.div>
  )
}
