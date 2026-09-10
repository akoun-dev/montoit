'use client'

import { useCallback, useEffect, useState } from 'react'
import { BarChart3, Download } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'

type Period = 'week' | 'month' | 'quarter' | 'year'

interface ReportMetric {
  key: string
  title: string
  value: string | number
  change: string
  period: string
}

interface ReportsResponse {
  period: Period
  metrics: ReportMetric[]
  generatedAt: string
}

const PERIOD_LABELS: Record<Period, string> = {
  week: 'Cette semaine',
  month: 'Ce mois',
  quarter: 'Ce trimestre',
  year: 'Cette année',
}

function toCsv(metrics: ReportMetric[]): string {
  const header = ['Métrique', 'Valeur', 'Évolution', 'Période']
  const rows = metrics.map((m) => [m.title, String(m.value), m.change, m.period])
  return [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
}

export function Reports() {
  const { isAuthenticated } = useAuthStore()
  const [period, setPeriod] = useState<Period>('month')
  const [data, setData] = useState<ReportsResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchReports = useCallback(async () => {
    if (!isAuthenticated) { setLoading(false); return }
    setLoading(true)
    try {
      const result = await authFetch<ReportsResponse>(`/api/admin/reports?period=${period}`)
      setData(result)
    } catch (err) {
      if (err instanceof AuthError && err.status === 401) return
      toast.error(err instanceof Error ? err.message : 'Erreur lors du chargement des rapports')
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, period])

  useEffect(() => { fetchReports() }, [fetchReports])

  const handleExport = () => {
    if (!data || data.metrics.length === 0) {
      toast.error('Aucune donnée à exporter')
      return
    }
    const csv = toCsv(data.metrics)
    const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `rapport-${period}-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.success('Export téléchargé')
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Rapports & Analyses</h1>
          <p className="text-muted-foreground mt-1">Statistiques détaillées de la plateforme</p>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="w-full sm:w-40 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
                <SelectItem key={p} value={p}>{PERIOD_LABELS[p]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="gap-1" onClick={handleExport} disabled={loading || !data}>
            <Download className="size-4" /> Exporter
          </Button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
          ))
        ) : (
          (data?.metrics ?? []).map((item) => (
            <Card key={item.key} className="border-border">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">{item.title}</p>
                <div className="flex items-end gap-2 mt-1">
                  <p className="text-xl sm:text-2xl font-bold text-foreground">{item.value}</p>
                  <span className={`text-sm font-medium ${item.change.startsWith('+') ? 'text-green-600' : item.change === '0%' ? 'text-muted-foreground' : 'text-red-600'}`}>
                    {item.change}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{item.period}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Card className="border-border">
        <CardContent className="p-6 text-center">
          <BarChart3 className="size-12 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-muted-foreground">Graphiques détaillés disponibles prochainement</p>
          <p className="text-sm text-muted-foreground mt-1">Visualisations avec Recharts en cours de développement</p>
        </CardContent>
      </Card>
    </motion.div>
  )
}
