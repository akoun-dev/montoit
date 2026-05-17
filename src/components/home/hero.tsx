'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Search, MapPin, Home, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/lib/auth-store'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Stats {
  totalProperties: number
  monthlyVisitors: number
  newToday: number
  satisfactionRate: number
  communes: string[]
  propertyTypes: string[]
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: 'easeOut' },
  }),
}

function formatNumber(n: number): string {
  return n.toLocaleString('fr-FR')
}

export function Hero() {
  const { setView, setSearchParams } = useAuthStore()
  const [stats, setStats] = useState<Stats | null>(null)

  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCommune, setSelectedCommune] = useState('')
  const [selectedType, setSelectedType] = useState('')

  useEffect(() => {
    fetch('/api/stats')
      .then((res) => res.json())
      .then((data) => setStats(data))
      .catch(() => {
        setStats({ totalProperties: 0, monthlyVisitors: 0, newToday: 0, satisfactionRate: 0, communes: [], propertyTypes: [] })
      })
  }, [])

  const handleSearch = () => {
    // Store the search params so NosBiensView can read them
    setSearchParams({
      query: searchQuery,
      commune: selectedCommune,
      propertyType: selectedType,
    })
    setView('nos-biens')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const statItems = stats
    ? [
        { value: formatNumber(stats.totalProperties), label: 'Biens disponibles' },
        { value: formatNumber(stats.monthlyVisitors), label: 'Visiteurs mensuels' },
        { value: formatNumber(stats.newToday), label: "Nouveaux aujourd'hui" },
        { value: `${stats.satisfactionRate}%`, label: 'Taux de satisfaction' },
      ]
    : [
        { value: '—', label: 'Biens disponibles' },
        { value: '—', label: 'Visiteurs mensuels' },
        { value: '—', label: "Nouveaux aujourd'hui" },
        { value: '—', label: 'Taux de satisfaction' },
      ]

  return (
    <section className="relative min-h-[600px] flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/images/hero-bg.png')" }}
      />
      <div className="absolute inset-0 bg-black/50" />

      {/* Content */}
      <div className="relative z-10 w-full mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-2"
        >
          Trouvez votre logement
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
          className="text-xl sm:text-2xl text-white/90 font-light mb-10"
        >
          avec toute confiance
        </motion.p>

        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4, ease: 'easeOut' }}
          className="bg-card rounded-xl shadow-lg p-3 sm:p-4 max-w-4xl mx-auto"
        >
          <div className="flex flex-col sm:flex-row gap-3 items-stretch">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un bien..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pl-9 h-11 bg-muted border-border focus-visible:border-brand-500 focus-visible:ring-brand-500/30"
              />
            </div>
            <Select value={selectedCommune} onValueChange={setSelectedCommune}>
              <SelectTrigger className="h-11 w-full sm:w-[180px] bg-muted border-border">
                <MapPin className="size-4 text-muted-foreground mr-1" />
                <SelectValue placeholder="Ville, Commune" />
              </SelectTrigger>
              <SelectContent>
                {(stats?.communes ?? []).map((commune) => (
                  <SelectItem key={commune} value={commune}>{commune}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="h-11 w-full sm:w-[200px] bg-muted border-border">
                <Building2 className="size-4 text-muted-foreground mr-1" />
                <SelectValue placeholder="Type de bien" />
              </SelectTrigger>
              <SelectContent>
                {(stats?.propertyTypes ?? []).map((type) => (
                  <SelectItem key={type} value={type}>{type.charAt(0) + type.slice(1).toLowerCase()}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="lg"
              className="h-11 bg-brand-500 hover:bg-brand-600 text-white px-6 shrink-0"
              onClick={handleSearch}
            >
              <Home className="size-4 mr-2" />
              Rechercher
            </Button>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-10 max-w-3xl mx-auto"
        >
          {statItems.map((stat, i) => (
            <motion.div
              key={stat.label}
              custom={i}
              variants={fadeUp}
              className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-3 border border-white/20"
            >
              <p className="text-2xl sm:text-3xl font-bold text-white">{stat.value}</p>
              <p className="text-sm text-white/80 mt-0.5">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
