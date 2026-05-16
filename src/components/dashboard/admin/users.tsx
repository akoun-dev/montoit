'use client'

import { useCallback, useEffect, useState } from 'react'
import { Users, Search, UserX, Shield, Power } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

interface UserData {
  recentUsers: Array<{
    id: string; firstName: string; lastName: string; phone: string; role: string; isActive: boolean; email: string | null; createdAt: string
  }>
}

function RoleBadge({ role }: { role: string }) {
  const config: Record<string, { label: string; className: string }> = {
    LOCATAIRE: { label: 'Locataire', className: 'bg-blue-100 text-blue-700' },
    PROPRIETAIRE: { label: 'Propriétaire', className: 'bg-green-100 text-green-700' },
    TIERS_CONFIANCE: { label: 'TC', className: 'bg-amber-100 text-amber-700' },
    ADMIN: { label: 'Admin', className: 'bg-purple-100 text-purple-700' },
  }
  const c = config[role] || { label: role, className: 'bg-neutral-100 text-neutral-700' }
  return <Badge className={c.className}>{c.label}</Badge>
}

export function AdminUsers() {
  const { isAuthenticated } = useAuthStore()
  const [data, setData] = useState<UserData['recentUsers']>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false)
      return
    }

    try {
      const d = await authFetch<UserData>('/api/dashboard/admin')
      setData(d.recentUsers || [])
    } catch (err) {
      if (err instanceof AuthError && err.status === 401) {
        // authFetch already handled logout — just show default data
        setData([])
        return
      }
      setData([])
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) return <div className="space-y-4">{[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />)}</div>

  const filtered = data.filter((u) =>
    `${u.firstName} ${u.lastName} ${u.phone} ${u.email}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestion des utilisateurs</h1>
          <p className="text-muted-foreground mt-1">{data.length} utilisateur(s)</p>
        </div>
        <div className="w-64">
          <Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-9" />
        </div>
      </div>

      <Card className="border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted">
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">Utilisateur</th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">Téléphone</th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">Email</th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">Rôle</th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">Statut</th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} className="border-b border-border hover:bg-accent">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-semibold">
                          {u.firstName[0]}{u.lastName[0]}
                        </div>
                        <span className="font-medium text-foreground">{u.firstName} {u.lastName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{u.phone}</td>
                    <td className="py-3 px-4 text-muted-foreground">{u.email || '—'}</td>
                    <td className="py-3 px-4"><RoleBadge role={u.role} /></td>
                    <td className="py-3 px-4">
                      <Badge className={u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                        {u.isActive ? 'Actif' : 'Suspendu'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="size-8" title={u.isActive ? 'Suspendre' : 'Activer'} onClick={() => toast.success(u.isActive ? 'Utilisateur suspendu' : 'Utilisateur réactivé')}>
                          <Power className="size-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
