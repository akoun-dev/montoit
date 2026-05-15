import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { generateOtpCode, sendOtpEmail, sendOtpSms } from '@/lib/ansut-messaging'

const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES || '5', 10)

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
        // Allow re-registration if the account is NOT verified yet
        if (existingEmail.isEmailVerified) {
          return NextResponse.json(
            { error: 'Un compte vérifié existe déjà avec cet email. Essayez de vous connecter.' },
            { status: 400 }
          )
        }

        // Unverified account → update their info and re-send OTP
        const passwordHash = await bcrypt.hash(password, 12)

        const user = await db.user.update({
          where: { id: existingEmail.id },
          data: {
            passwordHash,
            firstName,
            lastName,
            phone: phone || existingEmail.phone,
            role: role || existingEmail.role,
          },
        })

        // Invalidate existing unused OTP codes for this email
        await db.oTPCode.updateMany({
          where: { email, isUsed: false, type: 'EMAIL_VERIFY' },
          data: { isUsed: true },
        })

        // Generate and store new email verification OTP
        const otpCode = generateOtpCode(6)
        await db.oTPCode.create({
          data: {
            email,
            code: otpCode,
            type: 'EMAIL_VERIFY',
            expiresAt: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000),
            userId: user.id,
          },
        })

        // Send verification email via ANSUT
        const emailResult = await sendOtpEmail(email, otpCode, firstName, 'email_verify')
        if (!emailResult.success) {
          console.warn(`[Register] Email send failed for ${email}, but OTP stored. Code: ${otpCode}`)
        }

        const isDev = process.env.NODE_ENV !== 'production'
        return NextResponse.json({
          user: {
            id: user.id,
            phone: user.phone,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            avatarUrl: user.avatarUrl,
            isActive: user.isActive,
            isEmailVerified: false,
          },
          needsVerification: true,
          verificationMethod: 'email',
          ...(isDev && { devCode: otpCode }),
        })
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

      // Create user — NOT verified, NOT authenticated
      const user = await db.user.create({
        data: {
          email,
          passwordHash,
          firstName,
          lastName,
          phone: phone || null,
          role: role || 'LOCATAIRE',
          isEmailVerified: false,  // Must verify via OTP
          isPhoneVerified: false,
          isActive: true,
        },
      })

      // Generate and store email verification OTP
      const otpCode = generateOtpCode(6)
      await db.oTPCode.create({
        data: {
          email,
          code: otpCode,
          type: 'EMAIL_VERIFY',
          expiresAt: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000),
          userId: user.id,
        },
      })

      // Send verification email via ANSUT
      const emailResult = await sendOtpEmail(email, otpCode, firstName, 'email_verify')
      if (!emailResult.success) {
        console.warn(`[Register] Email send failed for ${email}, but OTP stored. Code: ${otpCode}`)
      }

      // Return user data WITHOUT cookie — user must verify OTP first
      const isDev = process.env.NODE_ENV !== 'production'
      return NextResponse.json({
        user: {
          id: user.id,
          phone: user.phone,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          avatarUrl: user.avatarUrl,
          isActive: user.isActive,
          isEmailVerified: false,
        },
        needsVerification: true,
        verificationMethod: 'email',
        ...(isDev && { devCode: otpCode }),
      })

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
          // Allow if the other account is not verified
          if (existingEmail.isEmailVerified) {
            return NextResponse.json(
              { error: 'Un compte vérifié existe déjà avec cet email' },
              { status: 400 }
            )
          }
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
            isPhoneVerified: false,  // Must verify via OTP
            isActive: true,
            passwordHash: await bcrypt.hash(`sms-${Date.now()}-${Math.random()}`, 12),
          },
        })
      } else if (existingUser && !existingUser.isPhoneVerified) {
        // Unverified account → update their info and re-send OTP
        user = await db.user.update({
          where: { id: existingUser.id },
          data: {
            firstName,
            lastName,
            email: email || existingUser.email,
            role: role || existingUser.role,
            isActive: true,
          },
        })
      } else if (existingUser) {
        return NextResponse.json(
          { error: 'Un compte vérifié existe déjà avec ce numéro. Essayez de vous connecter.' },
          { status: 400 }
        )
      } else {
        // Create new user — NOT verified, NOT authenticated
        user = await db.user.create({
          data: {
            phone,
            email: email || `sms-${Date.now()}@temp.ci`,
            passwordHash: await bcrypt.hash(`sms-${Date.now()}-${Math.random()}`, 12),
            firstName,
            lastName,
            role: role || 'LOCATAIRE',
            isPhoneVerified: false,  // Must verify via OTP
            isActive: true,
          },
        })
      }

      // Invalidate existing unused LOGIN OTP codes for this phone
      const existingOtps = await db.oTPCode.findMany({
        where: { phone, isUsed: false, type: 'LOGIN' },
      })
      for (const otp of existingOtps) {
        await db.oTPCode.update({ where: { id: otp.id }, data: { isUsed: true } })
      }

      // Generate and store SMS verification OTP
      const otpCode = generateOtpCode(6)
      await db.oTPCode.create({
        data: {
          phone,
          code: otpCode,
          type: 'LOGIN',
          expiresAt: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000),
          userId: user.id,
        },
      })

      // Send verification SMS via ANSUT
      const smsResult = await sendOtpSms(phone, otpCode, 'login')
      if (!smsResult.success) {
        console.warn(`[Register] SMS send failed for ${phone}, but OTP stored. Code: ${otpCode}`)
      }

      // Return user data WITHOUT cookie — user must verify OTP first
      const isDev = process.env.NODE_ENV !== 'production'
      return NextResponse.json({
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
        needsVerification: true,
        verificationMethod: 'sms',
        ...(isDev && { devCode: otpCode }),
      })
    }

    return NextResponse.json({ error: 'Méthode d\'inscription non valide' }, { status: 400 })
  } catch (error) {
    console.error('Register error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
