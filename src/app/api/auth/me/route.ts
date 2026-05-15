import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const userId = req.cookies.get('montoit-user-id')?.value

    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        phone: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        avatarUrl: true,
        isActive: true,
        isPhoneVerified: true,
      },
    })

    if (!user || !user.isActive) {
      const response = NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 401 })
      response.cookies.set('montoit-user-id', '', { maxAge: 0, path: '/' })
      return response
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Me error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
