'use client'

import { Star } from 'lucide-react'
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

export function Reviews() {
  const { user } = useAuthStore()

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold text-neutral-900">Mes avis</h1>
        <p className="text-neutral-500 mt-1">Vos évaluations et commentaires</p>
      </motion.div>

      {/* Stats Placeholder */}
      <motion.div variants={itemVariants}>
        <div className="grid grid-cols-2 gap-4">
          <Card className="border-neutral-200">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-neutral-300">0</p>
              <p className="text-xs text-neutral-500 mt-1">Avis donnés</p>
            </CardContent>
          </Card>
          <Card className="border-neutral-200">
            <CardContent className="p-4 text-center">
              <div className="flex justify-center gap-0.5 mb-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className="size-5 text-neutral-200" />
                ))}
              </div>
              <p className="text-xs text-neutral-500">Note moyenne</p>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* Empty State */}
      <motion.div variants={itemVariants}>
        <Card className="border-dashed border-neutral-300 bg-neutral-50/50">
          <CardContent className="py-12 flex flex-col items-center text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-amber-50 mb-4">
              <Star className="size-7 text-amber-400" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 mb-1">
              Vous n&apos;avez pas encore donné d&apos;avis
            </h3>
            <p className="text-sm text-neutral-500 mb-2 max-w-sm">
              {user?.firstName}, partagez votre expérience locative pour aider les autres locataires.
            </p>
            <p className="text-xs text-neutral-400 flex items-center gap-1.5 mt-2">
              <Star className="size-3" />
              Partagez votre expérience locative
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
