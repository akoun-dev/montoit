'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  BarChart3, Clock, TrendingUp, AlertTriangle,
  Building2, Eye, FileSignature, ArrowUpDown,
  Users
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { motion } from 'framer-motion'
import { useRealtimeProperties } from '@/hooks/use-realtime-properties'
import { useRealtimeMandats } from '@/hooks/use-realtime-mandats'
import { useRealtimeLeases } from '@/hooks/use-realtime-leases'
import { useRealtimePayments } from '@/hooks/use-realtime-payments'

// ─── Types ──────────────────────────────────────────────────────────────────
interface MonthlyRevenue {
  month: string
  revenue: number
  paid: number
  pending: number
}

interface PerPropertyPerformance {
  propertyId: string
  propertyTitle: string
  city: string
  revenue: number
  occupancy: number
  visitCount: number
  activeLeases: number
  monthlyRent: number
}

interface LatePaymentsTrend {
  month: string
  count: number
  amount: number
}

interface AnalyticsData {
  occupancyRate: number
  monthlyRevenue: MonthlyRevenue[]
  averageLeaseDurationMonths: number
  perPropertyPerformance: PerPropertyPerformance[]
  latePaymentsTrend: LatePaymentsTrend[]
  totals: {
    totalRevenue: number
    totalPaid: number
    totalPending: number
    latePaymentsCount: number
    totalProperties: number
    rentedProperties: number
    activeLeases: number
  }
}

type SortField = 'revenue' | 'occupancy' | 'visits'
type SortDirection = 'asc' | 'desc'

// ─── Helpers ────────────────────────────────────────────────────────────────
function formatCurrency(amount: number): string {
  return amount.toLocaleString('fr-FR') + ' FCFA'
}

function formatShortMonth(monthStr: string): string {
  const parts = monthStr.split(' ')
  if (parts.length >= 1) {
    return parts[0].substring(0, 3).charAt(0).toUpperCase() + parts[0].substring(1, 3)
  }
  return monthStr
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

// ─── Circular Progress (SVG) ───────────────────────────────────────────────
function CircularProgress({ value, size = 80, strokeWidth = 6 }: { value: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference
  const center = size / 2

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />
        {/* Progress arc */}
        <motion.circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className="text-brand-500"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold text-foreground">{value}%</span>
      </div>
    </div>
  )
}

// ─── Component ──────────────────────────────────────────────────────────────
export function OwnerAnalytics() {
  const { user, isAuthenticated } = useAuthStore()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortField, setSortField] = useState<SortField>('revenue')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false)
      return
    }
    try {
      const result = await authFetch<AnalyticsData>('/api/owner/analytics')
      setData(result)
    } catch (err) {
      if (err instanceof AuthError && err.status === 401) {
        setData(null)
        return
      }
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useRealtimeProperties({ userId: user?.id, onPropertyChange: () => { fetchData() } })
  useRealtimeMandats({ userId: user?.id, onMandatChange: () => { fetchData() } })
  useRealtimeLeases({ userId: user?.id, onLeaseChange: () => { fetchData() } })
  useRealtimePayments({ userId: user?.id, onPaymentChange: () => { fetchData() } })

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  // ─── Loading skeleton ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-8 w-56 bg-muted animate-pulse rounded" />
          <div className="h-4 w-72 bg-muted animate-pulse rounded mt-2" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
        <div className="h-52 rounded-xl bg-muted animate-pulse" />
        <div className="h-40 rounded-xl bg-muted animate-pulse" />
      </div>
    )
  }

  // ─── Error state ───────────────────────────────────────────────────────
  if (error || !data) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Analytics</h1>
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <p className="text-sm text-amber-700">Impossible de charger vos données analytiques. Veuillez réessayer.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { occupancyRate, monthlyRevenue, averageLeaseDurationMonths, perPropertyPerformance, latePaymentsTrend, totals } = data

  // Last 12 months for line chart
  const last12Months = monthlyRevenue.slice(-12)

  // Late payments trend (last 6 months)
  const last6Late = latePaymentsTrend.slice(-6)
  const maxLateCount = Math.max(...last6Late.map((m) => m.count), 1)

  // Sorted properties
  const sortedProperties = [...perPropertyPerformance].sort((a, b) => {
    const multiplier = sortDirection === 'asc' ? 1 : -1
    if (sortField === 'revenue') return (a.revenue - b.revenue) * multiplier
    if (sortField === 'occupancy') return (a.occupancy - b.occupancy) * multiplier
    return (a.visitCount - b.visitCount) * multiplier
  })

  // Calculate late payment trend (compare last 2 months)
  const lateTrend = last6Late.length >= 2
    ? last6Late[last6Late.length - 1].count - last6Late[last6Late.length - 2].count
    : 0

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Analytics</h1>
        <p className="text-muted-foreground mt-1">Performance et indicateurs clés</p>
      </motion.div>

      {/* ─── KPI Cards (2x2 grid) ──────────────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Occupancy Rate */}
          <Card className="border-border">
            <CardContent className="p-4 flex flex-col items-center text-center">
              <p className="text-xs text-muted-foreground mb-2">Taux d&apos;occupation</p>
              <CircularProgress value={occupancyRate} size={80} strokeWidth={6} />
              <p className="text-xs text-muted-foreground mt-2">
                {totals.rentedProperties}/{totals.totalProperties} biens loués
              </p>
            </CardContent>
          </Card>

          {/* Average Lease Duration */}
          <Card className="border-border">
            <CardContent className="p-4 flex flex-col items-center text-center">
              <div className="flex size-14 items-center justify-center rounded-full bg-brand-50 mb-2">
                <Clock className="size-7 text-brand-500" />
              </div>
              <p className="text-xl sm:text-2xl font-bold text-foreground">
                {averageLeaseDurationMonths > 0 ? averageLeaseDurationMonths : '—'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {averageLeaseDurationMonths > 0 ? 'mois en moyenne' : 'Durée moy. locations'}
              </p>
            </CardContent>
          </Card>

          {/* Total Revenue */}
          <Card className="border-border">
            <CardContent className="p-4 flex flex-col items-center text-center">
              <div className="flex size-14 items-center justify-center rounded-full bg-emerald-50 mb-2">
                <TrendingUp className="size-7 text-emerald-500" />
              </div>
              <p className="text-lg font-bold text-foreground">
                {totals.totalRevenue > 0 ? `${(totals.totalRevenue / 1000).toFixed(0)}k` : '0'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Revenus totaux (FCFA)</p>
            </CardContent>
          </Card>

          {/* Late Payments */}
          <Card className="border-border">
            <CardContent className="p-4 flex flex-col items-center text-center">
              <div className="flex size-14 items-center justify-center rounded-full bg-red-50 mb-2">
                <AlertTriangle className={`size-7 ${totals.latePaymentsCount > 0 ? 'text-red-500' : 'text-neutral-300'}`} />
              </div>
              <p className={`text-xl sm:text-2xl font-bold ${totals.latePaymentsCount > 0 ? 'text-red-600' : 'text-foreground'}`}>
                {totals.latePaymentsCount}
              </p>
              <div className="flex items-center gap-1 mt-1">
                <p className="text-xs text-muted-foreground">Retards</p>
                {lateTrend !== 0 && (
                  <Badge className={`text-[9px] px-1 py-0 ${lateTrend > 0 ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                    {lateTrend > 0 ? `+${lateTrend}` : lateTrend}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* ─── Monthly Revenue Trend (Line chart using SVG) ──────────────────── */}
      <motion.div variants={itemVariants}>
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Tendance des revenus</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {last12Months.every((m) => m.paid === 0 && m.pending === 0) ? (
              <p className="text-sm text-muted-foreground text-center py-8">Aucune donnée de revenu disponible</p>
            ) : (
              <div className="relative h-48">
                <svg
                  viewBox="0 0 600 180"
                  className="w-full h-full"
                  preserveAspectRatio="none"
                >
                  {/* Grid lines */}
                  {[0, 1, 2, 3, 4].map((i) => (
                    <line
                      key={i}
                      x1="0"
                      y1={i * 45}
                      x2="600"
                      y2={i * 45}
                      stroke="currentColor"
                      className="text-border"
                      strokeWidth="1"
                      strokeDasharray="4,4"
                    />
                  ))}

                  {/* Revenue area */}
                  {(() => {
                    const maxVal = Math.max(...last12Months.map((m) => m.paid + m.pending), 1)
                    const points = last12Months.map((m, i) => {
                      const x = (i / (last12Months.length - 1 || 1)) * 580 + 10
                      const y = 170 - ((m.paid + m.pending) / maxVal) * 150
                      return { x, y }
                    })

                    const areaPath = points.length > 1
                      ? `M${points[0].x},${points[0].y} ` +
                        points.slice(1).map((p, i) => {
                          const prev = points[i]
                          const cpx1 = prev.x + (p.x - prev.x) * 0.4
                          const cpx2 = p.x - (p.x - prev.x) * 0.4
                          return `C${cpx1},${prev.y} ${cpx2},${p.y} ${p.x},${p.y}`
                        }).join(' ') +
                        ` L${points[points.length - 1].x},170 L${points[0].x},170 Z`
                      : ''

                    const linePath = points.length > 1
                      ? `M${points[0].x},${points[0].y} ` +
                        points.slice(1).map((p, i) => {
                          const prev = points[i]
                          const cpx1 = prev.x + (p.x - prev.x) * 0.4
                          const cpx2 = p.x - (p.x - prev.x) * 0.4
                          return `C${cpx1},${prev.y} ${cpx2},${p.y} ${p.x},${p.y}`
                        }).join(' ')
                      : ''

                    return (
                      <>
                        {/* Filled area */}
                        <motion.path
                          d={areaPath}
                          fill="url(#brandGradient)"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 0.15 }}
                          transition={{ duration: 1 }}
                        />
                        {/* Line */}
                        <motion.path
                          d={linePath}
                          fill="none"
                          stroke="var(--brand-500, #f97316)"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 1.5, ease: 'easeOut' }}
                        />
                        {/* Dots */}
                        {points.map((p, i) => (
                          <motion.circle
                            key={i}
                            cx={p.x}
                            cy={p.y}
                            r="4"
                            fill="white"
                            stroke="var(--brand-500, #f97316)"
                            strokeWidth="2"
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.1 * i, duration: 0.3 }}
                          />
                        ))}
                        {/* Gradient definition */}
                        <defs>
                          <linearGradient id="brandGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="var(--brand-500, #f97316)" stopOpacity="1" />
                            <stop offset="100%" stopColor="var(--brand-500, #f97316)" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                      </>
                    )
                  })()}
                </svg>

                {/* Month labels */}
                <div className="flex justify-between mt-2 px-1">
                  {last12Months.map((m, i) => (
                    <span key={i} className="text-[9px] text-muted-foreground truncate" style={{ width: `${100 / last12Months.length}%`, textAlign: 'center' }}>
                      {formatShortMonth(m.month)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── Per-Property Comparison ────────────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <Card className="border-border">
          <CardHeader className="pb-2">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <CardTitle className="text-base font-semibold">Comparaison par bien</CardTitle>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-7 text-xs px-2 ${sortField === 'revenue' ? 'text-brand-600 bg-brand-50' : 'text-muted-foreground'}`}
                  onClick={() => toggleSort('revenue')}
                >
                  <ArrowUpDown className="size-3 mr-1" />
                  Revenu
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-7 text-xs px-2 ${sortField === 'occupancy' ? 'text-brand-600 bg-brand-50' : 'text-muted-foreground'}`}
                  onClick={() => toggleSort('occupancy')}
                >
                  <ArrowUpDown className="size-3 mr-1" />
                  Occupation
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-7 text-xs px-2 ${sortField === 'visits' ? 'text-brand-600 bg-brand-50' : 'text-muted-foreground'}`}
                  onClick={() => toggleSort('visits')}
                >
                  <ArrowUpDown className="size-3 mr-1" />
                  Visites
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 max-h-96 overflow-y-auto">
            {sortedProperties.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Aucun bien enregistré</p>
            ) : (
              sortedProperties.map((prop) => (
                <div
                  key={prop.propertyId}
                  className="p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="size-9 rounded-lg bg-brand-50 flex items-center justify-center shrink-0">
                        <Building2 className="size-4 text-brand-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{prop.propertyTitle}</p>
                        <p className="text-xs text-muted-foreground">{prop.city}</p>
                      </div>
                    </div>
                    <Badge className={prop.occupancy === 100 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}>
                      {prop.occupancy === 100 ? 'Occupé' : 'Libre'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="size-3 text-emerald-500 shrink-0" />
                      <div>
                        <p className="text-muted-foreground">Revenu</p>
                        <p className="font-medium text-foreground">{prop.revenue > 0 ? formatCurrency(prop.revenue) : '—'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Eye className="size-3 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-muted-foreground">Visites</p>
                        <p className="font-medium text-foreground">{prop.visitCount}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <FileSignature className="size-3 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-muted-foreground">Baux actifs</p>
                        <p className="font-medium text-foreground">{prop.activeLeases}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="size-3 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-muted-foreground">Loyer/mois</p>
                        <p className="font-medium text-brand-600">{prop.monthlyRent > 0 ? formatCurrency(prop.monthlyRent) : '—'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── Late Payments Trend (bar chart) ──────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <Card className="border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-red-500" />
              <CardTitle className="text-base font-semibold">Tendance des retards de paiement</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {last6Late.every((m) => m.count === 0) ? (
              <div className="flex flex-col items-center text-center py-6">
                <div className="flex size-12 items-center justify-center rounded-full bg-emerald-50 mb-2">
                  <AlertTriangle className="size-5 text-emerald-500" />
                </div>
                <p className="text-sm font-medium text-emerald-700">Aucun retard ces 6 derniers mois</p>
                <p className="text-xs text-muted-foreground mt-1">Tous vos locataires sont à jour</p>
              </div>
            ) : (
              <>
                <div className="flex items-end gap-3 sm:gap-4 h-40">
                  {last6Late.map((month, idx) => {
                    const heightPercent = maxLateCount > 0 ? (month.count / maxLateCount) * 100 : 0
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                        <p className="text-xs font-medium text-red-600 mb-1">{month.count}</p>
                        <div className="w-full flex flex-col justify-end h-28">
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: `${Math.max(heightPercent, 2)}%` }}
                            transition={{ duration: 0.5, delay: idx * 0.1 }}
                            className={`w-full rounded-t-md ${month.count > 0 ? 'bg-red-400' : 'bg-muted'}`}
                          />
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1 truncate w-full text-center">
                          {formatShortMonth(month.month)}
                        </p>
                      </div>
                    )
                  })}
                </div>
                {/* Summary row */}
                <div className="flex items-center justify-center gap-6 mt-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-sm bg-red-400" />
                    <span className="text-muted-foreground">Retards</span>
                  </div>
                  <span className="text-muted-foreground">Total : <span className="font-medium text-red-600">{totals.latePaymentsCount}</span></span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
