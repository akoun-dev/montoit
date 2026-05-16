'use client'

import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, Save, CheckCircle2, FileText, Building2, Key } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// ─── Constants ────────────────────────────────────────────────────────────────

const DESIGNATIONS = [
  'SOL',
  'PEINTURE DES MURS',
  'PEINTURE DES PLAFONDS',
  'PORTES',
  'ÉLECTRICITÉ',
  'ROBINETTERIE',
  'ÉVIER INOX DE LAVABO',
  'DOUCHE ET SDB',
  'NOMBRE DE CLÉS',
] as const

const ROOM_COLUMNS = [
  'CUISINE',
  'SALLE D\'EAU CH. PRINCIPALE',
  'SALLE D\'EAU AUTRES CHAMBRES',
  'AUTRE PIÈCE',
  'AUTRE PIÈCE',
] as const

type Condition = 'BON' | 'MAUVAIS' | null

interface CellState {
  condition: Condition
  observation: string
  keyCount: number | null
}

interface GridState {
  [rowIdx: string]: {
    [colIdx: string]: CellState
  }
}

const defaultCellState = (): CellState => ({
  condition: null,
  observation: '',
  keyCount: null,
})

const createDefaultGrid = (): GridState => {
  const grid: GridState = {}
  for (let r = 0; r < DESIGNATIONS.length; r++) {
    grid[r] = {}
    for (let c = 0; c < ROOM_COLUMNS.length; c++) {
      grid[r][c] = defaultCellState()
    }
  }
  return grid
}

type InventoryType = 'INVENTORY_ENTRANCE' | 'INVENTORY_EXIT'

interface PropertyInfo {
  id: string
  title: string
  type: string
  commune: string
  images: Array<{ id: string; url: string; order: number }>
  owner: {
    id: string
    firstName: string
    lastName: string
    phone: string
    email: string
  }
}

const typeLabels: Record<string, string> = {
  INVENTORY_ENTRANCE: 'Entrée des lieux',
  INVENTORY_EXIT: 'Sortie des lieux',
}

export function InventoryReportForm() {
  const { isAuthenticated, selectedItemId, setDashboardSection, setSelectedItemId } = useAuthStore()
  const [grid, setGrid] = useState<GridState>(createDefaultGrid)
  const [inventoryType, setInventoryType] = useState<InventoryType>('INVENTORY_ENTRANCE')
  const [generalObservations, setGeneralObservations] = useState('')
  const [propertyInfo, setPropertyInfo] = useState<PropertyInfo | null>(null)
  const [leaseId, setLeaseId] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)

  const goBack = () => {
    setSelectedItemId('')
    setDashboardSection('property-verifications')
  }

  // Fetch property info
  const fetchProperty = useCallback(async () => {
    if (!isAuthenticated || !selectedItemId) {
      setInitialLoading(false)
      return
    }
    try {
      const d = await authFetch<{ property: PropertyInfo }>(`/api/tc/verifications?propertyId=${selectedItemId}`)
      setPropertyInfo(d.property || null)
    } catch {
      // Fallback: try properties API
      try {
        const d2 = await authFetch<{ property: PropertyInfo }>(`/api/properties/${selectedItemId}`)
        setPropertyInfo(d2.property || null)
      } catch {
        setPropertyInfo(null)
      }
    } finally {
      setInitialLoading(false)
    }
  }, [isAuthenticated, selectedItemId])

  useEffect(() => {
    fetchProperty()
  }, [fetchProperty])

  const setCondition = (rowIdx: number, colIdx: number, condition: Condition) => {
    setGrid((prev) => ({
      ...prev,
      [rowIdx]: {
        ...prev[rowIdx],
        [colIdx]: { ...prev[rowIdx][colIdx], condition },
      },
    }))
  }

  const setObservation = (rowIdx: number, colIdx: number, observation: string) => {
    setGrid((prev) => ({
      ...prev,
      [rowIdx]: {
        ...prev[rowIdx],
        [colIdx]: { ...prev[rowIdx][colIdx], observation },
      },
    }))
  }

  const setKeyCount = (rowIdx: number, colIdx: number, keyCount: number | null) => {
    setGrid((prev) => ({
      ...prev,
      [rowIdx]: {
        ...prev[rowIdx],
        [colIdx]: { ...prev[rowIdx][colIdx], keyCount },
      },
    }))
  }

  // Calculate total keys
  const totalKeys = (() => {
    let total = 0
    for (let c = 0; c < ROOM_COLUMNS.length; c++) {
      const val = grid[8]?.[c]?.keyCount
      if (val) total += val
    }
    return total
  })()

  const buildItemsPayload = () => {
    // Create one item per designation row (9 rows)
    // Each row maps 5 room columns to: kitchen, mainBathroom, otherBathroom, otherRoom1, otherRoom2
    const items = []
    for (let r = 0; r < DESIGNATIONS.length; r++) {
      const isKeyRow = r === 8 // NOMBRE DE CLÉS row
      const cell0 = grid[r]?.[0] // CUISINE → kitchen
      const cell1 = grid[r]?.[1] // SALLE D'EAU CH. PRINCIPALE → mainBathroom
      const cell2 = grid[r]?.[2] // SALLE D'EAU AUTRES CHAMBRES → otherBathroom
      const cell3 = grid[r]?.[3] // AUTRE PIÈCE → otherRoom1
      const cell4 = grid[r]?.[4] // AUTRE PIÈCE → otherRoom2

      // For key row, store key counts as observations string
      // For condition rows, store BON/MAUVAIS values
      items.push({
        designation: DESIGNATIONS[r],
        designationOrder: r + 1,
        kitchen: isKeyRow ? (cell0?.keyCount !== null && cell0?.keyCount !== undefined ? `${cell0.keyCount} clé(s)` : null) : (cell0?.condition || null),
        mainBathroom: isKeyRow ? (cell1?.keyCount !== null && cell1?.keyCount !== undefined ? `${cell1.keyCount} clé(s)` : null) : (cell1?.condition || null),
        otherBathroom: isKeyRow ? (cell2?.keyCount !== null && cell2?.keyCount !== undefined ? `${cell2.keyCount} clé(s)` : null) : (cell2?.condition || null),
        otherRoom1: isKeyRow ? (cell3?.keyCount !== null && cell3?.keyCount !== undefined ? `${cell3.keyCount} clé(s)` : null) : (cell3?.condition || null),
        otherRoom2: isKeyRow ? (cell4?.keyCount !== null && cell4?.keyCount !== undefined ? `${cell4.keyCount} clé(s)` : null) : (cell4?.condition || null),
        observations: cell0?.observation || null,
      })
    }
    return items
  }

  const handleSaveDraft = async () => {
    setSaving(true)
    try {
      await authFetch('/api/tc/inventory-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId: selectedItemId,
          type: inventoryType,
          leaseId: leaseId || undefined,
          status: 'DRAFT',
          items: buildItemsPayload(),
          generalObservations,
          totalKeys,
        }),
      })
      toast.success('Brouillon sauvegardé !')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  const handleValidate = async () => {
    // Check that at least some cells are filled
    let hasAnyCondition = false
    for (let r = 0; r < DESIGNATIONS.length; r++) {
      for (let c = 0; c < ROOM_COLUMNS.length; c++) {
        if (grid[r]?.[c]?.condition) {
          hasAnyCondition = true
          break
        }
      }
      if (hasAnyCondition) break
    }

    if (!hasAnyCondition) {
      toast.error('Veuillez remplir au moins une évaluation avant de valider')
      return
    }

    setSaving(true)
    try {
      await authFetch('/api/tc/inventory-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId: selectedItemId,
          type: inventoryType,
          leaseId: leaseId || undefined,
          status: 'COMPLETED',
          items: buildItemsPayload(),
          generalObservations,
          totalKeys,
        }),
      })
      toast.success('État des lieux validé avec succès !')
      goBack()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la validation')
    } finally {
      setSaving(false)
    }
  }

  if (initialLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-32 rounded bg-muted animate-pulse" />
        <div className="h-96 rounded-xl bg-muted animate-pulse" />
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Back button */}
      <Button variant="ghost" onClick={goBack} className="gap-2 -ml-2">
        <ArrowLeft className="size-4" /> Retour aux vérifications
      </Button>

      {/* Header */}
      <Card className="border-border">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
                <FileText className="size-5 text-brand-500" />
                État des Lieux
              </CardTitle>
              {propertyInfo && (
                <div className="flex items-center gap-2 mt-2">
                  <Building2 className="size-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{propertyInfo.title} — {propertyInfo.commune}</span>
                </div>
              )}
            </div>

            {/* Type selector */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setInventoryType('INVENTORY_ENTRANCE')}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  inventoryType === 'INVENTORY_ENTRANCE'
                    ? 'bg-brand-500 text-white'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                Entrée des lieux
              </button>
              <button
                onClick={() => setInventoryType('INVENTORY_EXIT')}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  inventoryType === 'INVENTORY_EXIT'
                    ? 'bg-brand-500 text-white'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                Sortie des lieux
              </button>
            </div>
          </div>

          {/* Optional lease selector */}
          <div className="mt-3">
            <label className="text-xs text-muted-foreground">Bail associé (optionnel)</label>
            <Input
              placeholder="ID du bail..."
              value={leaseId}
              onChange={(e) => setLeaseId(e.target.value)}
              className="mt-1 max-w-xs"
            />
          </div>
        </CardHeader>
      </Card>

      {/* The Table */}
      <Card className="border-border overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse">
              {/* Header row */}
              <thead>
                <tr className="bg-muted/50">
                  <th className="px-3 py-3 text-left text-xs font-bold text-foreground border-b border-r border-border w-10">
                    N°
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-bold text-foreground border-b border-r border-border min-w-[140px]">
                    DÉSIGNATIONS
                  </th>
                  {ROOM_COLUMNS.map((col, i) => (
                    <th
                      key={i}
                      className="px-2 py-3 text-center text-[10px] font-bold text-foreground border-b border-r border-border min-w-[110px] leading-tight"
                    >
                      {col}
                    </th>
                  ))}
                  <th className="px-3 py-3 text-left text-xs font-bold text-foreground border-b border-border min-w-[150px]">
                    OBSERVATIONS PARTICULIÈRES
                  </th>
                </tr>
              </thead>

              {/* Data rows */}
              <tbody>
                {DESIGNATIONS.map((designation, rowIdx) => {
                  const isKeyRow = rowIdx === 8
                  return (
                    <tr
                      key={rowIdx}
                      className={cn(
                        'hover:bg-muted/30 transition-colors',
                        isKeyRow && 'bg-amber-50/50'
                      )}
                    >
                      <td className="px-3 py-2.5 text-sm text-muted-foreground border-b border-r border-border text-center font-medium">
                        {rowIdx + 1}
                      </td>
                      <td className="px-3 py-2.5 text-sm font-semibold text-foreground border-b border-r border-border whitespace-nowrap">
                        {isKeyRow && <Key className="size-3.5 inline mr-1.5 text-brand-500" />}
                        {designation}
                      </td>

                      {ROOM_COLUMNS.map((_, colIdx) => (
                        <td
                          key={colIdx}
                          className="px-2 py-2 border-b border-r border-border text-center"
                        >
                          {isKeyRow ? (
                            /* Key count input */
                            <Input
                              type="number"
                              min={0}
                              placeholder="—"
                              value={grid[rowIdx]?.[colIdx]?.keyCount ?? ''}
                              onChange={(e) => {
                                const val = e.target.value
                                setKeyCount(rowIdx, colIdx, val === '' ? null : parseInt(val, 10))
                              }}
                              className="w-16 h-8 text-center text-sm mx-auto"
                            />
                          ) : (
                            /* BON / MAUVAIS toggle */
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => setCondition(rowIdx, colIdx, 'BON')}
                                className={cn(
                                  'px-2 py-1 rounded text-[11px] font-bold transition-colors',
                                  grid[rowIdx]?.[colIdx]?.condition === 'BON'
                                    ? 'bg-green-500 text-white shadow-sm'
                                    : 'bg-green-50 text-green-600 hover:bg-green-100 border border-green-200'
                                )}
                              >
                                BON
                              </button>
                              <button
                                onClick={() => setCondition(rowIdx, colIdx, 'MAUVAIS')}
                                className={cn(
                                  'px-2 py-1 rounded text-[11px] font-bold transition-colors',
                                  grid[rowIdx]?.[colIdx]?.condition === 'MAUVAIS'
                                    ? 'bg-red-500 text-white shadow-sm'
                                    : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                                )}
                              >
                                MAUVAIS
                              </button>
                            </div>
                          )}
                        </td>
                      ))}

                      <td className="px-2 py-2 border-b border-border">
                        <Input
                          placeholder="..."
                          value={grid[rowIdx]?.[0]?.observation ?? ''}
                          onChange={(e) => {
                            const val = e.target.value
                            // Set observation for all columns at once for simplicity
                            setGrid((prev) => {
                              const newGrid = { ...prev }
                              for (let c = 0; c < ROOM_COLUMNS.length; c++) {
                                newGrid[rowIdx] = {
                                  ...newGrid[rowIdx],
                                  [c]: { ...newGrid[rowIdx]?.[c], observation: val },
                                }
                              }
                              return newGrid
                            })
                          }}
                          className="h-8 text-sm"
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>

              {/* Footer — Total keys */}
              <tfoot>
                <tr className="bg-muted/50">
                  <td colSpan={2} className="px-3 py-3 text-sm font-bold text-foreground border-t border-border text-right">
                    TOTAL :
                  </td>
                  <td colSpan={4} className="px-3 py-3 border-t border-border text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Key className="size-4 text-brand-500" />
                      <span className="text-lg font-bold text-brand-500">{totalKeys}</span>
                      <span className="text-xs text-muted-foreground">clé(s)</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 border-t border-border"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* General Observations */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Observations générales</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Observations générales sur l'état du logement..."
            value={generalObservations}
            onChange={(e) => setGeneralObservations(e.target.value)}
            rows={4}
          />
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 justify-end">
        <Button
          variant="outline"
          onClick={goBack}
          className="gap-2"
        >
          <ArrowLeft className="size-4" /> Annuler
        </Button>
        <Button
          variant="outline"
          onClick={handleSaveDraft}
          disabled={saving}
          className="gap-2 border-brand-200 text-brand-600 hover:bg-brand-50"
        >
          <Save className="size-4" /> Sauvegarder le brouillon
        </Button>
        <Button
          onClick={handleValidate}
          disabled={saving}
          className="bg-brand-500 hover:bg-brand-600 text-white gap-2"
        >
          <CheckCircle2 className="size-4" /> Valider l&apos;état des lieux
        </Button>
      </div>
    </motion.div>
  )
}
