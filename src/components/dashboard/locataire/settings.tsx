'use client'

import { Settings, User, Shield, Bell, Sliders, Mail, Phone } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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

const settingsSections = [
  {
    icon: User,
    label: 'Profil',
    description: 'Modifiez vos informations personnelles',
    color: 'text-brand-500 bg-brand-50',
  },
  {
    icon: Shield,
    label: 'Sécurité',
    description: 'Mot de passe et authentification',
    color: 'text-green-600 bg-green-50',
  },
  {
    icon: Bell,
    label: 'Notifications',
    description: 'Gérez vos alertes et préférences',
    color: 'text-amber-600 bg-amber-50',
  },
  {
    icon: Sliders,
    label: 'Préférences',
    description: 'Langue, thème et affichage',
    color: 'text-purple-600 bg-purple-50',
  },
]

export function SettingsSection() {
  const { user } = useAuthStore()

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold text-neutral-900">Paramètres</h1>
        <p className="text-neutral-500 mt-1">Gérez votre compte et vos préférences</p>
      </motion.div>

      {/* User Info Card */}
      <motion.div variants={itemVariants}>
        <Card className="border-neutral-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex size-14 items-center justify-center rounded-full bg-brand-50 text-brand-500 shrink-0">
                <span className="text-lg font-bold">
                  {user?.firstName?.charAt(0)?.toUpperCase() || 'U'}
                  {user?.lastName?.charAt(0)?.toUpperCase() || ''}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-neutral-900 truncate">
                  {user?.firstName} {user?.lastName}
                </h3>
                <div className="space-y-1 mt-1.5">
                  <div className="flex items-center gap-2 text-sm text-neutral-500">
                    <Mail className="size-3.5 shrink-0" />
                    <span className="truncate">{user?.email || 'Non renseigné'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-neutral-500">
                    <Phone className="size-3.5 shrink-0" />
                    <span>{user?.phone || 'Non renseigné'}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Settings Sections */}
      <motion.div variants={itemVariants} className="grid gap-4 sm:grid-cols-2">
        {settingsSections.map((section) => {
          const Icon = section.icon
          return (
            <Card
              key={section.label}
              className="border-neutral-200 cursor-pointer hover:border-brand-200 hover:shadow-sm transition-all group"
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${section.color} group-hover:scale-105 transition-transform`}>
                    <Icon className="size-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-neutral-900">{section.label}</h4>
                    <p className="text-xs text-neutral-500 mt-0.5">{section.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </motion.div>
    </motion.div>
  )
}
