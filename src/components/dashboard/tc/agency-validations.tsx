'use client'

import { Building2, Check, X } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

export function AgencyValidations() {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Validations agences</h1>
        <p className="text-neutral-500 mt-1">Vérifiez les agréments des agences immobilières</p>
      </div>

      <Card className="border-neutral-200">
        <CardContent className="py-12 text-center">
          <Building2 className="size-12 text-neutral-300 mx-auto mb-4" />
          <p className="text-neutral-500">Aucune agence en attente de validation</p>
          <p className="text-sm text-neutral-400 mt-1">Les demandes d&apos;agrément apparaîtront ici</p>
        </CardContent>
      </Card>
    </motion.div>
  )
}
