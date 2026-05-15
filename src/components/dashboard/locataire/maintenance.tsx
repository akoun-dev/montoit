'use client'

import { Wrench, Plus } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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

export function Maintenance() {
  const { user } = useAuthStore()

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Maintenance</h1>
          <p className="text-neutral-500 mt-1">Demandes d&apos;intervention et suivi</p>
        </div>
        <Button className="bg-brand-500 hover:bg-brand-600 text-white">
          <Plus className="size-4 mr-2" />
          Nouvelle demande
        </Button>
      </motion.div>

      {/* Status Summary */}
      <motion.div variants={itemVariants}>
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-neutral-200">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-neutral-300">0</p>
              <p className="text-xs text-neutral-500 mt-1">En attente</p>
            </CardContent>
          </Card>
          <Card className="border-neutral-200">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-neutral-300">0</p>
              <p className="text-xs text-neutral-500 mt-1">En cours</p>
            </CardContent>
          </Card>
          <Card className="border-neutral-200">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-neutral-300">0</p>
              <p className="text-xs text-neutral-500 mt-1">Résolues</p>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* Empty State */}
      <motion.div variants={itemVariants}>
        <Card className="border-dashed border-neutral-300 bg-neutral-50/50">
          <CardContent className="py-12 flex flex-col items-center text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-brand-50 mb-4">
              <Wrench className="size-7 text-brand-500" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 mb-1">
              Aucune demande de maintenance
            </h3>
            <p className="text-sm text-neutral-500 max-w-sm">
              {user?.firstName}, signalez un problème ou demandez une intervention dans votre logement.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
