'use client'

import { motion } from 'framer-motion'
import { UserPlus, Search, FileSignature } from 'lucide-react'

const steps = [
  {
    number: 1,
    title: 'Créez votre profil',
    description:
      'Inscrivez-vous et complétez votre dossier locatif avec vos pièces justificatives',
    icon: UserPlus,
  },
  {
    number: 2,
    title: 'Trouvez votre bien',
    description:
      'Parcourez les annonces, demandez des visites et soumettez votre dossier',
    icon: Search,
  },
  {
    number: 3,
    title: 'Signez en ligne',
    description:
      'Signez votre bail électroniquement et emménagez en toute sérénité',
    icon: FileSignature,
  },
]

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.2,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' as const },
  },
} as const

export function HowItWorks() {
  return (
    <section className="py-16 sm:py-20 bg-muted">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12 sm:mb-16"
        >
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
            Comment ça marche ?
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto">
            Trouvez votre logement en 3 étapes simples
          </p>
        </motion.div>

        {/* Steps */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6 relative"
        >
          {/* Connecting lines (desktop only) — top-8 = 32px = centre vertical des cercles size-16 (64px) */}
          <div className="hidden md:block absolute top-8 left-[calc(16.67%+2rem)] right-[calc(16.67%+2rem)] h-0.5">
            <div className="w-full border-t-2 border-dashed border-brand-200" />
          </div>

          {steps.map((step) => {
            const Icon = step.icon
            return (
              <motion.div
                key={step.number}
                variants={itemVariants}
                className="flex flex-col items-center text-center relative"
              >
                {/* Number circle */}
                <div className="relative z-10 size-16 rounded-full bg-brand-500 flex items-center justify-center mb-5 shadow-lg shadow-brand-500/20">
                  <Icon className="size-7 text-white" />
                  <span className="absolute -top-1 -right-1 size-6 rounded-full bg-card border-2 border-brand-500 flex items-center justify-center text-xs font-bold text-brand-500">
                    {step.number}
                  </span>
                </div>

                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {step.title}
                </h3>
                <p className="text-muted-foreground text-sm max-w-xs leading-relaxed">
                  {step.description}
                </p>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}
