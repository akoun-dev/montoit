import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const { phone, email, firstName, lastName, role } = await req.json()

    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: 'Prénom et nom sont requis' },
        { status: 400 }
      )
    }

    if (!phone && !email) {
      return NextResponse.json(
        { error: 'Numéro de téléphone ou adresse email requis' },
        { status: 400 }
      )
    }

    // Check if user already exists with this phone
    let existingUser = null
    if (phone) {
      existingUser = await db.user.findUnique({ where: { phone } })
    }

    // Also check by email if provided
    if (!existingUser && email) {
      existingUser = await db.user.findUnique({ where: { email } })
    }

    if (existingUser && existingUser.isPhoneVerified) {
      return NextResponse.json({ error: 'Un compte existe déjà avec cet identifiant' }, { status: 400 })
    }

    let user

    if (existingUser && !existingUser.isPhoneVerified) {
      // Update the temp user
      user = await db.user.update({
        where: { id: existingUser.id },
        data: {
          firstName,
          lastName,
          email: email || existingUser.email || null,
          phone: phone || existingUser.phone,
          role: role || 'LOCATAIRE',
          isPhoneVerified: !!phone,
          isEmailVerified: !!email,
          isActive: true,
        },
      })
    } else {
      // Create new user
      // For email-only signup, generate a placeholder phone
      const userPhone = phone || `email-${Date.now()}`

      user = await db.user.create({
        data: {
          phone: userPhone,
          email: email || null,
          firstName,
          lastName,
          role: role || 'LOCATAIRE',
          isPhoneVerified: !!phone,
          isEmailVerified: !!email,
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
