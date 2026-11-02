'use client'

import { useEffect, useMemo, useState } from 'react'

interface UsePaginationOptions<T> {
  /** Liste complète à paginer */
  items: T[]
  /** Nombre d'éléments par page (défaut 10) */
  pageSize?: number
  /**
   * Valeur qui sert de "signature" des filtres en cours. Quand elle change,
   * la page courante est réinitialisée à 1 pour éviter d'afficher une page
   * vide après filtrage. Ex: `searchQuery + filterCommune + statusFilter`.
   */
  resetSignal?: unknown
}

interface UsePaginationResult<T> {
  /** Éléments de la page courante */
  paginatedItems: T[]
  /** Numéro de la page courante (1-indexé) */
  page: number
  /** Nombre total de pages (≥ 1) */
  totalPages: number
  /** Nombre total d'éléments avant pagination */
  total: number
  /** Taille de page utilisée */
  pageSize: number
  /** Setter pour changer de page (clampé entre 1 et totalPages) */
  setPage: (page: number) => void
}

/**
 * Pagination côté client pour les listes déjà chargées en mémoire.
 *
 * Usage :
 * ```tsx
 * const { paginatedItems, page, totalPages, total, pageSize, setPage } =
 *   usePagination({ items: filteredItems, pageSize: 12, resetSignal: searchQuery })
 *
 * return (
 *   <>
 *     {paginatedItems.map(...)}
 *     <PaginationControls page={page} totalPages={totalPages} total={total} limit={pageSize} onPageChange={setPage} />
 *   </>
 * )
 * ```
 *
 * Pour de la pagination côté serveur, utilise plutôt l'endpoint avec `?limit=&offset=`
 * directement et gère la page state localement.
 */
export function usePagination<T>({
  items,
  pageSize = 10,
  resetSignal,
}: UsePaginationOptions<T>): UsePaginationResult<T> {
  const [page, setPageRaw] = useState(1)

  const total = items.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  // Reset à la page 1 quand le signal de filtres change OU si on dépasse
  // le nombre de pages (ex: suppression d'un élément qui réduit la liste).
  useEffect(() => {
    setPageRaw(1)
  }, [resetSignal])

  useEffect(() => {
    if (page > totalPages) setPageRaw(totalPages)
  }, [page, totalPages])

  const setPage = (next: number) => {
    const clamped = Math.max(1, Math.min(next, totalPages))
    setPageRaw(clamped)
  }

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize
    return items.slice(start, start + pageSize)
  }, [items, page, pageSize])

  return { paginatedItems, page, totalPages, total, pageSize, setPage }
}
