'use client'

import { useState, useEffect, useCallback } from 'react'
import { History as HistoryIcon, LogIn, FileText, CreditCard, Wrench, Eye, MessageSquare, Settings, CheckCircle2, XCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { motion } from 'framer-motion'

// ─── Types ──────────────────────────────────────────────────────────────────
interface AuditLogItem {
  id: string
  action: string
  entity: string
  entityId: string | null
  details: string | null
  createdAt: string
}

interface HistoryResponse {
  data: AuditLogItem[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

// ─── Helpers ────────────────────────────────────────────────────────────────
const actionConfig: Record<string, { icon: typeof LogIn; label: string; color: string }> = {
  CREATE: { icon: CheckCircle2, label: 'Création', color: 'text-emerald-500 bg-emerald-50' },
  UPDATE: { icon: Settings, label: 'Mise à jour', color: 'text-amber-500 bg-amber-50' },
  SUBMIT: { icon: FileText, label: 'Soumission', color: 'text-brand-500 bg-brand-50' },
  LOGIN: { icon: LogIn, label: 'Connexion', color: 'text-muted-foreground bg-muted' },
  LOGOUT: { icon: LogIn, label: 'Déconnexion', color: 'text-muted-foreground bg-muted' },
  DELETE: { icon: XCircle, label: 'Suppression', color: 'text-red-500 bg-red-50' },
  VERIFY: { icon: CheckCircle2, label: 'Vérification', color: 'text-emerald-500 bg-emerald-50' },
}

const entityLabels: Record<string, string> = {
  User: 'Profil',
  RentalFile: 'Dossier locatif',
  MaintenanceRequest: 'Maintenance',
  Payment: 'Paiement',
  Lease: 'Bail',
  VisitRequest: 'Visite',
  Rating: 'Avis',
  Message: 'Message',
  Property: 'Bien',
  OTPCode: 'Code OTP',
}

function getActionConfig(action: string) {
  return actionConfig[action] || { icon: Settings, label: action, color: 'text-muted-foreground bg-muted' }
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDateShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
  })
}

// ─── Animation Variants ────────────────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

export function ActivityHistory() {
  const { user, isAuthenticated } = useAuthStore()
  const [logs, setLogs] = useState<AuditLogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)

  const fetchHistory = useCallback(async () => {
    if (!isAuthenticated) { setLoading(false); return }
    try {
      const result = await authFetch<HistoryResponse>('/api/history')
      setLogs(result.data ?? [])
      setTotal(result.pagination?.total ?? 0)
    } catch (err) {
      if (err instanceof AuthError && err.status === 401) { setLogs([]); return }
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
      setLogs([])
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => { fetchHistory() }, [fetchHistory])

  // ─── Loading skeleton ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-8 w-32 bg-muted animate-pulse rounded" />
          <div className="h-4 w-48 bg-muted animate-pulse rounded mt-2" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-start gap-4">
              <div className="size-6 rounded-full bg-muted animate-pulse shrink-0" />
              <div className="flex-1">
                <div className="h-4 w-48 bg-muted animate-pulse rounded" />
                <div className="h-3 w-24 bg-muted animate-pulse rounded mt-2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ─── Error state ───────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-foreground">Historique</h1>
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <p className="text-sm text-amber-700">Impossible de charger votre historique. Veuillez réessayer.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold text-foreground">Historique</h1>
        <p className="text-muted-foreground mt-1">
          {logs.length > 0
            ? `${total} activité${total > 1 ? 's' : ''} récente${total > 1 ? 's' : ''}`
            : 'Vos activités récentes'}
        </p>
      </motion.div>

      {logs.length === 0 ? (
        /* Empty State */
        <motion.div variants={itemVariants}>
          <Card className="border-dashed border-border bg-muted/50">
            <CardContent className="py-12 flex flex-col items-center text-center">
              <div className="flex size-16 items-center justify-center rounded-full bg-brand-50 mb-4">
                <HistoryIcon className="size-7 text-brand-500" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">
                Aucune activité récente
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                {user?.firstName}, vos actions et événements apparaîtront ici au fil du temps.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        /* Timeline */
        <motion.div variants={itemVariants}>
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Fil d&apos;activité</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-[11px] top-2 bottom-2 w-px bg-neutral-200" />

                <div className="space-y-6">
                  {logs.map((log, index) => {
                    const config = getActionConfig(log.action)
                    const IconComp = config.icon
                    const entityLabel = entityLabels[log.entity] || log.entity
                    const isFirst = index === 0

                    return (
                      <div key={log.id} className="flex items-start gap-4 relative">
                        <div className={`flex size-6 shrink-0 items-center justify-center rounded-full border-2 z-10 ${
                          isFirst ? 'border-brand-500 bg-brand-50' : 'border-border bg-card'
                        }`}>
                          <IconComp className={`size-3 ${isFirst ? 'text-brand-500' : 'text-muted-foreground'}`} />
                        </div>
                        <div className="flex-1 pt-0.5 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className={`text-sm ${isFirst ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                              {log.details || `${config.label} — ${entityLabel}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-border text-muted-foreground">
                              {entityLabel}
                            </Badge>
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border ${config.color}`}>
                              {config.label}
                            </Badge>
                            <span className="text-xs text-neutral-300">
                              {formatDateTime(log.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  )
}
