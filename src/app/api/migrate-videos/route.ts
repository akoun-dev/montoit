import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'
import {
  BUCKETS,
  uploadFromBase64,
  isBase64DataUrl,
  guessExtensionFromMime,
} from '@/lib/supabase/storage'

// POST /api/migrate-videos — One-time migration: move base64 virtual_tour_url to Storage
export async function POST(req: NextRequest) {
  try {
    const auth = await resolveRequestUser(req)
    if (!auth?.userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const admin = getSupabaseAdminClient()

    const { data: user } = await admin
      .from('users')
      .select('role')
      .eq('id', auth.userId)
      .single()

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès refusé — réservé aux administrateurs' }, { status: 403 })
    }

    // Find all properties with base64 virtual_tour_url
    const { data: properties, error } = await admin
      .from('properties')
      .select('id, virtual_tour_url, title')
      .not('virtual_tour_url', 'is', null)
      .not('virtual_tour_url', 'eq', '')

    if (error) {
      return NextResponse.json({ error: 'Erreur lors de la récupération des biens' }, { status: 500 })
    }

    const results: Array<{ id: string; title: string; status: string; error?: string }> = []
    let migrated = 0
    let skipped = 0
    let failed = 0

    for (const property of properties ?? []) {
      const url = property.virtual_tour_url

      if (!url || !isBase64DataUrl(url)) {
        results.push({
          id: property.id,
          title: property.title || '(sans titre)',
          status: 'skipped — already a URL',
        })
        skipped++
        continue
      }

      try {
        const ext = guessExtensionFromMime(url)
        const path = `properties/${property.id}/video-migration-${Date.now()}.${ext}`
        const storageUrl = await uploadFromBase64(BUCKETS.PROPERTY_VIDEOS, url, path)

        await admin
          .from('properties')
          .update({ virtual_tour_url: storageUrl } as any)
          .eq('id', property.id)

        results.push({
          id: property.id,
          title: property.title || '(sans titre)',
          status: 'migrated',
        })
        migrated++
      } catch (err) {
        results.push({
          id: property.id,
          title: property.title || '(sans titre)',
          status: 'failed',
          error: String(err),
        })
        failed++
      }
    }

    return NextResponse.json({
      message: 'Migration terminée',
      summary: { total: properties?.length ?? 0, migrated, skipped, failed },
      results,
    })
  } catch (error) {
    console.error('Migration error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
