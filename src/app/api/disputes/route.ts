import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'
import { notify } from '@/lib/notify'
function generateId() {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

// GET /api/disputes — List disputes for the current user
export async function GET(req: NextRequest) {
  try {
    const { userId, applyCookies } = await resolveRequestUser(req)
    if (!userId) {
      const resp = NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
      return applyCookies(resp)
    }

    const supabase = getSupabaseAdminClient()

    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')))

    // Get disputes where user is the reporter or a participant (via lease or mandat)
    let leaseIds: string[] = []

    // Direct leases (tenant or owner)
    const { data: directLeases } = await supabase
      .from('leases')
      .select('id')
      .or(`tenant_id.eq.${userId},owner_id.eq.${userId}`)

    leaseIds = (directLeases || []).map((l: any) => l.id)

    // For agency users, find leases via mandats
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()

    const userRole = (profile as any)?.role

    if (userRole === 'AGENCE') {
      const { data: agencyMandats } = await supabase
        .from('mandats')
        .select('property_id')
        .eq('agency_id', userId)
        .in('status', ['ACTIVE', 'SIGNED'])

      const propertyIds = [...new Set((agencyMandats || []).map((m: any) => m.property_id))]

      if (propertyIds.length > 0) {
        const { data: agencyLeases } = await supabase
          .from('leases')
          .select('id')
          .in('property_id', propertyIds)

        const agencyLeaseIds = (agencyLeases || []).map((l: any) => l.id)
        leaseIds = [...new Set([...leaseIds, ...agencyLeaseIds])]
      }
    }

    // Build query: disputes reported by user OR linked to their leases
    let query = supabase
      .from('disputes')
      .select('*, lease:leases(id, start_date, end_date, monthly_rent, property:properties(id, title, address, commune, city)), reporter:users!disputes_reported_by_id_fkey(id, first_name, last_name, email, role)', { count: 'exact' })

    if (leaseIds.length > 0) {
      query = query.or(`reported_by_id.eq.${userId},lease_id.in.(${leaseIds.join(',')})`)
    } else {
      query = query.eq('reported_by_id', userId)
    }

    const { data: disputesData, count: total } = await query
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1) as any

    const disputes = ((disputesData ?? []) as any[]).map((d: any) => ({
      id: d.id,
      type: d.type,
      description: d.description,
      status: d.status,
      priority: d.priority,
      tcComment: d.tc_comment,
      resolution: d.resolution,
      investigationNotes: d.investigation_notes,
      evidenceUrls: d.evidence_urls,
      isEscalated: d.is_escalated,
      escalatedAt: d.escalated_at,
      escalationReason: d.escalation_reason,
      leaseId: d.lease_id,
      reportedById: d.reported_by_id,
      handledById: d.handled_by_id,
      resolvedById: d.resolved_by_id,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
      resolvedAt: d.resolved_at,
      lease: d.lease ? {
        id: d.lease.id,
        startDate: d.lease.start_date,
        endDate: d.lease.end_date,
        monthlyRent: d.lease.monthly_rent,
        property: d.lease.property ? {
          id: d.lease.property.id,
          title: d.lease.property.title,
          address: d.lease.property.address,
          commune: d.lease.property.commune,
          city: d.lease.property.city,
        } : null,
      } : null,
      reporter: d.reporter ? {
        id: d.reporter.id,
        firstName: d.reporter.first_name,
        lastName: d.reporter.last_name,
        email: d.reporter.email,
        role: d.reporter.role,
      } : null,
    }))

    const resp = NextResponse.json({
      data: disputes,
      pagination: {
        page,
        limit,
        total: total ?? 0,
        totalPages: Math.ceil((total ?? 0) / limit),
      },
    })
    return applyCookies(resp)
  } catch (error) {
    console.error('Disputes GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST /api/disputes — Create a new dispute (any authenticated user)
export async function POST(req: NextRequest) {
  try {
    const { userId, applyCookies } = await resolveRequestUser(req)
    if (!userId) {
      const resp = NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
      return applyCookies(resp)
    }

    const supabase = getSupabaseAdminClient()

    const body = await req.json()
    const { type, description, leaseId } = body as {
      type?: string
      description?: string
      leaseId?: string
    }

    // Validate required fields
    if (!type || !['UNPAID_RENT', 'PROPERTY_DAMAGE', 'HARASSMENT', 'FRAUD', 'OTHER'].includes(type)) {
      return NextResponse.json(
        { error: 'Type de litige invalide. Valeurs acceptées: UNPAID_RENT, PROPERTY_DAMAGE, HARASSMENT, FRAUD, OTHER' },
        { status: 400 }
      )
    }

    if (!description || !description.trim()) {
      return NextResponse.json(
        { error: 'La description du litige est obligatoire' },
        { status: 400 }
      )
    }

    if (!leaseId) {
      return NextResponse.json(
        { error: "L'ID du bail est obligatoire" },
        { status: 400 }
      )
    }

    // Verify the lease belongs to the user (or is managed by the agency)
    const { data: lease } = await supabase
      .from('leases')
      .select('id, tenant_id, owner_id, property_id, property:properties(title)')
      .eq('id', leaseId)
      .single()

    if (!lease) {
      return NextResponse.json({ error: 'Bail introuvable' }, { status: 404 })
    }

    const leaseCheck = lease as any
    const isTenantOrOwner = leaseCheck.tenant_id === userId || leaseCheck.owner_id === userId

    // Allow agency users if they have a valid mandat for this property
    if (!isTenantOrOwner) {
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single()

      const userRole = (profile as any)?.role

      if (userRole === 'AGENCE') {
        const { data: mandat } = await supabase
          .from('mandats')
          .select('id')
          .eq('property_id', leaseCheck.property_id)
          .eq('agency_id', userId)
          .in('status', ['ACTIVE', 'SIGNED'])
          .maybeSingle()

        if (!mandat) {
          return NextResponse.json(
            { error: "Ce bail ne vous appartient pas ou n'est pas géré par votre agence" },
            { status: 403 }
          )
        }
      } else {
        return NextResponse.json(
          { error: "Ce bail ne vous appartient pas" },
          { status: 403 }
        )
      }
    }

    // Check for existing open dispute on same lease by same reporter
    const { data: existing } = await supabase
      .from('disputes')
      .select('id, status')
      .eq('lease_id', leaseId)
      .eq('reported_by_id', userId)
      .in('status', ['OPEN', 'IN_REVIEW'])
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: 'Un litige est déjà en cours pour ce bail' },
        { status: 400 }
      )
    }

    const id = generateId()

    const { data: dispute, error: createError } = await (supabase
      .from('disputes') as any)
      .insert({
        id,
        type,
        description: description.trim(),
        lease_id: leaseId,
        reported_by_id: userId,
        status: 'OPEN',
        priority: 'NORMAL',
        evidence_urls: '[]',
        is_escalated: false,
      })
      .select('*, lease:leases(id, start_date, end_date, monthly_rent, property:properties(id, title, address, commune, city)), reporter:users!disputes_reported_by_id_fkey(id, first_name, last_name, email, role)')
      .single()

    if (createError || !dispute) {
      throw createError || new Error('Failed to create dispute')
    }

    // Notify TC users about the new dispute
    const { data: tcUsers } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'TIERS_CONFIANCE')

    if (tcUsers) {
      for (const tc of tcUsers) {
        await notify({
          userId: tc.id,
          type: 'DISPUTE',
          title: 'Nouveau litige signalé',
          message: `Un nouveau litige de type "${type}" a été signalé et nécessite votre attention.`,
          actionUrl: 'litiges',
          entityId: id,
        })
      }
    }

    const mappedDispute = {
      id: dispute.id,
      type: dispute.type,
      description: dispute.description,
      status: dispute.status,
      priority: dispute.priority,
      tcComment: dispute.tc_comment,
      resolution: dispute.resolution,
      investigationNotes: dispute.investigation_notes,
      evidenceUrls: dispute.evidence_urls,
      isEscalated: dispute.is_escalated,
      escalatedAt: dispute.escalated_at,
      escalationReason: dispute.escalation_reason,
      leaseId: dispute.lease_id,
      reportedById: dispute.reported_by_id,
      handledById: dispute.handled_by_id,
      resolvedById: dispute.resolved_by_id,
      createdAt: dispute.created_at,
      updatedAt: dispute.updated_at,
      resolvedAt: dispute.resolved_at,
      lease: dispute.lease ? {
        id: dispute.lease.id,
        startDate: dispute.lease.start_date,
        endDate: dispute.lease.end_date,
        monthlyRent: dispute.lease.monthly_rent,
        property: dispute.lease.property ? {
          id: dispute.lease.property.id,
          title: dispute.lease.property.title,
          address: dispute.lease.property.address,
          commune: dispute.lease.property.commune,
          city: dispute.lease.property.city,
        } : null,
      } : null,
      reporter: dispute.reporter ? {
        id: dispute.reporter.id,
        firstName: dispute.reporter.first_name,
        lastName: dispute.reporter.last_name,
        email: dispute.reporter.email,
        role: dispute.reporter.role,
      } : null,
    }

    const response = NextResponse.json({ data: mappedDispute }, { status: 201 })
    return applyCookies(response)
  } catch (error) {
    console.error('Disputes POST error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
