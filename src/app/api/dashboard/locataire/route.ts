import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'

export async function GET(req: NextRequest) {
  try {
    const { userId, applyCookies } = await resolveRequestUser(req)
    if (!userId) {
      const resp = NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
      return applyCookies(resp)
    }

    const admin = getSupabaseAdminClient()

    const { data: profile } = await admin
      .from('users')
      .select('role, active_role')
      .eq('id', userId)
      .single()

    const effectiveRole = profile?.active_role || profile?.role
    if (effectiveRole !== 'LOCATAIRE') {
      const resp = NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
      return applyCookies(resp)
    }

    const { data: rawRentalFiles } = await admin
      .from('rental_files')
      .select('*')
      .eq('tenant_id', userId)
      .order('updated_at', { ascending: false })

    const { data: rawVisitRequests } = await admin
      .from('visit_requests')
      .select('*')
      .eq('tenant_id', userId)
      .order('created_at', { ascending: false })

    const { data: rawActiveLeases } = await admin
      .from('leases')
      .select('*')
      .eq('tenant_id', userId)
      .eq('status', 'ACTIVE')
      .order('created_at', { ascending: false })

    const { data: rawAllLeases } = await admin
      .from('leases')
      .select('*')
      .eq('tenant_id', userId)
      .order('created_at', { ascending: false })

    const { data: rawConversations } = await admin
      .from('conversations')
      .select('*')
      .or(`participant1_id.eq.${userId},participant2_id.eq.${userId}`)
      .order('last_message_at', { ascending: false })

    const rfIds = (rawRentalFiles ?? []).map(f => f.id)
    const vrPropIds = [...new Set((rawVisitRequests ?? []).map(v => v.property_id).filter((id): id is string => !!id))]
    const leasePropIds = [...new Set((rawAllLeases ?? []).map(l => l.property_id).filter((id): id is string => !!id))]
    const leaseIds = (rawAllLeases ?? []).map(l => l.id)
    const activeLeaseIds = (rawActiveLeases ?? []).map(l => l.id)
    const ownerIds = [...new Set((rawAllLeases ?? []).map(l => l.owner_id).filter((id): id is string => !!id))]
    const convIds = (rawConversations ?? []).map(c => c.id)
    const convPropIds = [...new Set((rawConversations ?? []).map(c => c.property_id).filter((id): id is string => !!id))]
    const allPropIds = [...new Set([...vrPropIds, ...leasePropIds, ...convPropIds])]

    const [allRfDocs, rfLeases, allProps, allPropImgs, allPayments, allOwners, allConvMessages, allConvProps, allParticipants, allMaintenance, allFavorites, allNotificationPreferences] = await Promise.all([
      rfIds.length > 0
        ? admin.from('rental_file_documents').select('*').in('rental_file_id', rfIds).then(r => r.data ?? [])
        : [],
      rfIds.length > 0
        ? admin.from('leases').select('*').in('rental_file_id', rfIds).eq('status', 'ACTIVE').then(r => r.data ?? [])
        : [],
      allPropIds.length > 0
        ? admin.from('properties').select('*').in('id', allPropIds).then(r => r.data ?? [])
        : [],
      allPropIds.length > 0
        ? admin.from('property_images').select('*').in('property_id', allPropIds).order('order', { ascending: true }).then(r => r.data ?? [])
        : [],
      leaseIds.length > 0
        ? admin.from('payments').select('*').in('lease_id', leaseIds).order('due_date', { ascending: true }).then(r => r.data ?? [])
        : [],
      ownerIds.length > 0
        ? admin.from('users').select('id, first_name, last_name, avatar_url').in('id', ownerIds).then(r => r.data ?? [])
        : [],
      convIds.length > 0
        ? admin.from('messages').select('*').in('conversation_id', convIds).order('created_at', { ascending: false }).then(r => r.data ?? [])
        : [],
      convPropIds.length > 0
        ? admin.from('properties').select('id, title').in('id', convPropIds).then(r => r.data ?? [])
        : [],
      (async () => {
        const pIds = new Set<string>()
        for (const c of rawConversations ?? []) {
          if (c.participant1_id) pIds.add(c.participant1_id)
          if (c.participant2_id) pIds.add(c.participant2_id)
        }
        return [...pIds]
      })().length > 0
        ? admin.from('users').select('id, first_name, last_name').in('id', [...new Set((() => {
          const pIds = new Set<string>()
          for (const c of rawConversations ?? []) {
            if (c.participant1_id) pIds.add(c.participant1_id)
            if (c.participant2_id) pIds.add(c.participant2_id)
          }
          return pIds
        })())]).then(r => r.data ?? [])
        : [],
      activeLeaseIds.length > 0
        ? admin.from('maintenance_requests').select('*').in('lease_id', activeLeaseIds).order('created_at', { ascending: false }).limit(10).then(r => r.data ?? [])
        : [],
      admin.from('favorites').select('property_id').eq('user_id', userId).then(r => r.data ?? []),
      admin.from('notification_preferences').select('*').eq('user_id', userId).then(r => r.data ?? []),
    ])

    // Fetch recommended properties (similar to the user's current lease property)
    let recommendedProperties: any[] = []
    const primaryLease = (rawActiveLeases ?? [])[0]
    if (primaryLease?.property_id) {
      const { data: leaseProp } = await admin
        .from('properties')
        .select('city, commune, type, price')
        .eq('id', primaryLease.property_id)
        .single()
      if (leaseProp) {
        let recQuery = admin
          .from('properties')
          .select('*')
          .eq('status', 'ACTIVE')
          .neq('owner_id', userId)
          .neq('id', primaryLease.property_id)
          .limit(6)

        if (leaseProp.commune) {
          recQuery = recQuery.eq('commune', leaseProp.commune)
        } else if (leaseProp.city) {
          recQuery = recQuery.eq('city', leaseProp.city)
        }

        const { data: recs } = await recQuery
        if (recs && recs.length > 0) {
          const recPropIds = recs.map(p => p.id)
          const { data: recImgs } = await admin
            .from('property_images')
            .select('url, property_id')
            .in('property_id', recPropIds)
            .order('order', { ascending: true })
          const recImgMap = groupBy(recImgs ?? [], 'property_id')

          recommendedProperties = recs.map(p => ({
            id: p.id,
            title: p.title,
            type: p.type,
            price: p.price,
            city: p.city,
            commune: p.commune,
            bedrooms: p.bedrooms,
            area: p.area,
            images: (recImgMap.get(p.id) ?? []).slice(0, 1).map((i: any) => ({ url: i.url })),
          }))
        }
      }
    }

    const docByRentalFile = groupBy(allRfDocs ?? [], 'rental_file_id')
    const leaseByRentalFile = groupBy(rfLeases ?? [], 'rental_file_id')
    const propMap = new Map((allProps ?? []).map(p => [p.id, p]))
    const propImgMap = groupBy(allPropImgs ?? [], 'property_id')
    const paymentByLease = groupBy(allPayments ?? [], 'lease_id')
    const ownerMap = new Map((allOwners ?? []).map(o => [o.id, o]))
    const messageByConv = groupBy(allConvMessages ?? [], 'conversation_id')
    const convPropMap = new Map((allConvProps ?? []).map(p => [p.id, p]))
    const participantMap = new Map((allParticipants ?? []).map(p => [p.id, p]))
    const maintenanceByLease = groupBy(allMaintenance ?? [], 'lease_id')

    const favoritePropIds = new Set((allFavorites ?? []).map((f: any) => f.property_id))

    const rentalFiles = (rawRentalFiles ?? []).map(f => ({
      id: f.id,
      tenantId: f.tenant_id,
      status: f.status,
      tenantCategory: f.tenant_category,
      reviewedById: f.reviewed_by_id,
      createdAt: f.created_at,
      updatedAt: f.updated_at,
      documents: (docByRentalFile.get(f.id) ?? []).map(d => ({
        id: d.id,
        rentalFileId: d.rental_file_id,
        type: d.type,
        url: d.url,
        name: d.name,
        createdAt: d.created_at,
      })),
      leases: (leaseByRentalFile.get(f.id) ?? []).map(l => ({
        id: l.id,
        status: l.status,
        monthlyRent: l.monthly_rent,
        startDate: l.start_date,
        endDate: l.end_date,
        propertyId: l.property_id,
        tenantId: l.tenant_id,
        ownerId: l.owner_id,
      })),
    }))

    // Documents from validated rental files
    const validatedRf = rawRentalFiles?.find(rf => rf.status === 'VALIDATED')
    const myDocuments = validatedRf ? (docByRentalFile.get(validatedRf.id) ?? []) : []

    const visitRequests = (rawVisitRequests ?? []).map(v => {
      const prop = propMap.get(v.property_id)
      const images = propImgMap.get(v.property_id) ?? []
      return {
        id: v.id,
        propertyId: v.property_id,
        tenantId: v.tenant_id,
        visitType: v.visit_type,
        requestedDate: v.requested_date,
        timeSlot: v.time_slot,
        status: v.status,
        tenantMessage: v.tenant_message,
        createdAt: v.created_at,
        property: prop ? {
          id: prop.id,
          title: prop.title,
          type: prop.type,
          price: prop.price,
          city: prop.city,
          commune: prop.commune,
          address: prop.address,
          bedrooms: prop.bedrooms,
          area: prop.area,
          images: images.slice(0, 1).map(i => ({
            id: i.id,
            url: i.url,
            order: i.order,
            createdAt: i.created_at,
            propertyId: i.property_id,
          })),
        } : null,
      }
    })

    const activeLeases = (rawActiveLeases ?? []).map(l => {
      const prop = propMap.get(l.property_id)
      const images = propImgMap.get(l.property_id) ?? []
      const owner = ownerMap.get(l.owner_id)
      const payments = paymentByLease.get(l.id) ?? []
      const maintenance = maintenanceByLease.get(l.id) ?? []
      return {
        id: l.id,
        status: l.status,
        monthlyRent: l.monthly_rent || prop?.price || 0,
        charges: l.charges,
        deposit: l.deposit,
        startDate: l.start_date,
        endDate: l.end_date,
        tenantId: l.tenant_id,
        ownerId: l.owner_id,
        propertyId: l.property_id,
        rentalFileId: l.rental_file_id,
        createdAt: l.created_at,
        updatedAt: l.updated_at,
        property: prop ? {
          id: prop.id,
          title: prop.title,
          type: prop.type,
          price: prop.price,
          city: prop.city,
          commune: prop.commune,
          address: prop.address,
          bedrooms: prop.bedrooms,
          area: prop.area,
          latitude: prop.latitude,
          longitude: prop.longitude,
          images: images.slice(0, 1).map(i => ({
            id: i.id,
            url: i.url,
            order: i.order,
            createdAt: i.created_at,
            propertyId: i.property_id,
          })),
        } : null,
        owner: owner ? {
          id: owner.id,
          firstName: owner.first_name,
          lastName: owner.last_name,
          avatarUrl: owner.avatar_url,
        } : null,
        payments: payments.map(p => ({
          id: p.id,
          amount: p.amount,
          status: p.status,
          dueDate: p.due_date,
          paidAt: p.paid_at,
        })),
        maintenanceRequests: maintenance.map((m: any) => ({
          id: m.id,
          title: m.title,
          description: m.description,
          status: m.status,
          priority: m.priority,
          createdAt: m.created_at,
        })),
      }
    })

    const conversations = (rawConversations ?? []).map(c => {
      const messages = messageByConv.get(c.id) ?? []
      const lastMessage = messages.length > 0 ? messages[0] : null
      const p1 = participantMap.get(c.participant1_id)
      const p2 = participantMap.get(c.participant2_id)
      const convProp = convPropMap.get(c.property_id)
      return {
        id: c.id,
        participant1Id: c.participant1_id,
        participant2Id: c.participant2_id,
        propertyId: c.property_id,
        lastMessageAt: c.last_message_at,
        createdAt: c.created_at,
        messages: lastMessage ? [{
          id: lastMessage.id,
          conversationId: lastMessage.conversation_id,
          senderId: lastMessage.sender_id,
          content: lastMessage.content,
          isRead: lastMessage.is_read,
          createdAt: lastMessage.created_at,
        }] : [],
        participant1: p1 ? { id: p1.id, firstName: p1.first_name, lastName: p1.last_name } : null,
        participant2: p2 ? { id: p2.id, firstName: p2.first_name, lastName: p2.last_name } : null,
        property: convProp ? { title: convProp.title } : null,
      }
    })

    // Unread messages count
    const userConvIds = (rawConversations ?? []).map(c => c.id)
    let unreadMessages = 0
    if (userConvIds.length > 0) {
      const { count } = await admin
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .in('conversation_id', userConvIds)
        .eq('is_read', false)
        .neq('sender_id', userId)
      unreadMessages = count ?? 0
    }

    const [latePaymentsCount, totalPaidAmount, nextPendingPayments] = activeLeaseIds.length > 0
      ? await Promise.all([
          admin.from('payments').select('id', { count: 'exact', head: true }).in('lease_id', activeLeaseIds).eq('status', 'LATE')
            .then(({ count }) => count ?? 0),
          admin.from('payments').select('amount').in('lease_id', activeLeaseIds).eq('status', 'PAID')
            .then(({ data }) => (data ?? []).reduce((sum, p) => sum + p.amount, 0)),
          admin.from('payments').select('id, amount, due_date, status, lease_id').in('lease_id', activeLeaseIds).in('status', ['PENDING', 'LATE']).order('due_date', { ascending: true }).limit(1)
            .then(({ data }) => data?.[0] ?? null),
        ])
      : [0, 0, null]

    // Maintenance stats
    const allMaintenanceItems = activeLeaseIds.length > 0
      ? (allMaintenance ?? [])
      : []
    const pendingMaintenance = allMaintenanceItems.filter((m: any) => m.status === 'PENDING').length
    const inProgressMaintenance = allMaintenanceItems.filter((m: any) => m.status === 'IN_PROGRESS').length

    // Expiring leases (within 30 days)
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    const expiringLeases = (rawActiveLeases ?? []).filter(l => l.end_date && new Date(l.end_date) <= thirtyDaysFromNow)

    const activeLeasesWithPaymentStatus = activeLeases.map(lease => {
      const leasePayments = lease.payments || []
      const hasLate = leasePayments.some(p => p.status === 'LATE')
      const hasPending = leasePayments.some(p => p.status === 'PENDING')
      const pendingPayments = leasePayments.filter(p => p.status === 'PENDING')
      const latePayments = leasePayments.filter(p => p.status === 'LATE')
      const paidPayments = leasePayments.filter(p => p.status === 'PAID')

      let nextPayment = pendingPayments.length > 0
        ? pendingPayments[0]
        : latePayments.length > 0
          ? latePayments[0]
          : null

      if (!nextPayment && (lease.monthlyRent || 0) > 0) {
        const nextDue = new Date()
        nextDue.setMonth(nextDue.getMonth() + 1)
        nextDue.setDate(5)
        nextPayment = {
          id: 'upcoming',
          amount: lease.monthlyRent,
          dueDate: nextDue.toISOString(),
          status: 'PENDING',
        }
      }

      let paymentStatus: 'up_to_date' | 'late' | 'pending' = 'up_to_date'
      if (hasLate) paymentStatus = 'late'
      else if (hasPending) paymentStatus = 'pending'

      return {
        ...lease,
        paymentStatus,
        nextPayment: nextPayment ? {
          id: nextPayment.id,
          amount: nextPayment.amount,
          dueDate: nextPayment.dueDate,
          status: nextPayment.status,
        } : null,
        latePaymentsCount: latePayments.length,
        totalPaid: paidPayments.reduce((sum, p) => sum + p.amount, 0),
      }
    })

    // Build alerts
    const alerts: Array<{ type: string; title: string; message: string; section: string }> = []

    if (nextPendingPayments && nextPendingPayments.due_date) {
      const dueDate = new Date(nextPendingPayments.due_date)
      const daysUntilDue = Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      if (daysUntilDue <= 5 && daysUntilDue >= 0) {
        alerts.push({
          type: 'warning', title: 'Loyer à payer', message: `Paiement de ${nextPendingPayments.amount.toLocaleString('fr-FR')} FCFA dû dans ${daysUntilDue} jour${daysUntilDue > 1 ? 's' : ''}`,
          section: 'payments',
        })
      }
    }

    if (expiringLeases.length > 0) {
      alerts.push({
        type: 'info', title: 'Contrat bientôt expiré', message: `${expiringLeases.length} bail${expiringLeases.length > 1 ? 'x' : ''} expire${expiringLeases.length > 1 ? 'nt' : ''} dans moins de 30 jours`,
        section: 'my-leases',
      })
    }

    if (unreadMessages > 0) {
      alerts.push({
        type: 'info', title: 'Nouveau(x) message(s)', message: `${unreadMessages} message${unreadMessages > 1 ? 's' : ''} non lu${unreadMessages > 1 ? 's' : ''}`,
        section: 'messages',
      })
    }

    if (pendingMaintenance > 0) {
      alerts.push({
        type: 'error', title: 'Demande de maintenance en attente', message: `${pendingMaintenance} demande${pendingMaintenance > 1 ? 's' : ''} en attente de traitement`,
        section: 'maintenance',
      })
    }

    const pendingVisits = visitRequests.filter(v => v.status === 'PENDING').length
    if (pendingVisits > 0) {
      alerts.push({
        type: 'info', title: 'Visite programmée', message: `${pendingVisits} visite${pendingVisits > 1 ? 's' : ''} en attente de confirmation`,
        section: 'my-visits',
      })
    }

    const resp = NextResponse.json({
      rentalFiles,
      visitRequests,
      activeLeases: activeLeasesWithPaymentStatus,
      conversations,
      myDocuments,
      maintenanceRequests: allMaintenanceItems.slice(0, 10),
      recommendedProperties,
      alerts,
      favoritePropIds: [...favoritePropIds],
      stats: {
        totalRentalFiles: rentalFiles.length,
        activeLeases: activeLeases.length,
        pendingVisits,
        unreadMessages,
        latePaymentsCount,
        totalPaid: totalPaidAmount,
        pendingMaintenance,
        inProgressMaintenance,
        nextPayment: nextPendingPayments ? {
          id: nextPendingPayments.id,
          amount: nextPendingPayments.amount,
          dueDate: nextPendingPayments.due_date,
          status: nextPendingPayments.status,
          leaseId: nextPendingPayments.lease_id,
        } : null,
      },
    })
    return applyCookies(resp)
  } catch (error) {
    console.error('Locataire dashboard error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

function groupBy(arr: any[], key: string) {
  const map = new Map<string, any[]>()
  for (const item of arr) {
    const k = item[key]
    if (!map.has(k)) map.set(k, [])
    map.get(k)!.push(item)
  }
  return map
}
