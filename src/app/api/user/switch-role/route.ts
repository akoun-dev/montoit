import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdFromRequest } from '@/lib/session'

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { role } = await req.json()
    
    // Validate the role
    const validRoles = ['LOCATAIRE', 'PROPRIETAIRE', 'AGENCE']
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Rôle invalide' }, { status: 400 })
    }

    // Get current user to check their primary role
    const user = await db.user.findUnique({ where: { id: userId } })
    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })
    }

    // ADMIN and TIERS_CONFIANCE cannot switch roles
    if (user.role === 'ADMIN' || user.role === 'TIERS_CONFIANCE') {
      return NextResponse.json({ error: 'Ce rôle ne peut pas être changé' }, { status: 403 })
    }

    // Update the active role
    const updatedUser = await db.user.update({
      where: { id: userId },
      data: { activeRole: role },
    })

    return NextResponse.json({ 
      success: true, 
      activeRole: updatedUser.activeRole 
    })
  } catch (error) {
    console.error('Switch role error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
