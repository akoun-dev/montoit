import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdFromRequest } from '@/lib/session'

/**
 * PATCH /api/user/profile — Update owner-specific profile info
 * Body: { firstName?, lastName?, phone?, email?, bio?, companyName?, showPhone?, showEmail?, displayName? }
 */
export async function PATCH(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body = await req.json()
    const updateData: Record<string, unknown> = {}

    if (body.firstName !== undefined) {
      if (typeof body.firstName !== 'string' || body.firstName.trim().length < 1) {
        return NextResponse.json({ error: 'Le prénom est requis' }, { status: 400 })
      }
      updateData.firstName = body.firstName.trim()
    }

    if (body.lastName !== undefined) {
      if (typeof body.lastName !== 'string' || body.lastName.trim().length < 1) {
        return NextResponse.json({ error: 'Le nom est requis' }, { status: 400 })
      }
      updateData.lastName = body.lastName.trim()
    }

    if (body.phone !== undefined) {
      updateData.phone = body.phone?.trim() || null
    }

    if (body.bio !== undefined) {
      if (body.bio && body.bio.length > 500) {
        return NextResponse.json({ error: 'La biographie ne peut pas dépasser 500 caractères' }, { status: 400 })
      }
      updateData.bio = body.bio?.trim() || null
    }

    if (body.companyName !== undefined) {
      updateData.companyName = body.companyName?.trim() || null
    }

    if (body.showPhone !== undefined) {
      if (typeof body.showPhone !== 'boolean') {
        return NextResponse.json({ error: 'showPhone doit être un booléen' }, { status: 400 })
      }
      updateData.showPhone = body.showPhone
    }

    if (body.showEmail !== undefined) {
      if (typeof body.showEmail !== 'boolean') {
        return NextResponse.json({ error: 'showEmail doit être un booléen' }, { status: 400 })
      }
      updateData.showEmail = body.showEmail
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
        avatarUrl: true,
        bio: true,
        companyName: true,
        showPhone: true,
        showEmail: true,
        isEmailVerified: true,
        isPhoneVerified: true,
        role: true,
      },
    })

    return NextResponse.json({ user: updatedUser })
  } catch (error) {
    console.error('Profile PATCH error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
