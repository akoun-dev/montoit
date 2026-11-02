/**
 * IndexedDB-based draft image storage.
 *
 * Keeps uploaded File objects across page refreshes so the user never loses
 * their photos when the browser tab is accidentally closed / refreshed.
 *
 * ── Schema ──────────────────────────────────────────────────────────────────
 * Database : MontoitDraftDB (v1)
 * Store    : propertyImages
 *   { id: string, file: File, uploadedAt: number }
 *
 * ── Usage ───────────────────────────────────────────────────────────────────
 *   const files = await loadDraftImages()  // → File[]
 *   await saveDraftImages(files)            // overwrites the store
 *   await clearDraftImages()                // removes everything
 * ────────────────────────────────────────────────────────────────────────────
 */

const DB_NAME = 'MontoitDraftDB'
const STORE_NAME = 'propertyImages'
const DB_VERSION = 1

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)

    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }

    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

/**
 * Persist an array of File objects into IndexedDB.
 * Each file gets a unique id and a timestamp. Previous entries are replaced.
 */
export async function saveDraftImages(files: File[]): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)

    // Clear previous entries first
    store.clear()

    for (const file of files) {
      store.add({
        id: crypto.randomUUID(),
        file,
        uploadedAt: Date.now(),
      })
    }

    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(new Error('Transaction aborted'))
  })
}

/**
 * Load all File objects previously stored in IndexedDB.
 * Returns an empty array if no images found or on error.
 */
export async function loadDraftImages(): Promise<File[]> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const req = store.getAll()

      req.onsuccess = () => {
        const entries = req.result as Array<{ id: string; file: File; uploadedAt: number }> | undefined
        if (!entries || entries.length === 0) {
          resolve([])
          return
        }
        // Filter out entries older than 24 hours as cleanup
        const cutoff = Date.now() - 24 * 60 * 60 * 1000
        const valid = entries.filter((e) => e.uploadedAt > cutoff)
        resolve(valid.map((e) => e.file))
      }
      req.onerror = () => reject(req.error)
    })
  } catch {
    return []
  }
}

/**
 * Remove all draft images from IndexedDB.
 * Should be called after a successful publish or when the draft is discarded.
 */
export async function clearDraftImages(): Promise<void> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      store.clear()
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    // silently fail – nothing critical
  }
}

/**
 * Check if any draft images exist in IndexedDB.
 */
export async function hasDraftImages(): Promise<boolean> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const req = store.count()
      req.onsuccess = () => resolve(req.result > 0)
      req.onerror = () => reject(req.error)
    })
  } catch {
    return false
  }
}
