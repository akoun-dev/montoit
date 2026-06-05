import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'
import crypto from 'crypto'
import { notify, notifyLeaseActivated, notifyNewLease } from '@/lib/notify'

function generateId() {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function mapLease(lease: Record<string, unknown>) {
  return {
    id: lease.id,
    status: lease.status,
    propertyId: lease.property_id,
    tenantId: lease.tenant_id,
    ownerId: lease.owner_id,
    rentalFileId: lease.rental_file_id,
    monthlyRent: lease.monthly_rent,
    charges: lease.charges,
    deposit: lease.deposit,
    startDate: lease.start_date,
    endDate: lease.end_date,
    specialConditions: lease.special_conditions,
    ownerSignedAt: lease.owner_signed_at,
    tenantSignedAt: lease.tenant_signed_at,
    ownerSignOtp: lease.owner_sign_otp,
    tenantSignOtp: lease.tenant_sign_otp,
    ownerSignatureImage: lease.owner_signature_image,
    tenantSignatureImage: lease.tenant_signature_image,
    renewalStatus: lease.renewal_status,
    renewalRequestedAt: lease.renewal_requested_at,
    renewalNotes: lease.renewal_notes,
    renewedLeaseId: lease.renewed_lease_id,
    createdAt: lease.created_at,
    updatedAt: lease.updated_at,
  }
}

// GET /api/leases/[id] — Get a single lease detail (accessible by both tenant and owner)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, applyCookies } = await resolveRequestUser(req)
    if (!userId) {
      const resp = NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
      return applyCookies(resp)
    }

    const { id } = await params
    const supabase = getSupabaseAdminClient()

    const { data: lease } = await supabase
      .from('leases')
      .select('*')
      .eq('id', id)
      .or(`tenant_id.eq.${userId},owner_id.eq.${userId}`)
      .maybeSingle()

    if (!lease) {
      const resp = NextResponse.json({ error: 'Bail introuvable' }, { status: 404 })
      return applyCookies(resp)
    }

    const [propRes, ownerRes, tenantRes, payRes, maintRes, imgRes] = await Promise.all([
      supabase.from('properties').select('id, title, address, city, type, price, currency, area, bedrooms, bathrooms').eq('id', lease.property_id).maybeSingle(),
      supabase.from('users').select('id, first_name, last_name, phone, email, avatar_url').eq('id', lease.owner_id).maybeSingle(),
      supabase.from('users').select('id, first_name, last_name, phone, email, avatar_url').eq('id', lease.tenant_id).maybeSingle(),
      supabase.from('payments').select('id, amount, status, due_date, paid_at, reference').eq('lease_id', id).order('due_date', { ascending: false }).limit(6),
      supabase.from('maintenance_requests').select('id, title, status, priority, created_at').eq('lease_id', id).order('created_at', { ascending: false }).limit(5),
      supabase.from('property_images').select('url').eq('property_id', lease.property_id).order('order', { ascending: true }).limit(3),
    ])

    const result = {
      ...mapLease(lease),
      monthlyRent: lease.monthly_rent || propRes.data?.price || 0,
      charges: lease.charges || 0,
      property: propRes.data ? {
        id: propRes.data.id,
        title: propRes.data.title,
        address: propRes.data.address,
        city: propRes.data.city,
        type: propRes.data.type,
        price: propRes.data.price,
        currency: propRes.data.currency,
        area: propRes.data.area,
        bedrooms: propRes.data.bedrooms,
        bathrooms: propRes.data.bathrooms,
        images: (imgRes.data ?? []).map((img: any) => ({ url: img.url })),
      } : undefined,
      owner: ownerRes.data ? {
        id: ownerRes.data.id,
        firstName: ownerRes.data.first_name,
        lastName: ownerRes.data.last_name,
        phone: ownerRes.data.phone,
        email: ownerRes.data.email,
        avatarUrl: ownerRes.data.avatar_url,
      } : undefined,
      tenant: tenantRes.data ? {
        id: tenantRes.data.id,
        firstName: tenantRes.data.first_name,
        lastName: tenantRes.data.last_name,
        phone: tenantRes.data.phone,
        email: tenantRes.data.email,
        avatarUrl: tenantRes.data.avatar_url,
      } : undefined,
      payments: (payRes.data ?? []).map((p: any) => ({
        id: p.id,
        amount: p.amount,
        status: p.status,
        dueDate: p.due_date,
        paidAt: p.paid_at,
        reference: p.reference,
      })),
      maintenanceRequests: (maintRes.data ?? []).map((m: any) => ({
        id: m.id,
        title: m.title,
        status: m.status,
        priority: m.priority,
        createdAt: m.created_at,
      })),
    }

    const resp = NextResponse.json({ data: result })
    return applyCookies(resp)
  } catch (error) {
    console.error('Lease detail GET error:', error)
    const resp = NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    return resp
  }
}

// DELETE /api/leases/[id] — Delete an unsigned lease (DRAFT or PENDING_SIGNATURE without any signature)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, applyCookies } = await resolveRequestUser(_req)
    if (!userId) {
      const resp = NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
      return applyCookies(resp)
    }

    const { id } = await params
    const supabase = getSupabaseAdminClient()

    const { data: lease } = await supabase
      .from('leases')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (!lease) {
      const resp = NextResponse.json({ error: 'Bail introuvable' }, { status: 404 })
      return applyCookies(resp)
    }

    if (lease.owner_id !== userId) {
      const resp = NextResponse.json({ error: 'Seul le propriétaire peut supprimer ce bail' }, { status: 403 })
      return applyCookies(resp)
    }

    if (lease.owner_signed_at || lease.tenant_signed_at) {
      const resp = NextResponse.json({ error: 'Impossible de supprimer un bail déjà signé' }, { status: 400 })
      return applyCookies(resp)
    }

    if (lease.status !== 'DRAFT' && lease.status !== 'PENDING_SIGNATURE') {
      const resp = NextResponse.json({ error: 'Seul un bail en brouillon ou en attente de signature peut être supprimé' }, { status: 400 })
      return applyCookies(resp)
    }

    await supabase.from('leases').delete().eq('id', id)

    const resp = NextResponse.json({ success: true })
    return applyCookies(resp)
  } catch (error) {
    console.error('Lease DELETE error:', error)
    const resp = NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    return resp
  }
}

// PATCH /api/leases/[id] — Sign, modify, or terminate a lease
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, applyCookies } = await resolveRequestUser(req)
    if (!userId) {
      const resp = NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
      return applyCookies(resp)
    }

    const { id } = await params
    const body = await req.json()
    const supabase = getSupabaseAdminClient()

    // ─── Sign lease action ──────────────────────────────────────────────────
    if (body.action === 'sign') {
      const { data: lease } = await supabase
        .from('leases')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (!lease) {
        const resp = NextResponse.json({ error: 'Bail introuvable' }, { status: 404 })
        return applyCookies(resp)
      }

      if (lease.tenant_id !== userId && lease.owner_id !== userId) {
        const resp = NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
        return applyCookies(resp)
      }

      if (lease.status !== 'PENDING_SIGNATURE') {
        const resp = NextResponse.json(
          { error: 'Ce bail ne peut pas être signé (statut: ' + lease.status + ')' },
          { status: 400 }
        )
        return applyCookies(resp)
      }

      // Fetch related data for notifications and response
      const { data: signProperty } = await supabase
        .from('properties')
        .select('id, title, address, city')
        .eq('id', lease.property_id)
        .maybeSingle()

      const signUserIds = [lease.owner_id, lease.tenant_id].filter(Boolean)
      const { data: signUsers } = await supabase
        .from('users')
        .select('id, first_name, last_name, avatar_url')
        .in('id', signUserIds)
      const signUserMap = new Map((signUsers ?? []).map((u: any) => [u.id, u]))
      const signOwner = signUserMap.get(lease.owner_id)
      const signTenant = signUserMap.get(lease.tenant_id)

      const signOtp = crypto.randomBytes(16).toString('hex')
      const now = new Date()

      let updatedLease: any

      if (lease.tenant_id === userId) {
        if (lease.tenant_signed_at) {
          const resp = NextResponse.json({ error: 'Vous avez déjà signé ce bail' }, { status: 400 })
          return applyCookies(resp)
        }

        const updateData: Record<string, unknown> = {
          tenant_signed_at: now.toISOString(),
          tenant_sign_otp: signOtp,
          updated_at: now.toISOString(),
        }
        if (lease.owner_signed_at) {
          updateData.status = 'ACTIVE'
        }

        const { data: updated } = await supabase
          .from('leases')
          .update(updateData as any)
          .eq('id', id)
          .select()
          .single()
        updatedLease = updated

        if (lease.owner_signed_at) {
          await supabase.from('properties').update({ rental_status: 'loue', updated_at: new Date().toISOString() }).eq('id', lease.property_id)
        }

        await notify({
          userId: lease.owner_id,
          type: 'LEASE_UPDATE',
          title: lease.owner_signed_at ? 'Bail signé et activé' : 'Le locataire a signé le bail',
          message: lease.owner_signed_at
            ? `Le bail pour "${signProperty?.title || ''}" est maintenant actif. Les deux parties ont signé.`
            : `${signTenant?.first_name || ''} ${signTenant?.last_name || ''} a signé le bail pour "${signProperty?.title || ''}".`,
          actionUrl: 'my-leases',
          entityId: lease.id,
        })

        if (lease.owner_signed_at) {
          await notifyLeaseActivated(lease.tenant_id, lease.owner_id, signProperty?.title || '', lease.id)
        }
      } else {
        if (lease.owner_signed_at) {
          const resp = NextResponse.json({ error: 'Vous avez déjà signé ce bail' }, { status: 400 })
          return applyCookies(resp)
        }

        const updateData: Record<string, unknown> = {
          owner_signed_at: now.toISOString(),
          owner_sign_otp: signOtp,
          updated_at: now.toISOString(),
        }
        if (lease.tenant_signed_at) {
          updateData.status = 'ACTIVE'
        }

        const { data: updated } = await supabase
          .from('leases')
          .update(updateData as any)
          .eq('id', id)
          .select()
          .single()
        updatedLease = updated

        if (lease.tenant_signed_at) {
          await supabase.from('properties').update({ rental_status: 'loue', updated_at: new Date().toISOString() }).eq('id', lease.property_id)
        }

        await notify({
          userId: lease.tenant_id,
          type: 'LEASE_UPDATE',
          title: lease.tenant_signed_at ? 'Bail signé et activé' : 'Le propriétaire a signé le bail',
          message: lease.tenant_signed_at
            ? `Le bail pour "${signProperty?.title || ''}" est maintenant actif. Les deux parties ont signé.`
            : `${signOwner?.first_name || ''} ${signOwner?.last_name || ''} a signé le bail pour "${signProperty?.title || ''}".`,
          actionUrl: 'my-leases',
          entityId: lease.id,
        })

        if (lease.tenant_signed_at) {
          await notifyLeaseActivated(lease.tenant_id, lease.owner_id, signProperty?.title || '', lease.id)
        }
      }

      await supabase.from('audit_logs').insert({
        id: generateId(),
        action: lease.tenant_id === userId ? 'LEASE_TENANT_SIGNED' : 'LEASE_OWNER_SIGNED',
        entity: 'Lease',
        entity_id: id,
        details: JSON.stringify({
          signedBy: userId,
          role: lease.tenant_id === userId ? 'TENANT' : 'OWNER',
          propertyTitle: signProperty?.title || '',
          bothSigned: !!(updatedLease?.tenant_signed_at && updatedLease?.owner_signed_at),
          newStatus: updatedLease?.status,
        }),
        user_id: userId,
      })

      let signPropImages: any[] = []
      if (lease.property_id) {
        const { data: imgs } = await supabase
          .from('property_images')
          .select('url')
          .eq('property_id', lease.property_id)
          .order('order', { ascending: true })
          .limit(1)
        signPropImages = imgs ?? []
      }

      const result = {
        ...mapLease(updatedLease),
        property: signProperty ? {
          id: signProperty.id,
          title: signProperty.title,
          address: signProperty.address,
          city: signProperty.city,
          images: signPropImages.map((img: any) => ({ url: img.url })),
        } : undefined,
        owner: signOwner ? {
          id: signOwner.id,
          firstName: signOwner.first_name,
          lastName: signOwner.last_name,
          avatarUrl: signOwner.avatar_url,
        } : undefined,
        tenant: signTenant ? {
          id: signTenant.id,
          firstName: signTenant.first_name,
          lastName: signTenant.last_name,
          avatarUrl: signTenant.avatar_url,
        } : undefined,
      }

      const resp = NextResponse.json({ data: result })
      return applyCookies(resp)
    }

    // ─── Modify lease terms action ──────────────────────────────────────────
    if (body.action === 'modify') {
      const { data: lease } = await supabase
        .from('leases')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (!lease) {
        const resp = NextResponse.json({ error: 'Bail introuvable' }, { status: 404 })
        return applyCookies(resp)
      }

      if (lease.owner_id !== userId) {
        const resp = NextResponse.json({ error: 'Seul le propriétaire peut modifier le bail' }, { status: 403 })
        return applyCookies(resp)
      }

      if (lease.status !== 'DRAFT' && lease.status !== 'PENDING_SIGNATURE') {
        const resp = NextResponse.json(
          { error: 'Ce bail ne peut pas être modifié (statut: ' + lease.status + ')' },
          { status: 400 }
        )
        return applyCookies(resp)
      }

      const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (body.monthlyRent !== undefined) updateData.monthly_rent = parseFloat(body.monthlyRent)
      if (body.charges !== undefined) updateData.charges = parseFloat(body.charges)
      if (body.deposit !== undefined) updateData.deposit = parseFloat(body.deposit)
      if (body.startDate !== undefined) updateData.start_date = new Date(body.startDate).toISOString()
      if (body.endDate !== undefined) updateData.end_date = new Date(body.endDate).toISOString()
      if (body.specialConditions !== undefined) updateData.special_conditions = body.specialConditions

      const wasDraft = lease.status === 'DRAFT'
      if (wasDraft) {
        updateData.status = 'PENDING_SIGNATURE'
      }

      const { data: updatedLease } = await supabase
          .from('leases')
          .update(updateData as any)
          .eq('id', id)
          .select()
          .single()

      const { data: modProperty } = await supabase
        .from('properties')
        .select('id, title, address, city')
        .eq('id', lease.property_id)
        .maybeSingle()

      const modUserIds = [lease.owner_id, lease.tenant_id].filter(Boolean)
      const { data: modUsers } = await supabase
        .from('users')
        .select('id, first_name, last_name, avatar_url')
        .in('id', modUserIds)
      const modUserMap = new Map((modUsers ?? []).map((u: any) => [u.id, u]))
      const modOwner = modUserMap.get(lease.owner_id)
      const modTenant = modUserMap.get(lease.tenant_id)

      if (wasDraft) {
        await notifyNewLease(lease.tenant_id, modProperty?.title || '', lease.id)
      } else {
        await notify({
          userId: lease.tenant_id,
          type: 'LEASE_UPDATE',
          title: 'Bail modifié',
          message: `Le bail pour "${modProperty?.title || ''}" a été modifié par le propriétaire. Veuillez vérifier les nouvelles conditions.`,
          actionUrl: 'my-leases',
          entityId: lease.id,
        })
      }

      await supabase.from('audit_logs').insert({
        id: generateId(),
        action: 'LEASE_MODIFIED',
        entity: 'Lease',
        entity_id: id,
        details: JSON.stringify({
          modifiedBy: userId,
          fields: Object.keys(updateData).filter((k) => k !== 'updated_at'),
          propertyTitle: modProperty?.title || '',
        }),
        user_id: userId,
      })

      const result = {
        ...mapLease(updatedLease ?? ({} as Record<string, unknown>)),
        property: modProperty ? {
          id: modProperty.id,
          title: modProperty.title,
          address: modProperty.address,
          city: modProperty.city,
        } : undefined,
        owner: modOwner ? {
          id: modOwner.id,
          firstName: modOwner.first_name,
          lastName: modOwner.last_name,
          avatarUrl: modOwner.avatar_url,
        } : undefined,
        tenant: modTenant ? {
          id: modTenant.id,
          firstName: modTenant.first_name,
          lastName: modTenant.last_name,
          avatarUrl: modTenant.avatar_url,
        } : undefined,
      }

      const resp = NextResponse.json({ data: result })
      return applyCookies(resp)
    }

    // ─── Renew lease action ──────────────────────────────────────────────────
    if (body.action === 'renew') {
      const { data: lease } = await supabase
        .from('leases')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (!lease) {
        const resp = NextResponse.json({ error: 'Bail introuvable' }, { status: 404 })
        return applyCookies(resp)
      }

      if (lease.owner_id !== userId) {
        const resp = NextResponse.json({ error: 'Seul le propriétaire peut renouveler ce bail' }, { status: 403 })
        return applyCookies(resp)
      }

      if (lease.status !== 'EXPIRED') {
        const resp = NextResponse.json({ error: 'Seul un bail expiré peut être renouvelé' }, { status: 400 })
        return applyCookies(resp)
      }

      const newEndDate = body.newEndDate
      if (!newEndDate) {
        const resp = NextResponse.json({ error: 'Nouvelle date de fin requise' }, { status: 400 })
        return applyCookies(resp)
      }

      const newMonthlyRent = body.newMonthlyRent || lease.monthly_rent

      const { data: updatedLease } = await supabase
        .from('leases')
        .update({
          status: 'ACTIVE',
          end_date: newEndDate,
          monthly_rent: newMonthlyRent,
          renewal_status: 'RENEWED',
          renewal_requested_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      const { data: renewProperty } = await supabase
        .from('properties')
        .select('id, title, address, city')
        .eq('id', lease.property_id)
        .maybeSingle()

      const { data: renewTenant } = await supabase
        .from('users')
        .select('id, first_name, last_name, avatar_url')
        .eq('id', lease.tenant_id)
        .maybeSingle()

      const { data: renewOwner } = await supabase
        .from('users')
        .select('id, first_name, last_name, avatar_url')
        .eq('id', lease.owner_id)
        .maybeSingle()

      await notify({
        userId: lease.tenant_id,
        type: 'LEASE_UPDATE',
        title: 'Bail renouvelé',
        message: `Votre bail pour "${renewProperty?.title || ''}" a été renouvelé par le propriétaire jusqu'au ${new Date(newEndDate).toLocaleDateString('fr-FR')}.`,
        actionUrl: 'my-leases',
        entityId: id,
      })

      const result = {
        ...mapLease(updatedLease ?? ({} as Record<string, unknown>)),
        property: renewProperty ? {
          id: renewProperty.id,
          title: renewProperty.title,
          address: renewProperty.address,
          city: renewProperty.city,
        } : undefined,
        owner: renewOwner ? {
          id: renewOwner.id,
          firstName: renewOwner.first_name,
          lastName: renewOwner.last_name,
        } : undefined,
        tenant: renewTenant ? {
          id: renewTenant.id,
          firstName: renewTenant.first_name,
          lastName: renewTenant.last_name,
        } : undefined,
      }

      const resp = NextResponse.json({ data: result })
      return applyCookies(resp)
    }

    // ─── Terminate lease action ─────────────────────────────────────────────
    if (body.action !== 'terminate') {
      const resp = NextResponse.json({ error: 'Action non reconnue' }, { status: 400 })
      return applyCookies(resp)
    }

    const { data: lease } = await supabase
      .from('leases')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (!lease) {
      const resp = NextResponse.json({ error: 'Bail introuvable' }, { status: 404 })
      return applyCookies(resp)
    }

    if (lease.tenant_id !== userId && lease.owner_id !== userId) {
      const resp = NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
      return applyCookies(resp)
    }

    if (lease.status !== 'ACTIVE') {
      const resp = NextResponse.json(
        { error: 'Seul un bail actif peut être résilié' },
        { status: 400 }
      )
      return applyCookies(resp)
    }

    const { data: updatedLease } = await supabase
      .from('leases')
      .update({
        status: 'TERMINATED',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    const { data: termProperty } = await supabase
      .from('properties')
      .select('id, title, address, city')
      .eq('id', lease.property_id)
      .maybeSingle()

    let termPropImages: any[] = []
    if (lease.property_id) {
      const { data: imgs } = await supabase
        .from('property_images')
        .select('url')
        .eq('property_id', lease.property_id)
        .order('order', { ascending: true })
        .limit(1)
      termPropImages = imgs ?? []
    }

    const termUserIds = [lease.owner_id, lease.tenant_id].filter(Boolean)
    const { data: termUsers } = await supabase
      .from('users')
      .select('id, first_name, last_name, avatar_url')
      .in('id', termUserIds)
    const termUserMap = new Map((termUsers ?? []).map((u: any) => [u.id, u]))
    const termOwner = termUserMap.get(lease.owner_id)
    const termTenant = termUserMap.get(lease.tenant_id)

    await supabase.from('audit_logs').insert({
      id: generateId(),
      action: 'LEASE_TERMINATED',
      entity: 'Lease',
      entity_id: id,
      details: JSON.stringify({
        terminatedBy: userId,
        role: lease.tenant_id === userId ? 'TENANT' : 'OWNER',
        propertyTitle: termProperty?.title || '',
      }),
      user_id: userId,
    })

    const result = {
      ...mapLease(updatedLease ?? ({} as Record<string, unknown>)),
      property: termProperty ? {
        id: termProperty.id,
        title: termProperty.title,
        address: termProperty.address,
        city: termProperty.city,
        images: termPropImages.map((img: any) => ({ url: img.url })),
      } : undefined,
      owner: termOwner ? {
        id: termOwner.id,
        firstName: termOwner.first_name,
        lastName: termOwner.last_name,
        avatarUrl: termOwner.avatar_url,
      } : undefined,
      tenant: termTenant ? {
        id: termTenant.id,
        firstName: termTenant.first_name,
        lastName: termTenant.last_name,
        avatarUrl: termTenant.avatar_url,
      } : undefined,
    }

    const resp = NextResponse.json({ data: result, terminatedAt: new Date().toISOString() })
    return applyCookies(resp)
  } catch (error) {
    console.error('Lease PATCH error:', error)
    const resp = NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    return resp
  }
}
