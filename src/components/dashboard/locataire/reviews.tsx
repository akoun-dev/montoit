'use client'

import { useState, useEffect, useCallback } from 'react'
import { Star, User } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { motion, AnimatePresence } from 'framer-motion'

// ─── Types ──────────────────────────────────────────────────────────────────
interface RatingItem {
  id: string
  score: number
  comment: string | null
  createdAt: string
  lease: {
    id: string
    startDate: string
    endDate: string
    property: {
      id: string
      title: string
      address: string
      city: string
    }
  }
  toUser?: {
    id: string
    firstName: string
    lastName: string
    avatarUrl: string | null
  }
  fromUser?: {
    id: string
    firstName: string
    lastName: string
    avatarUrl: string | null
  }
}

interface ReviewsResponse {
  data: {
    given: RatingItem[]
    received: RatingItem[]
  }
  stats: {
    givenCount: number
    receivedCount: number
    averageScoreReceived: number
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function StarsDisplay({ score, size = 'sm' }: { score: number; size?: 'sm' | 'lg' }) {
  const s = size === 'lg' ? 'size-5' : 'size-3.5'
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`${s} ${i <= score ? 'fill-amber-400 text-amber-400' : 'text-neutral-200'}`}
        />
      ))}
    </div>
  )
}

// ─── Animation Variants ────────────────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

type TabType = 'given' | 'received'

export function Reviews() {
  const { user, isAuthenticated } = useAuthStore()
  const [ratingsGiven, setRatingsGiven] = useState<RatingItem[]>([])
  const [ratingsReceived, setRatingsReceived] = useState<RatingItem[]>([])
  const [stats, setStats] = useState<ReviewsResponse['stats'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('given')

  const fetchReviews = useCallback(async () => {
    if (!isAuthenticated) { setLoading(false); return }
    try {
      const result = await authFetch<ReviewsResponse>('/api/reviews')
      setRatingsGiven(result.data?.given ?? [])
      setRatingsReceived(result.data?.received ?? [])
      setStats(result.stats ?? null)
    } catch (err) {
      if (err instanceof AuthError && err.status === 401) { setRatingsGiven([]); setRatingsReceived([]); return }
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
      setRatingsGiven([])
      setRatingsReceived([])
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => { fetchReviews() }, [fetchReviews])

  const activeRatings = activeTab === 'given' ? ratingsGiven : ratingsReceived

  // ─── Loading skeleton ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-8 w-32 bg-neutral-100 animate-pulse rounded" />
          <div className="h-4 w-56 bg-neutral-100 animate-pulse rounded mt-2" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-neutral-100 animate-pulse" />
          ))}
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-xl bg-neutral-100 animate-pulse" />
        ))}
      </div>
    )
  }

  // ─── Error state ───────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-neutral-900">Mes avis</h1>
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <p className="text-sm text-amber-700">Impossible de charger vos avis. Veuillez réessayer.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold text-neutral-900">Mes avis</h1>
        <p className="text-neutral-500 mt-1">Vos évaluations et commentaires</p>
      </motion.div>

      {/* Stats Cards */}
      <motion.div variants={itemVariants}>
        <div className="grid grid-cols-2 gap-4">
          <Card className="border-neutral-200">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-neutral-900">{stats?.givenCount ?? 0}</p>
              <p className="text-xs text-neutral-500 mt-1">Avis donnés</p>
            </CardContent>
          </Card>
          <Card className="border-neutral-200">
            <CardContent className="p-4 text-center">
              <div className="flex justify-center mb-1">
                <StarsDisplay score={Math.round(stats?.averageScoreReceived ?? 0)} size="lg" />
              </div>
              <p className="text-2xl font-bold text-neutral-900">
                {stats?.averageScoreReceived ? stats.averageScoreReceived.toFixed(1) : '—'}
              </p>
              <p className="text-xs text-neutral-500 mt-1">
                Note moyenne ({stats?.receivedCount ?? 0} avis reçu{stats?.receivedCount !== 1 ? 's' : ''})
              </p>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* Tab Toggle */}
      <motion.div variants={itemVariants}>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('given')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'given'
                ? 'bg-brand-500 text-white'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            Avis donnés ({stats?.givenCount ?? 0})
          </button>
          <button
            onClick={() => setActiveTab('received')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'received'
                ? 'bg-brand-500 text-white'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            Avis reçus ({stats?.receivedCount ?? 0})
          </button>
        </div>
      </motion.div>

      {/* Ratings List */}
      <AnimatePresence mode="wait">
        {activeRatings.length === 0 ? (
          /* Empty State */
          <motion.div key="empty" variants={itemVariants} initial="hidden" animate="show" exit="hidden">
            <Card className="border-dashed border-neutral-300 bg-neutral-50/50">
              <CardContent className="py-12 flex flex-col items-center text-center">
                <div className="flex size-16 items-center justify-center rounded-full bg-amber-50 mb-4">
                  <Star className="size-7 text-amber-400" />
                </div>
                <h3 className="text-lg font-semibold text-neutral-900 mb-1">
                  {activeTab === 'given'
                    ? "Vous n'avez pas encore donné d'avis"
                    : "Vous n'avez pas encore reçu d'avis"}
                </h3>
                <p className="text-sm text-neutral-500 max-w-sm">
                  {activeTab === 'given'
                    ? `${user?.firstName}, partagez votre expérience locative pour aider les autres locataires.`
                    : 'Les propriétaires vous évalueront après vos locations.'}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div key={activeTab} variants={containerVariants} initial="hidden" animate="show" className="space-y-3">
            {activeRatings.map((rating) => {
              const otherUser = activeTab === 'given' ? rating.toUser : rating.fromUser
              const property = rating.lease?.property

              return (
                <motion.div key={rating.id} variants={itemVariants}>
                  <Card className="border-neutral-200">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        {/* Avatar */}
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-50">
                          {otherUser?.avatarUrl ? (
                            <img src={otherUser.avatarUrl} alt="" className="size-10 rounded-full object-cover" />
                          ) : (
                            <User className="size-5 text-brand-500" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <p className="text-sm font-semibold text-neutral-900 truncate">
                              {otherUser ? `${otherUser.firstName} ${otherUser.lastName}` : 'Utilisateur'}
                            </p>
                            <span className="text-xs text-neutral-400 shrink-0">{formatDate(rating.createdAt)}</span>
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <StarsDisplay score={rating.score} />
                            <span className="text-xs font-medium text-neutral-500">{rating.score}/5</span>
                          </div>
                          {rating.comment && (
                            <p className="text-sm text-neutral-600 line-clamp-3 mb-1">
                              &ldquo;{rating.comment}&rdquo;
                            </p>
                          )}
                          {property && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-neutral-200 text-neutral-500">
                              {property.title} — {property.city}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
