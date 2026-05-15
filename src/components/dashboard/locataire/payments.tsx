'use client'

import { CreditCard } from 'lucide-react'
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

export function Payments() {
  const { user } = useAuthStore()

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold text-neutral-900">Mes Paiements</h1>
        <p className="text-neutral-500 mt-1">Historique et suivi de vos paiements</p>
      </motion.div>

      {/* Summary Placeholder */}
      <motion.div variants={itemVariants}>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="border-neutral-200">
            <CardContent className="p-4">
              <p className="text-xs text-neutral-500 mb-1">Prochain paiement</p>
              <p className="text-xl font-bold text-neutral-300">—</p>
            </CardContent>
          </Card>
          <Card className="border-neutral-200">
            <CardContent className="p-4">
              <p className="text-xs text-neutral-500 mb-1">Total payé</p>
              <p className="text-xl font-bold text-neutral-300">—</p>
            </CardContent>
          </Card>
          <Card className="border-neutral-200 col-span-2 lg:col-span-1">
            <CardContent className="p-4">
              <p className="text-xs text-neutral-500 mb-1">Paiements en retard</p>
              <p className="text-xl font-bold text-neutral-300">—</p>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* Empty State */}
      <motion.div variants={itemVariants}>
        <Card className="border-dashed border-neutral-300 bg-neutral-50/50">
          <CardContent className="py-12 flex flex-col items-center text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-brand-50 mb-4">
              <CreditCard className="size-7 text-brand-500" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 mb-1">
              Aucun paiement enregistré
            </h3>
            <p className="text-sm text-neutral-500 mb-2 max-w-sm">
              {user?.firstName}, vos paiements de loyer apparaîtront ici une fois votre bail actif.
            </p>
            <p className="text-xs text-neutral-400 flex items-center gap-1.5 mt-2">
              <CreditCard className="size-3" />
              Vos paiements de loyer apparaîtront ici
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
