import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const { phone, firstName, lastName, email, role } = await req.json()

    if (!phone || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'Téléphone, prénom et nom sont requis' },
        { status: 400 }
      )
    }

    // Check if user already exists and is verified
    const existingUser = await db.user.findUnique({ where: { phone } })

    if (existingUser && existingUser.isPhoneVerified) {
      return NextResponse.json({ error: 'Un compte existe déjà avec ce numéro' }, { status: 400 })
    }

    let user

    if (existingUser && !existingUser.isPhoneVerified) {
      // Update the temp user
      user = await db.user.update({
        where: { id: existingUser.id },
        data: {
          firstName,
          lastName,
          email: email || null,
          role: role || 'LOCATAIRE',
          isPhoneVerified: true,
          isActive: true,
        },
      })
    } else {
      // Create new user
      user = await db.user.create({
        data: {
          phone,
          firstName,
          lastName,
          email: email || null,
          role: role || 'LOCATAIRE',
          isPhoneVerified: true,
          isActive: true,
        },
      })
    }

    const response = NextResponse.json({
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        avatarUrl: user.avatarUrl,
        isActive: user.isActive,
        isPhoneVerified: user.isPhoneVerified,
      },
    })

    response.cookies.set('montoit-user-id', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Register error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
