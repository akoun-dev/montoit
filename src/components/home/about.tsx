'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import type { Variants } from 'framer-motion'
import {
  Target,
  Eye,
  Shield,
  Scale,
  Clock,
  Heart,
  Building2,
  Users,
  CheckCircle2,
  Globe,
  Award,
  ChevronDown,
  Home,
  Smartphone,
  Sparkles,
  FileCheck,
  Landmark,
  ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/lib/auth-store'
import { apiFetch } from '@/lib/capacitor'

// ─── Animation variants ────────────────────────────────────────────────────

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: 'easeOut' },
  }),
}

const staggerContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
    },
  },
}

// ─── Animated Counter ──────────────────────────────────────────────────────

function AnimatedCounter({
  end,
  suffix = '',
  duration = 2000,
}: {
  end: number
  suffix?: string
  duration?: number
}) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true })

  useEffect(() => {
    if (!isInView) return

    let startTime: number | null = null
    let frameId: number

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.floor(eased * end))
      if (progress < 1) {
        frameId = requestAnimationFrame(step)
      }
    }
    frameId = requestAnimationFrame(step)

    return () => {
      if (frameId) cancelAnimationFrame(frameId)
    }
  }, [isInView, end, duration])

  return (
    <span ref={ref}>
      {count.toLocaleString('fr-FR')}{suffix}
    </span>
  )
}

// ─── Data ──────────────────────────────────────────────────────────────────

const storyTimeline = [
  {
    year: '2023',
    title: 'Naissance du projet',
    description:
      "L'ANSUT lance le projet Mon Toit avec l'ambition de révolutionner le marché locatif ivoirien grâce à la technologie.",
    icon: Sparkles,
  },
  {
    year: '2024',
    title: 'Lancement de la plateforme',
    description:
      'La plateforme ouvre ses portes avec un réseau de Tiers de Confiance agréés pour valider chaque dossier locatif.',
    icon: Globe,
  },
  {
    year: '2025',
    title: 'Innovation & Expansion',
    description:
      "Signature électronique des baux par OTP, vérification biométrique NeoFace, et déploiement à l'échelle nationale.",
    icon: Award,
  },
]

const values = [
  {
    icon: Shield,
    title: 'Confiance',
    description:
      "Validation par Tiers de Confiance indépendant pour garantir l'authenticité de chaque dossier et titre de propriété.",
  },
  {
    icon: Scale,
    title: 'Transparence',
    description:
      'Processus clair et traçable à chaque étape, du dossier locatif à la signature du bail.',
  },
  {
    icon: Clock,
    title: 'Efficacité',
    description:
      "Engagement de traitement sous 48h maximum. Pas de délais interminables, votre temps est précieux.",
  },
  {
    icon: Heart,
    title: 'Accessibilité',
    description:
      'Une plateforme inclusive, accessible à tous, du studio étudiant à la villa familiale.',
  },
]

interface StatsData {
  totalProperties: number
  totalUsers: number
  satisfactionRate: number | null
}

const trustPoints = [
  {
    icon: Landmark,
    title: 'Porté par l\'ANSUT',
    description:
      'Une initiative de l\'Agence Nationale du Service Universel des Télécommunications, garante de la confiance numérique en Côte d\'Ivoire.',
  },
  {
    icon: FileCheck,
    title: 'Bail électronique sécurisé',
    description:
      'Signature par OTP SMS avec valeur légale — plus besoin de déplacement, votre bail est signé en quelques secondes.',
  },
  {
    icon: Smartphone,
    title: 'Vérification biométrique',
    description:
      'NeoFace Reconnaissance faciale et vérification OneCi pour garantir l\'identité de chaque utilisateur de la plateforme.',
  },
  {
    icon: Home,
    title: 'Couverture nationale',
    description:
      'Des biens disponibles dans toutes les communes d\'Abidjan et bientôt dans toute la Côte d\'Ivoire.',
  },
]

// ─── Components ────────────────────────────────────────────────────────────

function MissionVisionSection() {
  return (
    <section className="py-20 sm:py-24 bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Notre Raison d&apos;Être
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Transformer le marché locatif ivoirien en rendant la location simple, sécurisée
            et accessible pour tous.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Mission */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="group relative bg-card rounded-2xl border border-border p-8 sm:p-10 shadow-sm hover:shadow-lg transition-all duration-300"
          >
            {/* Accent bar */}
            <div className="absolute top-0 left-8 right-8 h-1 bg-gradient-to-r from-brand-500 to-brand-300 rounded-b-full opacity-80" />

            <div className="size-14 rounded-xl bg-brand-50 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
              <Target className="size-7 text-brand-500" />
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-4">
              Notre Mission
            </h3>
            <p className="text-muted-foreground leading-relaxed text-base">
              Faciliter l&apos;accès au logement en toute confiance grâce à la validation
              par un Tiers de Confiance indépendant. Nous connectons locataires et
              propriétaires dans un cadre sécurisé et transparent, où chaque partie
              est protégée à chaque étape du processus.
            </p>
            <div className="mt-6 pt-5 border-t border-border">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-500" />
                <span className="text-sm text-muted-foreground">
                  Plus de 4 800 utilisateurs nous font confiance
                </span>
              </div>
            </div>
          </motion.div>

          {/* Vision */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="group relative bg-card rounded-2xl border border-border p-8 sm:p-10 shadow-sm hover:shadow-lg transition-all duration-300"
          >
            {/* Accent bar */}
            <div className="absolute top-0 left-8 right-8 h-1 bg-gradient-to-r from-brand-400 to-brand-200 rounded-b-full opacity-80" />

            <div className="size-14 rounded-xl bg-brand-50 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
              <Eye className="size-7 text-brand-500" />
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-4">
              Notre Vision
            </h3>
            <p className="text-muted-foreground leading-relaxed text-base">
              Devenir la référence de la location immobilière en Afrique de l&apos;Ouest,
              en garantissant la confiance et la sécurité pour chaque transaction
              locative. Un marché où chaque locataire trouve le logement qui lui
              correspond, et chaque propriétaire loue en toute sérénité.
            </p>
            <div className="mt-6 pt-5 border-t border-border">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-500" />
                <span className="text-sm text-muted-foreground">
                  Engagement de traitement sous 48h
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

function StatsSection({ stats }: { stats: StatsData | null }) {
  const items = [
    { value: stats?.totalProperties ?? 0, suffix: '+', label: 'Biens disponibles', icon: Building2, showAnimated: true },
    { value: stats?.totalUsers ?? 0, suffix: '+', label: 'Utilisateurs inscrits', icon: Users, showAnimated: true },
    { value: stats?.satisfactionRate, suffix: '%', label: 'Taux de satisfaction', icon: Award, showAnimated: false },
    { value: 48, suffix: 'h', label: 'Délai max de validation', icon: Clock, showAnimated: true },
  ]

  return (
    <section className="py-16 sm:py-20 bg-muted">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
            Mon Toit en Chiffres
          </h2>
          <p className="text-muted-foreground text-base max-w-xl mx-auto">
            Des résultats concrets qui témoignent de notre impact sur le marché locatif ivoirien
          </p>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {items.map((item, i) => {
            const Icon = item.icon
            return (
              <motion.div
                key={item.label}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="group relative bg-card rounded-xl border border-border p-6 sm:p-8 text-center shadow-sm hover:shadow-md transition-all duration-300"
              >
                {/* Hover gradient */}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-b from-brand-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                {/* Icon */}
                <div className="relative size-12 rounded-xl bg-brand-50 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Icon className="size-6 text-brand-500" />
                </div>

                {/* Animated value */}
                <p className="relative text-3xl sm:text-4xl font-bold text-brand-500 mb-1 tabular-nums">
                  {item.showAnimated ? (
                    <AnimatedCounter end={item.value as number} suffix={item.suffix} />
                  ) : (
                    <span>
                      {item.value != null ? `${item.value}${item.suffix}` : '—'}
                    </span>
                  )}
                </p>

                {/* Label */}
                <p className="relative text-sm text-muted-foreground">
                  {item.label}
                </p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function ValuesSection() {
  return (
    <section className="py-20 sm:py-24 bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Nos Valeurs Fondatrices
          </h2>
          <p className="text-muted-foreground text-base max-w-xl mx-auto">
            Les principes qui guident chacune de nos actions au quotidien
          </p>
        </motion.div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {values.map((value, i) => {
            const Icon = value.icon
            return (
              <motion.div
                key={value.title}
                variants={fadeUp}
                className="group relative bg-card rounded-xl border border-border p-6 sm:p-7 text-center hover:shadow-lg transition-all duration-300"
              >
                {/* Top accent */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-brand-500 rounded-b-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                <div className="size-14 rounded-full bg-brand-50 flex items-center justify-center mx-auto mb-5 group-hover:scale-110 group-hover:bg-brand-100 transition-all duration-300">
                  <Icon className="size-6 text-brand-500" />
                </div>
                <h4 className="text-lg font-bold text-foreground mb-3">
                  {value.title}
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {value.description}
                </p>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}

function StorySection() {
  return (
    <section className="py-20 sm:py-24 bg-muted">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Notre Histoire
          </h2>
          <p className="text-muted-foreground text-base max-w-xl mx-auto">
            Comment Mon Toit est devenu la référence de la location immobilière en Côte d&apos;Ivoire
          </p>
        </motion.div>

        <div className="relative max-w-3xl mx-auto">
          {/* Timeline line */}
          <div className="absolute left-8 top-0 bottom-0 w-px bg-gradient-to-b from-brand-500 via-brand-300 to-transparent hidden sm:block" />

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            className="space-y-10"
          >
            {storyTimeline.map((event, i) => {
              const Icon = event.icon
              const isLast = i === storyTimeline.length - 1
              return (
                <motion.div
                  key={event.year}
                  variants={fadeUp}
                  className="relative pl-0 sm:pl-20"
                >
                  {/* Timeline dot */}
                  <div className="hidden sm:flex absolute left-[26px] top-1 -translate-x-1/2 size-10 rounded-full bg-card border-2 border-brand-500 items-center justify-center z-10 shadow-md">
                    <Icon className="size-4 text-brand-500" />
                  </div>

                  {/* Content card */}
                  <div className="bg-card rounded-xl border border-border p-6 sm:p-8 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-3">
                      {/* Mobile icon */}
                      <span className="sm:hidden size-9 rounded-lg bg-brand-50 flex items-center justify-center">
                        <Icon className="size-4 text-brand-500" />
                      </span>
                      <span className="inline-flex items-center px-3 py-1 rounded-full bg-brand-50 border border-brand-100 text-brand-600 text-xs font-bold">
                        {event.year}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-foreground mb-2">
                      {event.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {event.description}
                    </p>
                  </div>

                  {/* Connector dot (mobile) */}
                  {!isLast && (
                    <div className="sm:hidden flex justify-center pt-2">
                      <ChevronDown className="size-5 text-muted-foreground/40" />
                    </div>
                  )}
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      </div>
    </section>
  )
}

function TrustSection() {
  return (
    <section className="py-20 sm:py-24 bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Pourquoi Nous Faire Confiance ?
          </h2>
          <p className="text-muted-foreground text-base max-w-xl mx-auto">
            Des garanties solides pour des transactions locatives sereines
          </p>
        </motion.div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-6"
        >
          {trustPoints.map((point, i) => {
            const Icon = point.icon
            return (
              <motion.div
                key={point.title}
                variants={fadeUp}
                className="group relative bg-card rounded-xl border border-border p-6 sm:p-8 flex items-start gap-5 hover:shadow-lg transition-all duration-300"
              >
                {/* Left accent border */}
                <div className="absolute left-0 top-4 bottom-4 w-1 bg-brand-500 rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                <div className="size-12 rounded-xl bg-brand-50 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-110 transition-transform duration-300">
                  <Icon className="size-6 text-brand-500" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-2">
                    {point.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {point.description}
                  </p>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}

function CTASection() {
  const { setView } = useAuthStore()

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-brand-600 to-brand-800">
      {/* Decorative circles */}
      <div className="absolute top-0 right-0 size-[400px] rounded-full bg-white/5 blur-3xl translate-x-1/3 -translate-y-1/3" />
      <div className="absolute bottom-0 left-0 size-[300px] rounded-full bg-white/5 blur-3xl -translate-x-1/3 translate-y-1/3" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-2xl mx-auto"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Rejoignez l&apos;Aventure Mon Toit
          </h2>
          <p className="text-lg text-white/80 mb-8 leading-relaxed">
            Que vous soyez locataire, propriétaire ou agence, créez votre compte
            gratuitement et faites partie de la communauté de confiance.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              size="lg"
              onClick={() => setView('register')}
              className="bg-white text-brand-600 hover:bg-white/90 font-semibold h-12 px-8 shadow-lg shadow-black/10"
            >
              Créer un compte gratuit
              <ArrowRight className="size-4 ml-2" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => setView('login')}
              className="border-white/30 text-white hover:bg-white/10 hover:border-white/50 h-12 px-8"
            >
              J&apos;ai déjà un compte
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

// ─── Main About component ──────────────────────────────────────────────────

export function About() {
  const [stats, setStats] = useState<StatsData | null>(null)

  useEffect(() => {
    apiFetch('/api/stats')
      .then((res) => res.json())
      .then((data) => setStats(data))
      .catch(() => console.error('Failed to fetch stats'))
  }, [])

  return (
    <>
      <MissionVisionSection />
      <StatsSection stats={stats} />
      <ValuesSection />
      <StorySection />
      <TrustSection />
      <CTASection />
    </>
  )
}
