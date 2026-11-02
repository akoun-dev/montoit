'use client'

import { CheckCircle2, XCircle, AlertTriangle, ArrowRight, RefreshCw } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'

// ── Score Circle ────────────────────────────────────────────────────────────

export function ScoreCircle({ score, statusColor, size = 'md' }: { score: number; statusColor: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizeMap = { sm: 20, md: 36, lg: 48 }
  const radius = sizeMap[size]
  const circumference = 2 * Math.PI * radius
  const progress = (score / 100) * circumference
  const colorMap: Record<string, string> = { emerald: '#10b981', amber: '#f59e0b', red: '#ef4444' }
  const strokeColor = colorMap[statusColor] || '#ef4444'
  const viewBox = (radius + 8) * 2
  const center = viewBox / 2

  return (
    <div className={`relative shrink-0 ${size === 'lg' ? 'size-36' : size === 'md' ? 'size-24' : 'size-16'}`}>
      <svg className="size-full -rotate-90" viewBox={`0 0 ${viewBox} ${viewBox}`}>
        <circle cx={center} cy={center} r={radius} fill="none" stroke="#f5f5f5" strokeWidth="6" />
        <circle
          cx={center} cy={center} r={radius} fill="none"
          stroke={strokeColor} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`font-bold text-foreground ${size === 'lg' ? 'text-3xl' : size === 'md' ? 'text-lg' : 'text-xs'}`}>
          {score}
        </span>
        {size !== 'sm' && (
          <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">/100</span>
        )}
      </div>
    </div>
  )
}

// ── Score Component Card ────────────────────────────────────────────────────

export function ScoreComponentCard({
  icon: Icon,
  label,
  weight,
  score,
  max,
  statusColor,
  details,
  actionLabel,
  onAction,
  redoLabel,
  onRedo,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  weight: number
  score: number
  max: number
  statusColor: string
  details: React.ReactNode
  actionLabel?: string
  onAction?: () => void
  redoLabel?: string
  onRedo?: () => void
}) {
  const percentage = max > 0 ? Math.round((score / max) * 100) : 0
  const isComplete = score >= max

  const barColor = isComplete ? 'bg-emerald-500' : score > 0 ? 'bg-amber-400' : 'bg-neutral-200'

  return (
    <Card className="border-border hover:border-border transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
            isComplete ? 'bg-emerald-50 text-emerald-600' : 'bg-muted text-muted-foreground'
          }`}>
            <Icon className="size-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold text-foreground">{label}</span>
              <span className={`text-xs font-bold ${isComplete ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                {score}/{max} pts
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mb-2">{details}</p>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-2">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className={`h-full rounded-full ${barColor}`}
              />
            </div>
            <div className="flex items-center justify-between">
              <Badge className={`text-[10px] font-semibold px-2 py-0 border ${
                isComplete
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : score > 0
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-red-50 text-red-600 border-red-200'
              }`}>
                {isComplete ? (
                  <><CheckCircle2 className="size-3 mr-0.5" /> Complété</>
                ) : score > 0 ? (
                  <><AlertTriangle className="size-3 mr-0.5" /> En cours</>
                ) : (
                  <><XCircle className="size-3 mr-0.5" /> Non complété</>
                )}
              </Badge>
              <span className="text-[10px] font-medium text-muted-foreground">Poids : {weight}%</span>
            </div>
            {actionLabel && onAction && !isComplete && (
              <Button
                size="sm"
                variant="outline"
                className="mt-2.5 w-full text-xs h-8 border-brand-200 text-brand-600 hover:bg-brand-50"
                onClick={onAction}
              >
                {actionLabel}
                <ArrowRight className="size-3 ml-1" />
              </Button>
            )}
            {redoLabel && onRedo && isComplete && (
              <Button
                size="sm"
                variant="outline"
                className="mt-2.5 w-full text-xs h-8 border-purple-200 text-purple-600 hover:bg-purple-50"
                onClick={onRedo}
              >
                <RefreshCw className="size-3 mr-1" />
                {redoLabel}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Profile Field Row ───────────────────────────────────────────────────────

export function ProfileFieldRow({ label, value, isFilled }: {
  label: string
  value: string | null | undefined
  isFilled: boolean
  fieldName: string
}) {
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-accent transition-colors">
      <div className="flex items-center gap-2">
        {isFilled ? (
          <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
        ) : (
          <XCircle className="size-4 text-red-300 shrink-0" />
        )}
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <span className={`text-xs font-medium ${isFilled ? 'text-foreground' : 'text-red-400'}`}>
        {isFilled ? (value || '✓') : 'Non renseigné'}
      </span>
    </div>
  )
}
