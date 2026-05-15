'use client'

import { useEffect, useState } from 'react'
import { Clock, AlertTriangle, CheckCircle2, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { motion } from 'framer-motion'

export function SlaMonitoring() {
  const [stats, setStats] = useState({ pendingRentalFiles: 0, pendingOwnershipDocs: 0, totalReviewed: 0, overdueSlas: 0, slaCompliance: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard/tc')
      .then((r) => r.json())
      .then((d) => setStats(d.stats || {}))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="space-y-4">{[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-xl bg-neutral-100 animate-pulse" />)}</div>

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Suivi SLA</h1>
        <p className="text-neutral-500 mt-1">Respect des délais de traitement (48h)</p>
      </div>

      {/* SLA Compliance */}
      <Card className="border-neutral-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">Conformité SLA</h2>
              <p className="text-sm text-neutral-500">Objectif : 100% des dossiers traités sous 48h</p>
            </div>
            <div className="flex items-center gap-2">
              {stats.slaCompliance >= 90 ? (
                <CheckCircle2 className="size-6 text-green-500" />
              ) : (
                <AlertTriangle className="size-6 text-amber-500" />
              )}
              <span className="text-3xl font-bold text-neutral-900">{stats.slaCompliance}%</span>
            </div>
          </div>
          <Progress value={stats.slaCompliance} className="h-3" />
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-neutral-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-amber-50">
                <Clock className="size-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900">{stats.pendingRentalFiles}</p>
                <p className="text-xs text-neutral-500">Dossiers en attente</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-neutral-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-blue-50">
                <Clock className="size-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900">{stats.pendingOwnershipDocs}</p>
                <p className="text-xs text-neutral-500">Docs propriétaire</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-neutral-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-green-50">
                <TrendingUp className="size-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900">{stats.totalReviewed}</p>
                <p className="text-xs text-neutral-500">Dossiers traités</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-neutral-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-red-50">
                <AlertTriangle className="size-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900">{stats.overdueSlas}</p>
                <p className="text-xs text-neutral-500">SLA dépassés</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  )
}
