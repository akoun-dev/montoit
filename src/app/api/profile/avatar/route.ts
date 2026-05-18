import { NextRequest, NextResponse } from 'next/server'
import { resolveRequestUser } from '@/lib/auth/request-user'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { getUserProfileById } from '@/lib/supabase/email-auth'
import { toAuthUser } from '@/lib/supabase/profile'
import {
  BUCKETS,
  deleteFromStorage,
  extractBucketAndPath,
  uploadFromBase64,
} from '@/lib/supabase/storage'

export async function POST(req: NextRequest) {
  try {
    const { userId, applyCookies } = await resolveRequestUser(req)
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body = await req.json()
    const { avatar } = body as { avatar?: string }

    if (!avatar) {
      return NextResponse.json({ error: 'Image requise' }, { status: 400 })
    }

    const dataUrlRegex = /^data:image\/(jpeg|jpg|png|webp);base64,/
    if (!dataUrlRegex.test(avatar)) {
      return NextResponse.json(
        { error: 'Format d\'image invalide. Utilisez JPG, PNG ou WEBP.' },
        { status: 400 }
      )
    }

    const base64Payload = avatar.split(',')[1]
    if (!base64Payload) {
      return NextResponse.json({ error: 'Image invalide' }, { status: 400 })
    }

    const estimatedSizeBytes = (base64Payload.length * 3) / 4
    const MAX_SIZE = 2 * 1024 * 1024
    if (estimatedSizeBytes > MAX_SIZE) {
      return NextResponse.json(
        { error: 'L\'image est trop volumineuse (max 2 Mo).' },
        { status: 400 }
      )
    }

    const extMatch = avatar.match(/^data:image\/(jpeg|jpg|png|webp);/)
    const ext = extMatch?.[1] === 'jpeg' ? 'jpg' : extMatch?.[1] || 'png'
    const filePath = `${userId}/avatar.${ext}`
    const publicUrl = await uploadFromBase64(BUCKETS.AVATARS, avatar, filePath)

    const admin = getSupabaseAdminClient()
    const { error } = await admin
      .from('users')
      .update({ avatar_url: publicUrl })
      .eq('id', userId)

    if (error) {
      throw error
    }

    const updatedUser = await getUserProfileById(admin, userId)
    if (!updatedUser) {
      const response = NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })
      return applyCookies(response)
    }

    const response = NextResponse.json({ user: toAuthUser(updatedUser) })
    return applyCookies(response)
  } catch (error) {
    console.error('Avatar upload error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { userId, applyCookies } = await resolveRequestUser(req)
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const admin = getSupabaseAdminClient()
    const current = await getUserProfileById(admin, userId)

    if (current?.avatar_url) {
      const parsed = extractBucketAndPath(current.avatar_url)
      if (parsed?.bucket === BUCKETS.AVATARS) {
        await deleteFromStorage(BUCKETS.AVATARS, parsed.path).catch(() => {})
      }
    }

    const { error } = await admin
      .from('users')
      .update({ avatar_url: null })
      .eq('id', userId)

    if (error) {
      throw error
    }

    const updatedUser = await getUserProfileById(admin, userId)
    if (!updatedUser) {
      const response = NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })
      return applyCookies(response)
    }

    const response = NextResponse.json({ user: toAuthUser(updatedUser) })
    return applyCookies(response)
  } catch (error) {
    console.error('Avatar delete error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
