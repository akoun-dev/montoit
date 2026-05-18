import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'

const OWNER_ROLES = ['PROPRIETAIRE', 'AGENCE']

// DELETE /api/properties/[id]/documents/[docId] — Delete a document from a property (owner only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const { id: propertyId, docId } = await params
    const auth = await resolveRequestUser(req)
    if (!auth || !auth.userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const userId = auth.userId

    const admin = getSupabaseAdminClient()

    const { data: user } = await admin
      .from('users')
      .select('role, active_role')
      .eq('id', userId)
      .maybeSingle()

    const role = user?.active_role || user?.role
    if (!role || !OWNER_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { data: document } = await admin
      .from('property_documents')
      .select('id, property_id')
      .eq('id', docId)
      .single()

    if (!document) {
      return NextResponse.json({ error: 'Document non trouvé' }, { status: 404 })
    }

    if (document.property_id !== propertyId) {
      return NextResponse.json({ error: 'Document non trouvé' }, { status: 404 })
    }

    const { data: property } = await admin
      .from('properties')
      .select('owner_id')
      .eq('id', propertyId)
      .single()

    if (!property || property.owner_id !== userId) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    await admin.from('property_documents').delete().eq('id', docId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Property document delete error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
