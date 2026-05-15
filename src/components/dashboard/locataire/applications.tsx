'use client'

import { UserCheck } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthStore } from '@/lib/auth-store'
import { motion } from 'framer-motion'

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

export function Applications() {
  const { user } = useAuthStore()

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold text-neutral-900">Mes Candidatures</h1>
        <p className="text-neutral-500 mt-1">Suivez vos candidatures de location</p>
      </motion.div>

      {/* Empty State */}
      <motion.div variants={itemVariants}>
        <Card className="border-dashed border-neutral-300 bg-neutral-50/50">
          <CardContent className="py-12 flex flex-col items-center text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-brand-50 mb-4">
              <UserCheck className="size-7 text-brand-500" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 mb-1">
              Aucune candidature en cours
            </h3>
            <p className="text-sm text-neutral-500 mb-2 max-w-sm">
              {user?.firstName}, postulez à un bien pour voir vos candidatures ici.
            </p>
            <p className="text-xs text-neutral-400 flex items-center gap-1.5 mt-2">
              <UserCheck className="size-3" />
              Postulez à un bien pour voir vos candidatures ici
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Info Card */}
      <motion.div variants={itemVariants}>
        <Card className="border-neutral-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-700 flex items-center gap-2">
              <UserCheck className="size-4 text-brand-500" />
              Comment ça marche ?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white text-xs font-bold">1</div>
              <p className="text-sm text-neutral-600">Trouvez un bien qui vous correspond</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white text-xs font-bold">2</div>
              <p className="text-sm text-neutral-600">Soumettez votre dossier de candidature</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white text-xs font-bold">3</div>
              <p className="text-sm text-neutral-600">Suivez l&apos;avancement en temps réel ici</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
