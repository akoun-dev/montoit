'use client'

import { motion } from 'framer-motion'
import { Target, Eye, Shield, Scale, Clock, Heart, Building2 } from 'lucide-react'

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: 'easeOut' },
  }),
}

const missionVision = [
  {
    icon: Target,
    title: 'Notre Mission',
    description:
      "Faciliter l'accès au logement en toute confiance grâce à la validation par un Tiers de Confiance indépendant. Nous connectons locataires et propriétaires dans un cadre sécurisé et transparent.",
  },
  {
    icon: Eye,
    title: 'Notre Vision',
    description:
      "Devenir la référence de la location immobilière en Afrique de l'Ouest, en garantissant la confiance et la sécurité pour chaque transaction locative.",
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

const keyFigures = [
  { value: '1 204+', label: 'Biens disponibles' },
  { value: '4 872+', label: 'Utilisateurs inscrits' },
  { value: '98%', label: 'Taux de satisfaction' },
  { value: '48h', label: 'Délai maximum de validation' },
]

export function About() {
  return (
    <section className="py-16 sm:py-20 bg-neutral-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Hero sub-section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12 sm:mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-neutral-900 mb-3">
            À Propos de Mon Toit
          </h2>
          <p className="text-lg text-neutral-500 max-w-2xl mx-auto">
            La plateforme de confiance pour la location immobilière en Côte d&apos;Ivoire
          </p>
        </motion.div>

        {/* Mission & Vision */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12 sm:mb-16">
          {missionVision.map((item, i) => {
            const Icon = item.icon
            return (
              <motion.div
                key={item.title}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="bg-white rounded-xl border border-neutral-200 p-6 sm:p-8 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="size-12 rounded-lg bg-brand-50 flex items-center justify-center mb-4">
                  <Icon className="size-6 text-brand-500" />
                </div>
                <h3 className="text-xl font-bold text-neutral-900 mb-3">
                  {item.title}
                </h3>
                <p className="text-neutral-600 leading-relaxed">
                  {item.description}
                </p>
              </motion.div>
            )
          })}
        </div>

        {/* Values */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-12 sm:mb-16"
        >
          <h3 className="text-2xl font-bold text-neutral-900 text-center mb-8">
            Nos Valeurs
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {values.map((value, i) => {
              const Icon = value.icon
              return (
                <motion.div
                  key={value.title}
                  custom={i}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  className="bg-white rounded-xl border border-neutral-200 p-5 text-center shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="size-12 rounded-full bg-brand-50 flex items-center justify-center mx-auto mb-4">
                    <Icon className="size-5 text-brand-500" />
                  </div>
                  <h4 className="font-bold text-neutral-900 mb-2">{value.title}</h4>
                  <p className="text-sm text-neutral-500 leading-relaxed">
                    {value.description}
                  </p>
                </motion.div>
              )
            })}
          </div>
        </motion.div>

        {/* Key Figures */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-12 sm:mb-16"
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {keyFigures.map((figure, i) => (
              <motion.div
                key={figure.label}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="bg-white rounded-xl border border-neutral-200 p-5 text-center shadow-sm"
              >
                <p className="text-2xl sm:text-3xl font-bold text-brand-500 mb-1">
                  {figure.value}
                </p>
                <p className="text-sm text-neutral-500">{figure.label}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* ANSUT subsection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-xl border border-neutral-200 p-6 sm:p-8 text-center shadow-sm"
        >
          <div className="size-16 rounded-full bg-brand-50 flex items-center justify-center mx-auto mb-5">
            <Building2 className="size-8 text-brand-500" />
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-neutral-900 mb-3">
            Un projet ANSUT
          </h3>
          <p className="text-neutral-600 leading-relaxed max-w-2xl mx-auto">
            Mon Toit est une initiative de l&apos;ANSUT (Agence Nationale Urbaine des Transferts),
            dédiée à l&apos;amélioration du secteur locatif en Côte d&apos;Ivoire. Notre engagement :
            un cadre locatif moderne, sûr et régulé.
          </p>
        </motion.div>
      </div>
    </section>
  )
}
