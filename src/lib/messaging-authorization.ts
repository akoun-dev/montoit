import type { SupabaseClient } from '@supabase/supabase-js'

const APPLICATION_STATUSES = ['SUBMITTED', 'TC_REVIEW', 'VALIDATED', 'ACCEPTED']
const LEASE_STATUSES = ['ACTIVE', 'PENDING_SIGNATURE']

export async function canMessageParticipant(
  admin: SupabaseClient,
  senderId: string,
  recipientId: string,
  propertyId?: string,
) {
  const [{ data: sender }, { data: recipient }] = await Promise.all([
    admin.from('users').select('role, active_role').eq('id', senderId).single(),
    admin.from('users').select('role, active_role, is_active').eq('id', recipientId).single(),
  ])
  if (!recipient?.is_active) return false
  const senderRole = sender?.active_role || sender?.role
  const recipientRole = recipient.active_role || recipient.role

  let query = admin.from('applications').select('id, property_id').in('status', APPLICATION_STATUSES)
  if (senderRole === 'PROPRIETAIRE') query = query.eq('tenant_id', recipientId)
  else if (senderRole === 'LOCATAIRE') query = query.eq('tenant_id', senderId)
  else return false
  if (propertyId) query = query.eq('property_id', propertyId)
  const { data: applications } = await query
  if ((applications ?? []).length > 0) {
    if (senderRole === 'PROPRIETAIRE') {
      const propertyIds = (applications as any[]).map((application) => application.property_id).filter(Boolean)
      let ownedQuery = admin.from('properties').select('id').eq('owner_id', senderId).in('id', propertyIds)
      if (propertyId) ownedQuery = ownedQuery.eq('id', propertyId)
      const { data: owned } = await ownedQuery
      return (owned ?? []).length > 0
    }
    const propertyIds = (applications as any[]).map((application) => application.property_id).filter(Boolean)
    let propertyQuery = admin.from('properties').select('id, owner_id').eq('owner_id', recipientId).in('id', propertyIds)
    if (propertyId) propertyQuery = propertyQuery.eq('id', propertyId)
    const { data: properties } = await propertyQuery
    return (properties ?? []).length > 0
  }

  let leaseQuery = admin.from('leases').select('id').in('status', LEASE_STATUSES)
  if (senderRole === 'PROPRIETAIRE') leaseQuery = leaseQuery.eq('owner_id', senderId).eq('tenant_id', recipientId)
  else leaseQuery = leaseQuery.eq('tenant_id', senderId).eq('owner_id', recipientId)
  if (propertyId) leaseQuery = leaseQuery.eq('property_id', propertyId)
  const { data: leases } = await leaseQuery
  return (leases ?? []).length > 0
}
