import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdFromRequest } from '@/lib/session'
import { notify } from '@/lib/notify'

// POST /api/profile/share — Share profile with another user via email
export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body = await req.json()
    const { email } = body

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Adresse email invalide' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Get the current user
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, firstName: true, lastName: true, role: true, activeRole: true, email: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
    }

    // Don't allow sharing with yourself
    if (normalizedEmail === user.email.toLowerCase()) {
      return NextResponse.json({ error: 'Vous ne pouvez pas partager votre profil avec vous-même' }, { status: 400 })
    }

    // Find the target user by email
    const targetUser = await db.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, firstName: true, lastName: true },
    })

    const effectiveRole = user.activeRole || user.role
    const roleLabel = effectiveRole === 'PROPRIETAIRE' ? 'propriétaire' : effectiveRole === 'LOCATAIRE' ? 'locataire' : effectiveRole.toLowerCase()

    // Create a notification for the target user if they exist
    if (targetUser) {
      await notify({
        userId: targetUser.id,
        type: 'SYSTEM',
        title: 'Profil partagé',
        message: `${user.firstName} ${user.lastName} a partagé son profil ${roleLabel} avec vous.`,
        actionUrl: 'settings',
      })
    }

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'PROFILE_SHARE',
        entity: 'USER',
        entityId: user.id,
        details: `Profil ${roleLabel} partagé avec ${normalizedEmail}`,
      },
    })

    // Generate a shareable profile link
    const profileLink = `/profil/${user.id}`

    return NextResponse.json({
      success: true,
      message: targetUser
        ? `Lien de partage envoyé à ${targetUser.firstName} ${targetUser.lastName}`
        : `Lien de partage envoyé à ${normalizedEmail}`,
      profileLink,
      targetFound: !!targetUser,
    })
  } catch (error) {
    console.error('Profile share error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
