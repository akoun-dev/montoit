'use client'

import { useCallback, useEffect, useState } from 'react'
import { FileSignature, Building2, User, AlertTriangle, Loader2, MoreVertical } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

interface LeaseItem {
  id: string; status: string; monthlyRent: number; charges: number; startDate: string; endDate: string
  tenant: { id: string; firstName: string; lastName: string; avatarUrl: string | null }
  property: { title: string; city: string; address: string; images: Array<{ url: string }> }
  paymentStatus: 'up_to_date' | 'late' | 'pending'
  latePaymentsCount: number
  totalPaid: number
  nextPayment: {
    id: string
    amount: number
    dueDate: string
    status: string
  } | null
}

export function ProprietaireLeases() {
  const { isAuthenticated } = useAuthStore()
  const [data, setData] = useState<LeaseItem[]>([])
  const [loading, setLoading] = useState(true)
  const [terminating, setTerminating] = useState(false)
  const [showTerminateDialog, setShowTerminateDialog] = useState(false)
  const [leaseToTerminate, setLeaseToTerminate] = useState<LeaseItem | null>(null)

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false)
      return
    }

    try {
      const d = await authFetch<{ activeLeases?: LeaseItem[] }>('/api/dashboard/proprietaire')
      setData(d.activeLeases || [])
    } catch (err) {
      if (err instanceof AuthError && err.status === 401) {
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

  const handleTerminateClick = (lease: LeaseItem) => {
    setLeaseToTerminate(lease)
    setShowTerminateDialog(true)
  }

  const handleTerminate = async () => {
    if (!leaseToTerminate) return
    setTerminating(true)
    try {
      await authFetch(`/api/leases/${leaseToTerminate.id}/terminate`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      })
      toast.success('Bail résilié avec succès')
      setShowTerminateDialog(false)
      setLeaseToTerminate(null)
      // Refresh data
      fetchData()
    } catch (err) {
      if (err instanceof AuthError) {
        toast.error(err.message || 'Erreur lors de la résiliation')
      } else {
        toast.error('Erreur lors de la résiliation du bail')
      }
    } finally {
      setTerminating(false)
    }
  }

  if (loading) return <div className="space-y-4">{[1, 2].map((i) => <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />)}</div>

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Mes baux</h1>
        <p className="text-muted-foreground mt-1">Contrats de location actifs et passés</p>
      </div>

      {data.length === 0 ? (
        <Card className="border-border">
          <CardContent className="py-12 text-center">
            <FileSignature className="size-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground">Aucun bail</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {data.map((lease) => (
            <Card key={lease.id} className="border-border">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3">
                    {/* Tenant avatar */}
                    <div className="shrink-0 mt-0.5">
                      {lease.tenant.avatarUrl ? (
                        <img
                          src={lease.tenant.avatarUrl}
                          alt={`${lease.tenant.firstName} ${lease.tenant.lastName}`}
                          className="size-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="size-10 rounded-full bg-brand-50 flex items-center justify-center">
                          <User className="size-5 text-brand-500" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{lease.property.title}</h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                        <User className="size-3.5" /> {lease.tenant.firstName} {lease.tenant.lastName}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={lease.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : lease.status === 'TERMINATED' ? 'bg-red-50 text-red-600' : 'bg-neutral-100 text-neutral-600'}>
                      {lease.status === 'ACTIVE' ? 'Actif' : lease.status === 'TERMINATED' ? 'Résilié' : lease.status}
                    </Badge>
                    {lease.status === 'ACTIVE' && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="size-8 p-0">
                            <MoreVertical className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                            onClick={() => handleTerminateClick(lease)}
                          >
                            <AlertTriangle className="size-4 mr-2" />
                            Résilier le bail
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-lg bg-muted">
                  <div>
                    <p className="text-xs text-muted-foreground">Loyer</p>
                    <p className="text-sm font-semibold">{lease.monthlyRent.toLocaleString('fr-FR')} FCFA</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Charges</p>
                    <p className="text-sm font-semibold">{lease.charges?.toLocaleString('fr-FR') || 0} FCFA</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Début</p>
                    <p className="text-sm font-semibold">{new Date(lease.startDate).toLocaleDateString('fr-FR')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Fin</p>
                    <p className="text-sm font-semibold">{new Date(lease.endDate).toLocaleDateString('fr-FR')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ─── Termination Confirmation Dialog ──────────────────────────────────── */}
      <Dialog open={showTerminateDialog} onOpenChange={setShowTerminateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-red-500" />
              Résilier le bail
            </DialogTitle>
            <DialogDescription className="pt-2">
              Êtes-vous sûr de vouloir résilier ce bail ? Cette action est irréversible. Le bail pour
              <span className="font-semibold text-foreground"> {leaseToTerminate?.property?.title}</span> avec
              <span className="font-semibold text-foreground"> {leaseToTerminate?.tenant?.firstName} {leaseToTerminate?.tenant?.lastName}</span> sera immédiatement clôturé.
            </DialogDescription>
          </DialogHeader>
          <div className="p-3 rounded-lg bg-red-50 border border-red-100 my-2">
            <p className="text-xs text-red-700">
              En résiliant ce bail, vous mettez fin au contrat de location. Les paiements en attente restent dus selon les conditions du bail.
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setShowTerminateDialog(false)
                setLeaseToTerminate(null)
              }}
              disabled={terminating}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleTerminate}
              disabled={terminating}
              className="gap-2"
            >
              {terminating ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Résiliation...
                </>
              ) : (
                <>
                  <AlertTriangle className="size-4" />
                  Confirmer la résiliation
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
