import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  try {
    const { email, password, firstName, lastName, phone, role, method } = await req.json()

    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: 'Prénom et nom sont requis' },
        { status: 400 }
      )
    }

    if (method === 'email') {
      // ─── Email + Password registration ─────────────────────
      if (!email || !password) {
        return NextResponse.json(
          { error: 'Email et mot de passe sont requis' },
          { status: 400 }
        )
      }

      // Validate password strength
      if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
        return NextResponse.json(
          { error: 'Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule et un chiffre' },
          { status: 400 }
        )
      }

      // Check if user already exists with this email
      const existingEmail = await db.user.findUnique({ where: { email } })
      if (existingEmail) {
        return NextResponse.json(
          { error: 'Un compte existe déjà avec cet email' },
          { status: 400 }
        )
      }

      // Check phone uniqueness if provided
      if (phone) {
        const existingPhone = await db.user.findUnique({ where: { phone } })
        if (existingPhone) {
          return NextResponse.json(
            { error: 'Un compte existe déjà avec ce numéro de téléphone' },
            { status: 400 }
          )
        }
      }

      const passwordHash = await bcrypt.hash(password, 12)

      const user = await db.user.create({
        data: {
          email,
          passwordHash,
          firstName,
          lastName,
          phone: phone || null,
          role: role || 'LOCATAIRE',
          isEmailVerified: true,
          isPhoneVerified: !!phone,
          isActive: true,
        },
      })

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
          isEmailVerified: user.isEmailVerified,
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
    } else if (method === 'sms') {
      // ─── SMS registration (no password) ─────────────────────
      if (!phone) {
        return NextResponse.json(
          { error: 'Numéro de téléphone requis' },
          { status: 400 }
        )
      }

      // Find existing user by phone (could be the temp user from OTP flow)
      const existingUser = await db.user.findUnique({ where: { phone } })

      // Check email uniqueness if provided
      if (email) {
        const existingEmail = await db.user.findUnique({ where: { email } })
        if (existingEmail && existingEmail.phone !== phone) {
          return NextResponse.json(
            { error: 'Un compte existe déjà avec cet email' },
            { status: 400 }
          )
        }
      }

      let user

      if (existingUser && existingUser.firstName === 'Temp' && existingUser.lastName === 'User') {
        // Update the temp user with real data
        user = await db.user.update({
          where: { id: existingUser.id },
          data: {
            firstName,
            lastName,
            email: email || existingUser.email,
            role: role || 'LOCATAIRE',
            isPhoneVerified: true,
            isActive: true,
            // Generate a random password hash for SMS users (they login via OTP)
            passwordHash: await bcrypt.hash(`sms-${Date.now()}-${Math.random()}`, 12),
          },
        })
      } else if (existingUser) {
        return NextResponse.json(
          { error: 'Un compte existe déjà avec ce numéro' },
          { status: 400 }
        )
      } else {
        // Create new user
        user = await db.user.create({
          data: {
            phone,
            email: email || `sms-${Date.now()}@temp.ci`,
            passwordHash: await bcrypt.hash(`sms-${Date.now()}-${Math.random()}`, 12),
            firstName,
            lastName,
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
          isEmailVerified: user.isEmailVerified,
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
    }

    return NextResponse.json({ error: 'Méthode d\'inscription non valide' }, { status: 400 })
  } catch (error) {
    console.error('Register error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
