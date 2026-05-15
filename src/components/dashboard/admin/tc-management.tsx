'use client'

import { Shield, Plus, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

export function TcManagement() {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Gestion des Tiers de Confiance</h1>
          <p className="text-neutral-500 mt-1">Créez et gérez les comptes TC</p>
        </div>
        <Button className="bg-brand-500 hover:bg-brand-600 text-white gap-2" onClick={() => toast.info('Fonctionnalité à venir')}>
          <Plus className="size-4" /> Créer un compte TC
        </Button>
      </div>

      <Card className="border-neutral-200">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-sm font-semibold">
                TC
              </div>
              <div>
                <p className="font-medium text-neutral-900">Tiers Confiance</p>
                <p className="text-sm text-neutral-500">+225 02 02 02 02 · tc@montoit.ci</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-green-100 text-green-700">Actif</Badge>
              <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50 gap-1" onClick={() => toast.error('Compte révoqué')}>
                <Trash2 className="size-3.5" /> Révoquer
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
