'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Search, MapPin, Home, Building2, Wallet, FileCheck, Users, ShieldCheck, BadgeCheck } from 'lucide-react'
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

const popularLocations = ['Cocody', 'Plateau', 'Marcory', 'Yopougon', 'Riviera', 'Abobo']

const stats = [
  { icon: Building2, value: '1 204', label: 'Biens disponibles' },
  { icon: Users, value: '4 872', label: 'Visiteurs mensuels' },
  { icon: FileCheck, value: '257', label: 'Baux signés' },
  { icon: ShieldCheck, value: '98%', label: 'Taux de satisfaction' },
]

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: 'easeOut' },
  }),
}

export function Hero() {
  const { setView, setSelectedPropertyId } = useAuthStore()
  const [location, setLocation] = useState('')
  const [propertyType, setPropertyType] = useState('')
  const [budget, setBudget] = useState('')

  const handleSearch = () => {
    setView('nos-biens')
  }

  const handleLocationTag = (loc: string) => {
    setView('nos-biens')
  }

  return (
    <section className="relative min-h-[600px] sm:min-h-[680px] lg:min-h-[720px] flex flex-col overflow-hidden">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/images/hero-bg.png')" }}
      />
      {/* Blue gradient overlay — dark navy at top to teal at bottom */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a1628]/85 via-[#0d2847]/80 to-[#0f3460]/75" />

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center w-full mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20 pb-6 text-center">
        {/* Heading */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="text-3xl sm:text-4xl lg:text-[3.25rem] xl:text-5xl font-bold text-white leading-tight mb-1"
        >
          Trouvez votre logement
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease: 'easeOut' }}
          className="text-2xl sm:text-3xl lg:text-4xl font-bold text-brand-500 mb-4"
        >
          en toute confiance
        </motion.p>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25, ease: 'easeOut' }}
          className="text-sm sm:text-base text-white/70 max-w-xl mx-auto mb-8 sm:mb-10 leading-relaxed"
        >
          La plateforme immobilière vérifiée par des Tiers de Confiance pour louer en toute sérénité en Côte d&apos;Ivoire.
        </motion.p>

        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35, ease: 'easeOut' }}
          className="w-full max-w-4xl mx-auto"
        >
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl shadow-black/15 p-2.5 sm:p-3">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-2.5 items-stretch">
              {/* Location */}
              <div className="relative flex-1">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-neutral-400" />
                <Input
                  placeholder="Ville, commune, quartier..."
                  className="pl-9 h-11 bg-neutral-50 border-neutral-200 text-sm focus-visible:border-brand-500 focus-visible:ring-brand-500/30"
                />
              </div>
              {/* Property Type */}
              <Select value={propertyType} onValueChange={setPropertyType}>
                <SelectTrigger className="h-11 w-full sm:w-[160px] bg-neutral-50 border-neutral-200 text-sm">
                  <Home className="size-4 text-neutral-400 mr-1.5 shrink-0" />
                  <SelectValue placeholder="Type de bien" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="appartement">Appartement</SelectItem>
                  <SelectItem value="maison">Maison</SelectItem>
                  <SelectItem value="studio">Studio</SelectItem>
                  <SelectItem value="duplex">Duplex</SelectItem>
                  <SelectItem value="penthouse">Penthouse</SelectItem>
                  <SelectItem value="villa">Villa</SelectItem>
                </SelectContent>
              </Select>
              {/* Budget */}
              <Select value={budget} onValueChange={setBudget}>
                <SelectTrigger className="h-11 w-full sm:w-[160px] bg-neutral-50 border-neutral-200 text-sm">
                  <Wallet className="size-4 text-neutral-400 mr-1.5 shrink-0" />
                  <SelectValue placeholder="Budget" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0-100k">&lt; 100 000 FCFA</SelectItem>
                  <SelectItem value="100k-200k">100 000 - 200 000</SelectItem>
                  <SelectItem value="200k-350k">200 000 - 350 000</SelectItem>
                  <SelectItem value="350k+">&gt; 350 000 FCFA</SelectItem>
                </SelectContent>
              </Select>
              {/* Search Button */}
              <Button
                size="lg"
                className="h-11 bg-brand-500 hover:bg-brand-600 text-white px-5 sm:px-6 shrink-0 rounded-lg font-semibold text-sm"
                onClick={handleSearch}
              >
                <Search className="size-4 mr-2" />
                Rechercher
              </Button>
            </div>
          </div>

          {/* Popular Location Tags */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.55 }}
            className="flex flex-wrap items-center justify-center gap-2 mt-4 sm:mt-5"
          >
            <span className="text-xs text-white/50 font-medium mr-1">Populaires :</span>
            {popularLocations.map((loc) => (
              <button
                key={loc}
                onClick={() => handleLocationTag(loc)}
                className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/15 text-xs text-white/80 font-medium hover:bg-white/20 hover:text-white transition-colors"
              >
                {loc}
              </button>
            ))}
          </motion.div>
        </motion.div>
      </div>

      {/* Stats Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6, ease: 'easeOut' }}
        className="relative z-10 w-full"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-8 sm:pb-10">
          <div className="bg-[#0d2847]/80 backdrop-blur-md rounded-xl sm:rounded-2xl border border-white/10 px-4 sm:px-8 py-5 sm:py-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8">
              {stats.map((stat, i) => {
                const Icon = stat.icon
                return (
                  <motion.div
                    key={stat.label}
                    custom={i}
                    variants={fadeUp}
                    initial="hidden"
                    animate="visible"
                    className="flex flex-col items-center text-center"
                  >
                    <div className="size-9 sm:size-10 rounded-full bg-brand-500/20 flex items-center justify-center mb-2">
                      <Icon className="size-4 sm:size-5 text-brand-500" />
                    </div>
                    <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">{stat.value}</p>
                    <p className="text-[11px] sm:text-xs text-white/60 mt-0.5 font-medium">{stat.label}</p>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  )
}
