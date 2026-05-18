'use client'

import { Building2, Eye, Shield, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

export function PropertiesModeration() {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Modération des biens</h1>
        <p className="text-muted-foreground mt-1">Approuvez ou rejetez les annonces immobilières</p>
      </div>

      <Card className="border-border">
        <CardContent className="py-12 text-center">
          <Building2 className="size-12 text-muted-foreground/50 mx-auto mb-4" />
          <p className="text-muted-foreground">Aucune annonce en attente de modération</p>
          <p className="text-sm text-muted-foreground mt-1">Les nouvelles annonces apparaîtront ici pour validation</p>
        </CardContent>
      </Card>
    </motion.div>
  )
}
