'use client'

import { motion } from 'framer-motion'
import { Shield, FileCheck, Clock, Star } from 'lucide-react'

interface Feature {
  icon: React.ElementType
  title: string
  description: string
}

const features: Feature[] = [
  {
    icon: Shield,
    title: 'Tiers de Confiance',
    description: 'Validation des identités et dossiers par un acteur indépendant',
  },
  {
    icon: FileCheck,
    title: 'Bail électronique',
    description: 'Signature par OTP SMS, contrat légal et sécurisé',
  },
  {
    icon: Clock,
    title: 'SLA 48h',
    description: 'Engagement de traitement sous 48 heures maximum',
  },
  {
    icon: Star,
    title: 'Notation croisée',
    description: 'Système de notation mutuelle locataire ↔ propriétaire',
  },
]

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
}

export function Trust() {
  return (
    <section className="py-16 sm:py-20 bg-brand-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12 sm:mb-16"
        >
          <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 mb-3">
            Pourquoi nous faire confiance ?
          </h2>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <motion.div
                key={feature.title}
                variants={cardVariants}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="bg-white rounded-xl border border-brand-100 p-6 text-center hover:shadow-md transition-shadow"
              >
                <div className="size-14 rounded-full bg-brand-100 flex items-center justify-center mx-auto mb-4">
                  <Icon className="size-7 text-brand-500" />
                </div>
                <h3 className="font-semibold text-neutral-900 text-base mb-2">
                  {feature.title}
                </h3>
                <p className="text-neutral-500 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}
