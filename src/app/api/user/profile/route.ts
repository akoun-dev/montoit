import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'

export async function PATCH(req: NextRequest) {
  try {
    const { userId, applyCookies } = await resolveRequestUser(req)
    if (!userId) {
      const resp = NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
      return applyCookies(resp)
    }

    const supabase = getSupabaseAdminClient()

    const body = await req.json()
    const updateData: Record<string, unknown> = {}

    if (body.firstName !== undefined) {
      if (typeof body.firstName !== 'string' || body.firstName.trim().length < 1) {
        return NextResponse.json({ error: 'Le prénom est requis' }, { status: 400 })
      }
      updateData.first_name = body.firstName.trim()
    }

    if (body.lastName !== undefined) {
      if (typeof body.lastName !== 'string' || body.lastName.trim().length < 1) {
        return NextResponse.json({ error: 'Le nom est requis' }, { status: 400 })
      }
      updateData.last_name = body.lastName.trim()
    }

    if (body.phone !== undefined) {
      const cleanedPhone = body.phone?.trim() || null
      if (cleanedPhone && cleanedPhone.length !== 10) {
        return NextResponse.json(
          { error: 'Numéro de téléphone ivoirien invalide (10 chiffres requis)' },
          { status: 400 }
        )
      }
      updateData.phone = cleanedPhone
    }

    if (body.bio !== undefined) {
      if (body.bio && body.bio.length > 500) {
        return NextResponse.json({ error: 'La biographie ne peut pas dépasser 500 caractères' }, { status: 400 })
      }
      updateData.bio = body.bio?.trim() || null
    }

    if (body.companyName !== undefined) {
      updateData.company_name = body.companyName?.trim() || null
    }

    if (body.showPhone !== undefined) {
      if (typeof body.showPhone !== 'boolean') {
        return NextResponse.json({ error: 'showPhone doit être un booléen' }, { status: 400 })
      }
      updateData.show_phone = body.showPhone
    }

    if (body.showEmail !== undefined) {
      if (typeof body.showEmail !== 'boolean') {
        return NextResponse.json({ error: 'showEmail doit être un booléen' }, { status: 400 })
      }
      updateData.show_email = body.showEmail
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Aucune donnée à mettre à jour' }, { status: 400 })
    }

    const { data: updatedUser } = await ((supabase as any)
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select('id, first_name, last_name, email, phone, avatar_url, bio, company_name, show_phone, show_email, is_email_verified, is_phone_verified, role')
      .single() as any)

    const resp = NextResponse.json({
      user: {
        id: updatedUser.id,
        firstName: updatedUser.first_name,
        lastName: updatedUser.last_name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        avatarUrl: updatedUser.avatar_url,
        bio: updatedUser.bio,
        companyName: updatedUser.company_name,
        showPhone: updatedUser.show_phone,
        showEmail: updatedUser.show_email,
        isEmailVerified: updatedUser.is_email_verified,
        isPhoneVerified: updatedUser.is_phone_verified,
        role: updatedUser.role,
      },
    })
    return applyCookies(resp)
  } catch (error) {
    console.error('Profile PATCH error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
