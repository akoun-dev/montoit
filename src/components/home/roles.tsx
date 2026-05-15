'use client'

import { motion } from 'framer-motion'
import { Home, Building2, ShieldCheck, Settings, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Role {
  title: string
  description: string
  icon: React.ElementType
  cta: string
}

const roles: Role[] = [
  {
    title: 'Locataire',
    description:
      'Trouvez votre logement idéal, créez votre dossier locatif et signez votre bail en ligne',
    icon: Home,
    cta: 'Je cherche un logement',
  },
  {
    title: 'Propriétaire',
    description:
      'Publiez vos annonces, recevez des dossiers validés et gérez vos biens locatifs',
    icon: Building2,
    cta: 'Je publie une annonce',
  },
  {
    title: 'Tiers de Confiance',
    description:
      'Validez les identités, dossiers et titres de propriété pour garantir la confiance',
    icon: ShieldCheck,
    cta: 'Devenir validateur',
  },
  {
    title: 'Administration',
    description:
      'Supervisez la plateforme, modérez les contenus et accédez aux rapports',
    icon: Settings,
    cta: 'Accès administration',
  },
]

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
    },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
}

function RoleCard({ role }: { role: Role }) {
  const Icon = role.icon
  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="bg-white rounded-xl border border-neutral-200 p-6 sm:p-7 flex flex-col hover:shadow-md transition-shadow"
    >
      <div className="size-12 rounded-lg bg-brand-50 flex items-center justify-center mb-4">
        <Icon className="size-6 text-brand-500" />
      </div>
      <h3 className="text-lg font-semibold text-neutral-900 mb-2">{role.title}</h3>
      <p className="text-neutral-500 text-sm leading-relaxed mb-5 flex-1">
        {role.description}
      </p>
      <Button
        variant="outline"
        size="sm"
        className="w-full text-brand-500 border-brand-200 hover:bg-brand-50 hover:text-brand-600 hover:border-brand-300"
      >
        {role.cta}
        <ArrowRight className="size-3.5 ml-1" />
      </Button>
    </motion.div>
  )
}

export function Roles() {
  return (
    <section className="py-16 sm:py-20 bg-white">
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
            Rejoignez Mon Toit
          </h2>
          <p className="text-neutral-500 text-base sm:text-lg max-w-xl mx-auto">
            Une plateforme pour chaque acteur de la location
          </p>
        </motion.div>

        {/* Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-6"
        >
          {roles.map((role) => (
            <RoleCard key={role.title} role={role} />
          ))}
        </motion.div>
      </div>
    </section>
  )
}
