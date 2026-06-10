'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Home, Building2, Landmark, ShieldCheck, UserCog,
  Search, FileText, Calendar, CreditCard, Eye,
  CheckCircle2, ArrowRight, ArrowLeft, X, Star, Users,
  Key, Bell, MapPin, MousePointerClick, MessageSquare,
  Wrench, Scale, FileSignature, BarChart3, Sparkles,
  Heart, LogIn, Upload, Settings
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useAuthStore } from '@/lib/auth-store'

type OnboardingStep = {
  icon: React.ElementType
  title: string
  description: string
  color: string
  details: string[]
}

type RoleOnboarding = {
  role: string
  icon: React.ElementType
  label: string
  color: string
  steps: OnboardingStep[]
}

const roleConfigs: RoleOnboarding[] = [
  {
    role: 'LOCATAIRE',
    icon: Home,
    label: 'Locataire',
    color: 'from-brand-500 to-brand-700',
    steps: [
      {
        icon: Search,
        title: 'Recherchez votre futur logement',
        description: 'Parcourez les annonces, utilisez les filtres (ville, prix, type) et ajoutez vos biens préférés à vos favoris.',
        color: 'bg-brand-500',
        details: [
          'Filtrez par ville, prix, type de bien',
          'Vue carte interactive pour explorer',
          'Ajoutez des biens en favoris ❤️',
        ],
      },
      {
        icon: FileText,
        title: 'Créez votre dossier locatif',
        description: 'Soumettez vos documents (pièce d\'identité, justificatifs de revenus, garant) une seule fois pour postuler à plusieurs biens.',
        color: 'bg-brand-500',
        details: [
          'Documents d\'identité et justificatifs',
          'Ajoutez un garant si nécessaire',
          'Dossier vérifié par un Tiers de Confiance',
        ],
      },
      {
        icon: Calendar,
        title: 'Planifiez des visites',
        description: 'Demandez des visites pour les biens qui vous intéressent et gérez votre calendrier directement depuis votre tableau de bord.',
        color: 'bg-brand-500',
        details: [
          'Demande de visite en un clic',
          'Suivez le statut de vos demandes',
          'Donnez votre avis après la visite',
        ],
      },
      {
        icon: CreditCard,
        title: 'Payez votre loyer en ligne',
        description: 'Une fois votre bail signé, payez votre loyer mensuellement et suivez l\'historique de vos paiements.',
        color: 'bg-brand-500',
        details: [
          'Paiement sécurisé en ligne',
          'Historique complet des transactions',
          'Notifications en cas d\'échéance',
        ],
      },
      {
        icon: FileSignature,
        title: 'Signez en ligne',
        description: 'Signez vos baux électroniquement depuis votre tableau de bord, sans déplacement.',
        color: 'bg-brand-500',
        details: [
          'Signature électronique sécurisée',
          'Bail signé en quelques clics',
          'Consultation et téléchargement à tout moment',
        ],
      },
    ],
  },
  {
    role: 'PROPRIETAIRE',
    icon: Building2,
    label: 'Propriétaire',
    color: 'from-brand-500 to-brand-700',
    steps: [
      {
        icon: Upload,
        title: 'Publiez vos biens',
        description: 'Ajoutez vos propriétés avec photos, description et prix. Votre annonce sera vérifiée par un Tiers de Confiance avant publication.',
        color: 'bg-brand-500',
        details: [
          'Ajoutez photos et description détaillée',
          'Gérez la publication/dépublication',
          'Suivez le nombre de vues',
        ],
      },
      {
        icon: Users,
        title: 'Gérez les candidatures',
        description: 'Recevez et examinez les dossiers locatifs des candidats. Acceptez ou refusez en tout connaissance de cause.',
        color: 'bg-brand-500',
        details: [
          'Consultez les dossiers complets',
          'Acceptez ou refusez les candidats',
          'Générez et signez les baux en ligne',
        ],
      },
      {
        icon: Calendar,
        title: 'Organisez les visites',
        description: 'Gérez les demandes de visite, planifiez les créneaux et suivez l\'agenda de vos propriétés.',
        color: 'bg-brand-500',
        details: [
          'Recevez les demandes de visite',
          'Planifiez les créneaux disponibles',
          'Suivez l\'historique des visites',
        ],
      },
      {
        icon: BarChart3,
        title: 'Suivez vos finances',
        description: 'Visualisez vos revenus locatifs, suivez les impayés et consultez les analytiques de performance de vos biens.',
        color: 'bg-brand-500',
        details: [
          'Tableau de bord financier complet',
          'Suivi des loyers perçus et impayés',
          'Analytiques par propriété',
        ],
      },
    ],
  },
  {
    role: 'AGENCE',
    icon: Landmark,
    label: 'Agence',
    color: 'from-brand-500 to-brand-700',
    steps: [
      {
        icon: Users,
        title: 'Gérez votre équipe',
        description: 'Ajoutez des collaborateurs, définissez leurs rôles et permissions pour une gestion d\'équipe efficace.',
        color: 'bg-brand-500',
        details: [
          'Ajoutez des agents à votre agence',
          'Définissez les permissions',
          'Suivez l\'activité de votre équipe',
        ],
      },
      {
        icon: Building2,
        title: 'Gérez votre portefeuille',
        description: 'Administrez les biens sous mandat, publiez des annonces et suivez l\'état de chaque propriété.',
        color: 'bg-brand-500',
        details: [
          'Portefeuille de biens centralisé',
          'Publication d\'annonces multi-mandats',
          'Vue carte interactive',
        ],
      },
      {
        icon: FileSignature,
        title: 'Signez des mandats',
        description: 'Créez et gérez les mandats de gestion avec les propriétaires. Signature électronique incluse.',
        color: 'bg-brand-500',
        details: [
          'Création de mandats de gestion',
          'Signature électronique sécurisée',
          'Suivi des commissions',
        ],
      },
      {
        icon: BarChart3,
        title: 'Analysez votre performance',
        description: 'Consultez les analytiques détaillées : taux d\'occupation, revenus, performance par bien et rapports d\'activité.',
        color: 'bg-brand-500',
        details: [
          'Tableau de bord commercial',
          'Rapports d\'activité détaillés',
          'Suivi des commissions et revenus',
        ],
      },
    ],
  },
  {
    role: 'TIERS_CONFIANCE',
    icon: ShieldCheck,
    label: 'Tiers de Confiance',
    color: 'from-brand-500 to-brand-700',
    steps: [
      {
        icon: FileText,
        title: 'Validez les dossiers',
        description: 'Examinez et validez les dossiers locatifs et propriétaires. Assurez la conformité des documents soumis.',
        color: 'bg-brand-500',
        details: [
          'File d\'attente unifiée des dossiers',
          'Validation des documents d\'identité',
          'Ajout de commentaires et décisions',
        ],
      },
      {
        icon: Eye,
        title: 'Vérifiez les biens',
        description: 'Vérifiez les annonces de location, approuvez ou rejetez les mises en ligne et suivez la conformité.',
        color: 'bg-brand-500',
        details: [
          'Vérification des annonces publiées',
          'Approbation ou rejet motivé',
          'Dépublication des annonces problématiques',
        ],
      },
      {
        icon: Users,
        title: 'Gérez vos agents terrain',
        description: 'Créez et gérez des agents de vérification, assignez des missions et recevez leurs retours terrain.',
        color: 'bg-brand-500',
        details: [
          'Création d\'agents de vérification',
          'Assignation de missions',
          'Réception des feedbacks terrain',
        ],
      },
      {
        icon: Scale,
        title: 'Arbitrez les litiges',
        description: 'Gérez les litiges entre parties, surveillez les alertes de fraude et assurez l\'intégrité de la plateforme.',
        color: 'bg-brand-500',
        details: [
          'Arbitrage des litiges',
          'Alertes de fraude et signalements',
          'Vérification d\'identité ONECI',
        ],
      },
    ],
  },
  {
    role: 'ADMIN',
    icon: UserCog,
    label: 'Administrateur',
    color: 'from-brand-500 to-brand-700',
    steps: [
      {
        icon: Users,
        title: 'Gérez les utilisateurs',
        description: 'Administrez l\'ensemble des utilisateurs, modifiez les rôles, suspendez ou bannissez des comptes.',
        color: 'bg-brand-500',
        details: [
          'Liste complète des utilisateurs',
          'Modification des rôles',
          'Suspension et bannissement',
        ],
      },
      {
        icon: ShieldCheck,
        title: 'Supervisez les Tiers de Confiance',
        description: 'Supervisez l\'activité des TC, leurs indicateurs de performance et leur charge de travail.',
        color: 'bg-brand-500',
        details: [
          'Supervision des comptes TC',
          'Indicateurs de performance (SLA)',
          'Vue d\'ensemble de l\'activité',
        ],
      },
      {
        icon: Eye,
        title: 'Modérez les annonces',
        description: 'Modérez les annonces signalées, gérez les signalements et prenez des mesures appropriées.',
        color: 'bg-brand-500',
        details: [
          'Modération des annonces signalées',
          'Gestion des signalements utilisateurs',
          'Avertissements et bannissements',
        ],
      },
      {
        icon: Settings,
        title: 'Configurez la plateforme',
        description: 'Paramétrez la sécurité, les règles de validation, les notifications système et suivez la santé de la plateforme.',
        color: 'bg-brand-500',
        details: [
          'Configuration de la sécurité (IP, 2FA)',
          'Règles de validation et SLA',
          'Monitoring système et sauvegardes',
        ],
      },
    ],
  },
]

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 200 : -200,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -200 : 200,
    opacity: 0,
  }),
}

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0 },
}

export function OnboardingModal() {
  const { user, onboardingCompleted, setOnboardingCompleted } = useAuthStore()
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState(1)

  const config = useMemo(() => {
    if (!user) return null
    const role = user.activeRole || user.role
    return roleConfigs.find((c) => c.role === role) || roleConfigs[0]
  }, [user])

  const skip = useCallback(() => {
    setOnboardingCompleted(true)
  }, [setOnboardingCompleted])

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') skip()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [skip])

  if (!user || onboardingCompleted) return null
  if (!config) return null

  const totalSteps = config.steps.length + 1 // +1 for welcome step
  const isWelcomeStep = step === 0
  const isLastStep = step === totalSteps - 1
  const progressPercent = ((step + 1) / totalSteps) * 100

  const goNext = () => {
    if (isLastStep) {
      setOnboardingCompleted(true)
      return
    }
    setDirection(1)
    setStep((prev) => prev + 1)
  }

  const goPrev = () => {
    if (isWelcomeStep) return
    setDirection(-1)
    setStep((prev) => prev - 1)
  }

  const effectiveRole = user.activeRole || user.role
  const canSwitchRole = effectiveRole === 'LOCATAIRE' || effectiveRole === 'PROPRIETAIRE'

  const RoleIcon = config.icon
  const initials = `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      role="dialog"
      aria-modal="true"
      aria-label={`Présentation de l'espace ${config.label.toLowerCase()}`}
    >
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={skip}
      />

      {/* Modal */}
      <motion.div
        className="relative w-full max-w-lg bg-background rounded-2xl shadow-2xl border border-border overflow-hidden"
        variants={modalVariants}
        initial="hidden"
        animate="visible"
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        {/* Header gradient */}
        <div className={`bg-gradient-to-br ${config.color} p-6 sm:p-8 relative overflow-hidden`}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_60%)]" />
          <div className="relative z-10">
            {/* Close button */}
            <button
              onClick={skip}
              className="absolute top-0 right-0 p-2 text-white/70 hover:text-white transition-colors"
              aria-label="Fermer"
            >
              <X className="size-5" />
            </button>

            {/* Role badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-medium backdrop-blur-sm mb-3">
              <RoleIcon className="size-3.5" />
              {config.label}
            </div>

            {/* Avatar + name */}
            <div className="flex items-center gap-4">
              <Avatar className="size-14 ring-2 ring-white/30 ring-offset-2 ring-offset-transparent">
                <AvatarFallback className="bg-white/20 text-white text-lg font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <h2 className="text-xl sm:text-2xl font-bold text-white">
                  {isWelcomeStep ? `Bienvenue, ${user.firstName} !` : config.steps[step - 1]?.title}
                </h2>
                <p className="text-sm text-white/80 mt-0.5">
                  {isWelcomeStep
                    ? `Découvrons ensemble votre espace ${config.label.toLowerCase()}`
                    : config.steps[step - 1]?.description}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8">
          <AnimatePresence mode="wait" custom={direction}>
            {isWelcomeStep ? (
              <motion.div
                key="welcome"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="space-y-5"
              >
                <div className="text-center">
                  <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-brand-50 mb-4">
                    <Sparkles className="size-8 text-brand-500" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">
                    Prêt à commencer l&apos;aventure ?
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Voici un rapide tour d&apos;horizon des fonctionnalités clés de votre espace{' '}
                    <strong className="text-foreground">{config.label.toLowerCase()}</strong>.
                    Cela ne prendra qu&apos;une minute.
                  </p>
                </div>

                {/* Quick highlights */}
                <div className="grid grid-cols-2 gap-3">
                  {config.steps.slice(0, 5).map((s, i) => {
                    const Icon = s.icon
                    return (
                      <div
                        key={i}
                        className="flex items-start gap-3 p-3 rounded-xl bg-muted/60 border border-border/50"
                      >
                        <div className="flex items-center justify-center size-9 rounded-lg bg-brand-500/10 shrink-0">
                          <Icon className="size-4 text-brand-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground">{s.title.split(' ').slice(0, 2).join(' ')}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{s.details[0]}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {canSwitchRole && (
                  <div className="p-3 rounded-xl bg-brand-50 border border-brand-200">
                    <div className="flex items-start gap-2.5">
                      <ArrowRight className="size-4 text-brand-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-brand-800">
                        <strong>Bon à savoir :</strong> Vous pouvez basculer entre vos rôles{' '}
                        {effectiveRole === 'LOCATAIRE' ? 'Locataire et Propriétaire' : 'Propriétaire et Locataire'}{' '}
                        depuis le menu utilisateur en haut à droite.
                      </p>
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key={`step-${step}`}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="space-y-4"
              >
                {/* Feature icon */}
                {(() => {
                  const s = config.steps[step - 1]
                  const Icon = s.icon
                  return (
                    <div className="flex items-center justify-center">
                      <div className="flex items-center justify-center size-16 rounded-2xl bg-brand-500/10">
                        <Icon className="size-8 text-brand-500" />
                      </div>
                    </div>
                  )
                })()}

                <h3 className="text-lg font-bold text-foreground text-center">
                  {config.steps[step - 1]?.title}
                </h3>
                <p className="text-sm text-muted-foreground text-center leading-relaxed">
                  {config.steps[step - 1]?.description}
                </p>

                {/* Details list */}
                <div className="space-y-2 mt-2">
                  {config.steps[step - 1]?.details.map((detail, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-muted/60 border border-border/50">
                      <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span className="text-sm text-foreground">{detail}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-6 sm:px-8 pb-6 sm:pb-8">
          {/* Progress bar */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-700"
                initial={false}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
              />
            </div>
            <span className="text-xs text-muted-foreground font-medium tabular-nums shrink-0">
              {step + 1}/{totalSteps}
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-3">
            <div>
              {!isWelcomeStep && (
                <Button variant="ghost" size="sm" onClick={goPrev} className="text-muted-foreground gap-1">
                  <ArrowLeft className="size-4" />
                  Retour
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={skip} className="text-muted-foreground">
                Passer
              </Button>

              <Button
                onClick={goNext}
                className="gap-1.5"
              >
                {isLastStep ? (
                  <>
                    <CheckCircle2 className="size-4" />
                    C&apos;est parti !
                  </>
                ) : (
                  <>
                    Suivant
                    <ArrowRight className="size-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
