/**
 * Brouillon local d'une mission (page /m/[token]) — tolérance hors-ligne (spec TC-001 §7/§8).
 *
 * - localStorage `mission-draft-<token>` : cochages, notes, chemins des photos DÉJÀ uploadées,
 *   statut "mission démarrée" → survit à une coupure réseau ou à un refresh.
 * - IndexedDB `MontoitMissionDraftDB` (store `missionFiles`) : fichiers locaux PAS ENCORE envoyés,
 *   pour pouvoir réessayer l'upload après une perte de réseau (localStorage ne stocke pas des File).
 *
 * Données : aucun contenu de mission — uniquement des IDs, du texte saisi par l'agent et des
 * chemins Storage. Tout est purgé après une soumission réussie.
 */

const DRAFT_KEY_PREFIX = 'mission-draft-'
const IDB_NAME = 'MontoitMissionDraftDB'
const IDB_VERSION = 1
const IDB_STORE = 'missionFiles'
/** Purge automatique des fichiers orphelins (> TTL d'un token, 72 h). */
const FILE_TTL_MS = 72 * 60 * 60 * 1000

export interface MissionDraft {
  checkedIds: string[]
  notes: string
  uploadedPaths: string[]
  startedLocally: boolean
  savedAt: number
}

export function draftKey(token: string): string {
  return `${DRAFT_KEY_PREFIX}${token}`
}

export function loadMissionDraft(token: string): MissionDraft | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(draftKey(token))
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<MissionDraft>
    if (!parsed || typeof parsed !== 'object') return null
    return {
      checkedIds: Array.isArray(parsed.checkedIds)
        ? parsed.checkedIds.filter((value): value is string => typeof value === 'string')
        : [],
      notes: typeof parsed.notes === 'string' ? parsed.notes : '',
      uploadedPaths: Array.isArray(parsed.uploadedPaths)
        ? parsed.uploadedPaths.filter((value): value is string => typeof value === 'string')
        : [],
      startedLocally: parsed.startedLocally === true,
      savedAt: typeof parsed.savedAt === 'number' ? parsed.savedAt : Date.now(),
    }
  } catch {
    return null
  }
}

export function saveMissionDraft(token: string, draft: Omit<MissionDraft, 'savedAt'>): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(draftKey(token), JSON.stringify({ ...draft, savedAt: Date.now() }))
  } catch {
    // Quota / navigation privée : le brouillon est un confort, jamais bloquant.
  }
}

export function clearMissionDraft(token: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(draftKey(token))
  } catch {
    // noop
  }
}

// ── IndexedDB — fichiers locaux en attente d'upload ──────────────────────────

interface MissionDraftFileRecord {
  key: string // `${token}::${id}`
  token: string
  id: string
  file: File
  savedAt: number
}

export interface MissionDraftFile {
  id: string
  file: File
}

function openMissionDraftDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, IDB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, { keyPath: 'key' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/** Remplace les fichiers en attente de CE token (les autres tokens ne sont pas touchés). */
export async function saveMissionFiles(token: string, files: MissionDraftFile[]): Promise<void> {
  try {
    const db = await openMissionDraftDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite')
      const store = tx.objectStore(IDB_STORE)
      const getAll = store.getAll()

      getAll.onsuccess = () => {
        const entries = (getAll.result as MissionDraftFileRecord[] | undefined) ?? []
        const cutoff = Date.now() - FILE_TTL_MS
        for (const entry of entries) {
          if (entry.token === token || entry.savedAt < cutoff) {
            store.delete(entry.key)
          }
        }
        for (const item of files) {
          const record: MissionDraftFileRecord = {
            key: `${token}::${item.id}`,
            token,
            id: item.id,
            file: item.file,
            savedAt: Date.now(),
          }
          store.put(record)
        }
      }

      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(new Error('Transaction abortée'))
    })
    db.close()
  } catch {
    // IndexedDB indisponible — dégradation silencieuse (le retry reste possible dans la session).
  }
}

export async function loadMissionFiles(token: string): Promise<MissionDraftFile[]> {
  try {
    const db = await openMissionDraftDb()
    const result = await new Promise<MissionDraftFile[]>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly')
      const store = tx.objectStore(IDB_STORE)
      const getAll = store.getAll()
      getAll.onsuccess = () => {
        const entries = (getAll.result as MissionDraftFileRecord[] | undefined) ?? []
        const cutoff = Date.now() - FILE_TTL_MS
        resolve(
          entries
            .filter((entry) => entry.token === token && entry.savedAt >= cutoff)
            .map((entry) => ({ id: entry.id, file: entry.file })),
        )
      }
      getAll.onerror = () => reject(getAll.error)
    })
    db.close()
    return result
  } catch {
    return []
  }
}

export async function clearMissionFiles(token: string): Promise<void> {
  try {
    const db = await openMissionDraftDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite')
      const store = tx.objectStore(IDB_STORE)
      const getAll = store.getAll()
      getAll.onsuccess = () => {
        const entries = (getAll.result as MissionDraftFileRecord[] | undefined) ?? []
        for (const entry of entries) {
          if (entry.token === token) store.delete(entry.key)
        }
      }
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(new Error('Transaction abortée'))
    })
    db.close()
  } catch {
    // noop
  }
}
