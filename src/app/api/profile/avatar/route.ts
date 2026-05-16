import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdFromRequest } from '@/lib/session'

/**
 * POST /api/profile/avatar — Upload avatar image
 * Body: { avatar: "<base64-encoded-image>" }
 * Accepts JPEG/PNG/WEBP, max 2MB after base64 decode
 * Stores as data URL in user.avatarUrl
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body = await req.json()
    const { avatar } = body as { avatar?: string }

    if (!avatar) {
      return NextResponse.json({ error: 'Image requise' }, { status: 400 })
    }

    // Validate base64 data URL format
    const dataUrlRegex = /^data:image\/(jpeg|jpg|png|webp);base64,/
    if (!dataUrlRegex.test(avatar)) {
      return NextResponse.json(
        { error: 'Format d\'image invalide. Utilisez JPG, PNG ou WEBP.' },
        { status: 400 }
      )
    }

    // Extract base64 payload and check size
    const base64Payload = avatar.split(',')[1]
    if (!base64Payload) {
      return NextResponse.json({ error: 'Image invalide' }, { status: 400 })
    }

    // Estimate decoded size (base64 is ~33% larger than raw)
    const estimatedSizeBytes = (base64Payload.length * 3) / 4
    const MAX_SIZE = 2 * 1024 * 1024 // 2MB
    if (estimatedSizeBytes > MAX_SIZE) {
      return NextResponse.json(
        { error: 'L\'image est trop volumineuse (max 2 Mo).' },
        { status: 400 }
      )
    }

    // Update user avatar
    const updatedUser = await db.user.update({
      where: { id: userId },
      data: { avatarUrl: avatar },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        avatarUrl: true,
        isActive: true,
        isEmailVerified: true,
      },
    })

    return NextResponse.json({ user: updatedUser })
  } catch (error) {
    console.error('Avatar upload error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

/**
 * DELETE /api/profile/avatar — Remove avatar image
 */
export async function DELETE(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const updatedUser = await db.user.update({
      where: { id: userId },
      data: { avatarUrl: null },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        avatarUrl: true,
        isActive: true,
        isEmailVerified: true,
      },
    })

    return NextResponse.json({ user: updatedUser })
  } catch (error) {
    console.error('Avatar delete error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
