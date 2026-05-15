'use client'

import { Search, MapPin } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

export function SearchProperties() {
  const { user, setView } = useAuthStore()

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold text-neutral-900">Chercher un bien</h1>
        <p className="text-neutral-500 mt-1">Trouvez votre futur logement</p>
      </motion.div>

      {/* Search Bar Card */}
      <motion.div variants={itemVariants}>
        <Card className="border-neutral-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-brand-50">
                <Search className="size-4 text-brand-500" />
              </div>
              Recherche rapide
            </CardTitle>
            <CardDescription>Entrez une commune ou un quartier pour commencer</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-neutral-400" />
              <Input
                placeholder="Commune, quartier, ville..."
                className="pl-10 h-11"
                disabled
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Budget min" className="h-10" disabled />
              <Input placeholder="Budget max" className="h-10" disabled />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Empty State */}
      <motion.div variants={itemVariants}>
        <Card className="border-dashed border-neutral-300 bg-neutral-50/50">
          <CardContent className="py-12 flex flex-col items-center text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-brand-50 mb-4">
              <Search className="size-7 text-brand-500" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 mb-1">
              Explorez nos biens disponibles
            </h3>
            <p className="text-sm text-neutral-500 mb-6 max-w-sm">
              {user?.firstName}, parcourez notre catalogue de logements et trouvez celui qui vous correspond.
            </p>
            <Button
              onClick={() => setView('nos-biens')}
              className="bg-brand-500 hover:bg-brand-600 text-white"
            >
              <Search className="size-4 mr-2" />
              Voir les biens
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
