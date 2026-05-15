'use client'

import { Bell } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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

const notificationCategories = [
  { label: 'Visites', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { label: 'Candidatures', color: 'bg-brand-50 text-brand-600 border-brand-200' },
  { label: 'Paiements', color: 'bg-green-50 text-green-700 border-green-200' },
  { label: 'Contrats', color: 'bg-purple-50 text-purple-700 border-purple-200' },
]

export function Notifications() {
  const { user } = useAuthStore()

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold text-neutral-900">Mes notifications</h1>
        <p className="text-neutral-500 mt-1">Restez informé de vos démarches</p>
      </motion.div>

      {/* Category Badges */}
      <motion.div variants={itemVariants}>
        <Card className="border-neutral-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Catégories</CardTitle>
            <CardDescription>Filtrez vos notifications par type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {notificationCategories.map((cat) => (
                <Badge
                  key={cat.label}
                  variant="outline"
                  className={`${cat.color} cursor-pointer hover:opacity-80 transition-opacity py-1.5 px-3`}
                >
                  {cat.label}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Empty State */}
      <motion.div variants={itemVariants}>
        <Card className="border-dashed border-neutral-300 bg-neutral-50/50">
          <CardContent className="py-12 flex flex-col items-center text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-brand-50 mb-4">
              <Bell className="size-7 text-brand-500" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 mb-1">
              Aucune notification
            </h3>
            <p className="text-sm text-neutral-500 max-w-sm">
              {user?.firstName}, vous serez notifié dès qu&apos;une mise à jour intervient sur vos démarches.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
