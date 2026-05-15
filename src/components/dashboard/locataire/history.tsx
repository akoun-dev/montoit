'use client'

import { History as HistoryIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

const timelinePlaceholder = [
  { label: 'Connexion au compte', date: '—' },
  { label: 'Visite planifiée', date: '—' },
  { label: 'Dossier soumis', date: '—' },
  { label: 'Paiement effectué', date: '—' },
]

export function ActivityHistory() {
  const { user } = useAuthStore()

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold text-neutral-900">Historique</h1>
        <p className="text-neutral-500 mt-1">Vos activités récentes</p>
      </motion.div>

      {/* Empty State with Timeline */}
      <motion.div variants={itemVariants}>
        <Card className="border-dashed border-neutral-300 bg-neutral-50/50">
          <CardContent className="py-12 flex flex-col items-center text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-brand-50 mb-4">
              <HistoryIcon className="size-7 text-brand-500" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 mb-1">
              Aucune activité récente
            </h3>
            <p className="text-sm text-neutral-500 max-w-sm">
              {user?.firstName}, vos actions et événements apparaîtront ici au fil du temps.
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Timeline Visual Placeholder */}
      <motion.div variants={itemVariants}>
        <Card className="border-neutral-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Fil d&apos;activité</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-[11px] top-2 bottom-2 w-px bg-neutral-200" />

              <div className="space-y-6">
                {timelinePlaceholder.map((item, index) => (
                  <div key={index} className="flex items-start gap-4 relative">
                    <div className="flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-neutral-200 bg-white z-10">
                      <div className="size-2 rounded-full bg-neutral-300" />
                    </div>
                    <div className="flex-1 pt-0.5">
                      <p className="text-sm text-neutral-400">{item.label}</p>
                      <p className="text-xs text-neutral-300 mt-0.5">{item.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
