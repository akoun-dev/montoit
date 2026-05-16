'use client'

import { BarChart3, Download, Calendar } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

export function Reports() {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Rapports & Analyses</h1>
          <p className="text-muted-foreground mt-1">Statistiques détaillées de la plateforme</p>
        </div>
        <div className="flex gap-2">
          <Select defaultValue="month">
            <SelectTrigger className="w-40 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Cette semaine</SelectItem>
              <SelectItem value="month">Ce mois</SelectItem>
              <SelectItem value="quarter">Ce trimestre</SelectItem>
              <SelectItem value="year">Cette année</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="gap-1" onClick={() => toast.info('Export en cours...')}>
            <Download className="size-4" /> Exporter
          </Button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { title: 'Nouveaux utilisateurs', value: '47', change: '+12%', period: 'ce mois' },
          { title: 'Nouveaux biens publiés', value: '23', change: '+8%', period: 'ce mois' },
          { title: 'Baux signés', value: '15', change: '+25%', period: 'ce mois' },
          { title: 'Dossiers validés (TC)', value: '31', change: '+18%', period: 'ce mois' },
          { title: 'Litiges résolus', value: '4', change: '-10%', period: 'ce mois' },
          { title: 'Revenus totaux', value: '8.2M FCFA', change: '+15%', period: 'ce mois' },
        ].map((item) => (
          <Card key={item.title} className="border-border">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{item.title}</p>
              <div className="flex items-end gap-2 mt-1">
                <p className="text-2xl font-bold text-foreground">{item.value}</p>
                <span className={`text-sm font-medium ${item.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                  {item.change}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{item.period}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border">
        <CardContent className="p-6 text-center">
          <BarChart3 className="size-12 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-muted-foreground">Graphiques détaillés disponibles prochainement</p>
          <p className="text-sm text-muted-foreground mt-1">Visualisations avec Recharts en cours de développement</p>
        </CardContent>
      </Card>
    </motion.div>
  )
}
