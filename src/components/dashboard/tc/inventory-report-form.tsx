'use client'

import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, Save, CheckCircle2, FileText, Building2, Key, Info } from 'lucide-react'
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

// Shorter labels for mobile
const ROOM_COLUMNS_SHORT = [
  'Cuisine',
  'SdB princ.',
  'SdB autres',
  'Autre pièce 1',
  'Autre pièce 2',
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

interface ExistingReport {
  id: string
  propertyId: string
  type: InventoryType
  status: string
  generalObservations: string | null
  totalKeys: number | null
  leaseId: string | null
  items: Array<{
    id: string
    designation: string
    designationOrder: number
    kitchen: string | null
    mainBathroom: string | null
    otherBathroom: string | null
    otherRoom1: string | null
    otherRoom2: string | null
    observations: string | null
  }>
  property: {
    id: string
    title: string
    address: string
    city: string
    commune: string | null
  }
}

const typeLabels: Record<string, string> = {
  INVENTORY_ENTRANCE: 'Entrée des lieux',
  INVENTORY_EXIT: 'Sortie des lieux',
}

export function InventoryReportForm() {
  const { isAuthenticated, selectedItemId, selectedPropertyId, setDashboardSection, setSelectedItemId, setSelectedPropertyId } = useAuthStore()
  const [grid, setGrid] = useState<GridState>(createDefaultGrid)
  const [inventoryType, setInventoryType] = useState<InventoryType>('INVENTORY_ENTRANCE')
  const [generalObservations, setGeneralObservations] = useState('')
  const [propertyInfo, setPropertyInfo] = useState<PropertyInfo | null>(null)
  const [existingReport, setExistingReport] = useState<ExistingReport | null>(null)
  const [reportId, setReportId] = useState<string | null>(null)
  const [leaseId, setLeaseId] = useState('')
  const [saving, setSaving] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)

  const effectivePropertyId = selectedPropertyId || selectedItemId

  const goBack = () => {
    setSelectedItemId('')
    setSelectedPropertyId('')
    setDashboardSection('inventory-reports')
  }

  // Load existing report data into the grid
  const loadReportIntoGrid = useCallback((report: ExistingReport) => {
    const newGrid = createDefaultGrid()
    for (const item of report.items) {
      const rowIdx = item.designationOrder - 1
      if (rowIdx < 0 || rowIdx >= DESIGNATIONS.length) continue

      const isKeyRow = rowIdx === 8
      const roomFields = ['kitchen', 'mainBathroom', 'otherBathroom', 'otherRoom1', 'otherRoom2'] as const
      const roomMapping = [0, 1, 2, 3, 4]

      for (let cIdx = 0; cIdx < roomMapping.length; cIdx++) {
        const colIdx = roomMapping[cIdx]
        const value = item[roomFields[cIdx]]

        if (isKeyRow && value) {
          const numMatch = value.match(/(\d+)/)
          newGrid[rowIdx][colIdx] = {
            ...defaultCellState(),
            keyCount: numMatch ? parseInt(numMatch[1], 10) : null,
            observation: item.observations || '',
          }
        } else {
          newGrid[rowIdx][colIdx] = {
            condition: (value === 'BON' || value === 'MAUVAIS') ? value : null,
            observation: item.observations || '',
            keyCount: null,
          }
        }
      }
    }
    setGrid(newGrid)
    setInventoryType(report.type)
    setGeneralObservations(report.generalObservations || '')
    setLeaseId(report.leaseId || '')
    setReportId(report.id)
  }, [])

  // Fetch data on mount
  useEffect(() => {
    if (!isAuthenticated || !selectedItemId) {
      setInitialLoading(false)
      return
    }

    const loadData = async () => {
      // Try to load as an existing report
      try {
        const d = await authFetch<{ reports: ExistingReport[] }>(`/api/tc/inventory-reports?propertyId=${selectedItemId}`)
        if (d.reports && d.reports.length > 0) {
          const match = d.reports.find((r: ExistingReport) => r.id === selectedItemId)
          if (match) {
            setExistingReport(match)
            loadReportIntoGrid(match)
            setPropertyInfo({
              id: match.property.id,
              title: match.property.title,
              type: '',
              commune: match.property.commune || '',
              images: [],
              owner: { id: '', firstName: '', lastName: '', phone: '', email: '' },
            })
            setInitialLoading(false)
            return
          }
        }
      } catch {
        // Continue
      }

      // Try to load by report ID directly
      try {
        const d = await authFetch<{ reports: ExistingReport[] }>('/api/tc/inventory-reports')
        const match = d.reports?.find((r: ExistingReport) => r.id === selectedItemId)
        if (match) {
          setExistingReport(match)
          loadReportIntoGrid(match)
          setPropertyInfo({
            id: match.property.id,
            title: match.property.title,
            type: '',
            commune: match.property.commune || '',
            images: [],
            owner: { id: '', firstName: '', lastName: '', phone: '', email: '' },
          })
          setInitialLoading(false)
          return
        }
      } catch {
        // Continue
      }

      // Otherwise, load property info for creating a new report
      const propId = effectivePropertyId
      if (propId) {
        try {
          const d = await authFetch<{ property: PropertyInfo }>(`/api/tc/verifications?propertyId=${propId}`)
          setPropertyInfo(d.property || null)
        } catch {
          try {
            const d2 = await authFetch<{ property: PropertyInfo }>(`/api/properties/${propId}`)
            setPropertyInfo(d2.property || null)
          } catch {
            setPropertyInfo(null)
          }
        }
      }

      setInitialLoading(false)
    }

    loadData()
  }, [isAuthenticated, selectedItemId, effectivePropertyId, loadReportIntoGrid])

  const setCondition = (rowIdx: number, colIdx: number, condition: Condition) => {
    setGrid((prev) => ({
      ...prev,
      [rowIdx]: {
        ...prev[rowIdx],
        [colIdx]: { ...prev[rowIdx][colIdx], condition },
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
    const items = []
    for (let r = 0; r < DESIGNATIONS.length; r++) {
      const isKeyRow = r === 8
      const cell0 = grid[r]?.[0]
      const cell1 = grid[r]?.[1]
      const cell2 = grid[r]?.[2]
      const cell3 = grid[r]?.[3]
      const cell4 = grid[r]?.[4]

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
      if (reportId) {
        await authFetch('/api/tc/inventory-reports', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reportId,
            items: buildItemsPayload(),
            generalObservations,
            totalKeys,
            status: 'DRAFT',
          }),
        })
      } else {
        await authFetch('/api/tc/inventory-reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            propertyId: effectivePropertyId,
            type: inventoryType,
            leaseId: leaseId || undefined,
            status: 'DRAFT',
            items: buildItemsPayload(),
            generalObservations,
            totalKeys,
          }),
        })
      }
      toast.success('Brouillon sauvegardé !')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  const handleValidate = async () => {
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
      if (reportId) {
        await authFetch('/api/tc/inventory-reports', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reportId,
            items: buildItemsPayload(),
            generalObservations,
            totalKeys,
            status: 'COMPLETED',
          }),
        })
      } else {
        await authFetch('/api/tc/inventory-reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            propertyId: effectivePropertyId,
            type: inventoryType,
            leaseId: leaseId || undefined,
            status: 'COMPLETED',
            items: buildItemsPayload(),
            generalObservations,
            totalKeys,
          }),
        })
      }
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
        <ArrowLeft className="size-4" /> Retour aux rapports
      </Button>

      {/* Header */}
      <Card className="border-border">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
                <FileText className="size-5 text-brand-500" />
                {reportId ? 'Modifier l\'État des Lieux' : 'État des Lieux'}
                {existingReport && (
                  <Badge variant="outline" className="ml-2 text-xs">Brouillon</Badge>
                )}
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
                  'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  inventoryType === 'INVENTORY_ENTRANCE'
                    ? 'bg-brand-500 text-white'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                Entrée
              </button>
              <button
                onClick={() => setInventoryType('INVENTORY_EXIT')}
                className={cn(
                  'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  inventoryType === 'INVENTORY_EXIT'
                    ? 'bg-brand-500 text-white'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                Sortie
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

      {/* Mobile hint */}
      <div className="sm:hidden flex items-center gap-2 px-1 text-xs text-muted-foreground">
        <Info className="size-3.5 shrink-0" />
        Faites défiler horizontalement pour voir toutes les colonnes
      </div>

      {/* The Table */}
      <Card className="border-border overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto -webkit-overflow-scrolling-touch">
            <table className="w-full min-w-[800px] sm:min-w-[900px] border-collapse">
              <thead>
                <tr className="bg-muted/50">
                  <th className="px-2 sm:px-3 py-3 text-left text-xs font-bold text-foreground border-b border-r border-border w-8 sm:w-10">
                    N°
                  </th>
                  <th className="px-2 sm:px-3 py-3 text-left text-xs font-bold text-foreground border-b border-r border-border min-w-[100px] sm:min-w-[140px]">
                    DÉSIGNATIONS
                  </th>
                  {ROOM_COLUMNS.map((col, i) => (
                    <th
                      key={i}
                      className="px-1 sm:px-2 py-3 text-center text-[9px] sm:text-[10px] font-bold text-foreground border-b border-r border-border min-w-[80px] sm:min-w-[110px] leading-tight"
                    >
                      {/* Show short labels on mobile, full labels on desktop */}
                      <span className="sm:hidden">{ROOM_COLUMNS_SHORT[i]}</span>
                      <span className="hidden sm:inline">{col}</span>
                    </th>
                  ))}
                  <th className="px-2 sm:px-3 py-3 text-left text-xs font-bold text-foreground border-b border-border min-w-[120px] sm:min-w-[150px]">
                    OBSERVATIONS
                  </th>
                </tr>
              </thead>

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
                      <td className="px-2 sm:px-3 py-2 sm:py-2.5 text-sm text-muted-foreground border-b border-r border-border text-center font-medium">
                        {rowIdx + 1}
                      </td>
                      <td className="px-2 sm:px-3 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-foreground border-b border-r border-border whitespace-nowrap">
                        {isKeyRow && <Key className="size-3 sm:size-3.5 inline mr-1 sm:mr-1.5 text-brand-500" />}
                        {designation}
                      </td>

                      {ROOM_COLUMNS.map((_, colIdx) => (
                        <td
                          key={colIdx}
                          className="px-1 sm:px-2 py-1.5 sm:py-2 border-b border-r border-border text-center"
                        >
                          {isKeyRow ? (
                            <Input
                              type="number"
                              min={0}
                              placeholder="—"
                              value={grid[rowIdx]?.[colIdx]?.keyCount ?? ''}
                              onChange={(e) => {
                                const val = e.target.value
                                setKeyCount(rowIdx, colIdx, val === '' ? null : parseInt(val, 10))
                              }}
                              className="w-14 sm:w-16 h-8 text-center text-sm mx-auto"
                            />
                          ) : (
                            <div className="flex items-center justify-center gap-0.5 sm:gap-1">
                              <button
                                onClick={() => setCondition(rowIdx, colIdx, 'BON')}
                                className={cn(
                                  'px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-[11px] font-bold transition-colors',
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
                                  'px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-[11px] font-bold transition-colors',
                                  grid[rowIdx]?.[colIdx]?.condition === 'MAUVAIS'
                                    ? 'bg-red-500 text-white shadow-sm'
                                    : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                                )}
                              >
                                M
                              </button>
                            </div>
                          )}
                        </td>
                      ))}

                      <td className="px-1 sm:px-2 py-1.5 sm:py-2 border-b border-border">
                        <Input
                          placeholder="..."
                          value={grid[rowIdx]?.[0]?.observation ?? ''}
                          onChange={(e) => {
                            const val = e.target.value
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
                          className="h-8 text-xs sm:text-sm"
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>

              <tfoot>
                <tr className="bg-muted/50">
                  <td colSpan={2} className="px-2 sm:px-3 py-3 text-xs sm:text-sm font-bold text-foreground border-t border-border text-right">
                    TOTAL :
                  </td>
                  <td colSpan={4} className="px-2 sm:px-3 py-3 border-t border-border text-center">
                    <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                      <Key className="size-3.5 sm:size-4 text-brand-500" />
                      <span className="text-lg sm:text-xl font-bold text-brand-500">{totalKeys}</span>
                      <span className="text-[10px] sm:text-xs text-muted-foreground">clé(s)</span>
                    </div>
                  </td>
                  <td className="px-2 sm:px-3 py-3 border-t border-border"></td>
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
          className="gap-2 order-3 sm:order-1"
        >
          <ArrowLeft className="size-4" /> Annuler
        </Button>
        <Button
          variant="outline"
          onClick={handleSaveDraft}
          disabled={saving}
          className="gap-2 border-brand-200 text-brand-600 hover:bg-brand-50 order-2 sm:order-2"
        >
          <Save className="size-4" /> Sauvegarder le brouillon
        </Button>
        <Button
          onClick={handleValidate}
          disabled={saving}
          className="bg-brand-500 hover:bg-brand-600 text-white gap-2 order-1 sm:order-3"
        >
          <CheckCircle2 className="size-4" /> Valider l&apos;état des lieux
        </Button>
      </div>
    </motion.div>
  )
}
