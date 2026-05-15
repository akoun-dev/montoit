'use client'

import { Heart } from 'lucide-react'
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

export function Favorites() {
  const { user } = useAuthStore()

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold text-neutral-900">Mes favoris</h1>
        <p className="text-neutral-500 mt-1">Les biens que vous avez sauvegardés</p>
      </motion.div>

      {/* Empty State */}
      <motion.div variants={itemVariants}>
        <Card className="border-dashed border-neutral-300 bg-neutral-50/50">
          <CardContent className="py-12 flex flex-col items-center text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-red-50 mb-4">
              <Heart className="size-7 text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 mb-1">
              Vous n&apos;avez pas encore de favoris
            </h3>
            <p className="text-sm text-neutral-500 mb-2 max-w-sm">
              {user?.firstName}, commencez à sauvegarder les biens qui vous plaisent.
            </p>
            <p className="text-xs text-neutral-400 flex items-center gap-1.5 mt-2">
              <Heart className="size-3" />
              Cliquez sur le cœur d&apos;un bien pour l&apos;ajouter
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Hint Card */}
      <motion.div variants={itemVariants}>
        <Card className="border-brand-200 bg-brand-50/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-brand-600 flex items-center gap-2">
              <Heart className="size-4" />
              Astuce
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-neutral-600">
              Retrouvez facilement les logements qui vous intéressent en les ajoutant à vos favoris. Ils seront accessibles à tout moment depuis cette section.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
