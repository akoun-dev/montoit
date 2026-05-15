import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * GET /api/profile — Fetch current user profile (with scoring-related fields)
 * PUT /api/profile — Update user profile fields
 */
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
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        gender: true,
        city: true,
        address: true,
        avatarUrl: true,
        neofaceVerified: true,
        oneciVerified: true,
        isEmailVerified: true,
        isPhoneVerified: true,
        role: true,
        createdAt: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Profile GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const userId = req.cookies.get('montoit-user-id')?.value
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body = await req.json()
    const { firstName, lastName, phone, gender, city, address } = body

    // Validate fields
    const updateData: Record<string, unknown> = {}

    if (firstName !== undefined) {
      if (typeof firstName !== 'string' || firstName.trim().length < 1) {
        return NextResponse.json({ error: 'Le prénom est requis' }, { status: 400 })
      }
      updateData.firstName = firstName.trim()
    }

    if (lastName !== undefined) {
      if (typeof lastName !== 'string' || lastName.trim().length < 1) {
        return NextResponse.json({ error: 'Le nom est requis' }, { status: 400 })
      }
      updateData.lastName = lastName.trim()
    }

    if (phone !== undefined) {
      // Allow clearing phone
      updateData.phone = phone?.trim() || null
    }

    if (gender !== undefined) {
      const validGenders = ['M', 'F', 'AUTRE']
      if (gender && !validGenders.includes(gender)) {
        return NextResponse.json({ error: 'Genre invalide' }, { status: 400 })
      }
      updateData.gender = gender || null
    }

    if (city !== undefined) {
      updateData.city = city?.trim() || null
    }

    if (address !== undefined) {
      updateData.address = address?.trim() || null
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Aucune donnée à mettre à jour' }, { status: 400 })
    }

    const updatedUser = await db.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        gender: true,
        city: true,
        address: true,
        avatarUrl: true,
        neofaceVerified: true,
        oneciVerified: true,
        isEmailVerified: true,
        isPhoneVerified: true,
        role: true,
      },
    })

    return NextResponse.json({ user: updatedUser })
  } catch (error) {
    console.error('Profile PUT error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
