import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: propertyId } = await params

    if (!propertyId || typeof propertyId !== 'string') {
      return NextResponse.json({ error: 'ID du bien requis' }, { status: 400 })
    }

    const supabase = getSupabaseAdminClient()

    // Fetch property info first
    const { data: property } = await (supabase as any)
      .from('properties')
      .select('id, title, address, city, commune')
      .eq('id', propertyId)
      .single()

    if (!property) {
      return NextResponse.json({ error: 'Bien introuvable' }, { status: 404 })
    }

    const { data: reportsData, error } = await (supabase as any)
      .from('inventory_reports')
      .select('*')
      .eq('property_id', propertyId)
      .in('status', ['COMPLETED', 'SIGNED_OWNER', 'SIGNED_TENANT', 'SIGNED_BOTH'])
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) {
      console.error('Public inventory reports error:', error)
      return NextResponse.json({ reports: [] })
    }

    const reports = (reportsData ?? []) as any[]
    const reportIds = reports.map((r: any) => r.id)

    // Fetch items for all reports
    const { data: itemsData } = reportIds.length > 0
      ? await (supabase.from('inventory_report_items') as any)
          .select('*')
          .in('report_id', reportIds)
          .order('designation_order', { ascending: true })
      : { data: [] as any[] }

    const itemsByReport = new Map<string, any[]>()
    for (const item of (itemsData ?? []) as any[]) {
      if (!itemsByReport.has(item.report_id)) itemsByReport.set(item.report_id, [])
      itemsByReport.get(item.report_id)!.push(item)
    }

    const enrichedReports = reports.map((r: any) => {
      const items = (itemsByReport.get(r.id) ?? []).map((item: any) => ({
        id: item.id,
        reportId: item.report_id,
        designation: item.designation,
        designationOrder: item.designation_order,
        kitchen: item.kitchen,
        mainBathroom: item.main_bathroom,
        otherBathroom: item.other_bathroom,
        otherRoom1: item.other_room1,
        otherRoom2: item.other_room2,
        observations: item.observations,
      }))

      return {
        id: r.id,
        propertyId: r.property_id,
        type: r.type,
        leaseId: r.lease_id,
        status: r.status,
        generalObservations: r.general_observations,
        totalKeys: r.total_keys,
        reviewerId: r.reviewer_id,
        completedAt: r.completed_at,
        ownerSignedAt: r.owner_signed_at,
        tenantSignedAt: r.tenant_signed_at,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        property: {
          id: property.id,
          title: property.title,
          address: property.address,
          city: property.city,
          commune: property.commune,
        },
        items,
      }
    })

    return NextResponse.json({ reports: enrichedReports })
  } catch (error) {
    console.error('Public inventory reports error:', error)
    return NextResponse.json({ reports: [] })
  }
}
