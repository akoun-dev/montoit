import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'
import { generateBailContract, type BailContractData } from '@/lib/generate-bail'
import {
  getLeaseAdvanceMonthLabels,
  getLeaseAdvanceRentAmount,
  getLeaseDepositAmount,
  getLeaseMonthlyRent,
} from '@/lib/lease-financials'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { writeFile, readFile, unlink, mkdir } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

const execFileAsync = promisify(execFile)

async function convertDocxToPdf(docxBuffer: Buffer, filename: string): Promise<Buffer> {
  const tmpDir = join(tmpdir(), 'mon-toit-contracts')
  await mkdir(tmpDir, { recursive: true })

  const baseName = filename.replace(/\.docx$/, '').replace(/\.pdf$/, '')
  const docxPath = join(tmpDir, `${baseName}.docx`)
  const pdfPath = join(tmpDir, `${baseName}.pdf`)

  try {
    await writeFile(docxPath, docxBuffer)
    await execFileAsync('libreoffice', [
      '--headless',
      '--convert-to', 'pdf',
      '--outdir', tmpDir,
      docxPath,
    ], { timeout: 30000 })
    const pdfBuffer = await readFile(pdfPath)
    return pdfBuffer
  } finally {
    try { await unlink(docxPath) } catch { /* ignore */ }
    try { await unlink(pdfPath) } catch { /* ignore */ }
  }
}

// GET /api/leases/[id]/contract — Serve contract from Storage, fallback to generation
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
    const format = req.nextUrl.searchParams.get('format') || 'pdf'

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

    const leaseAny = lease as any

    if (leaseAny.owner_id !== userId && leaseAny.tenant_id !== userId) {
      const auth = await resolveRequestUser(req)
      if (!auth?.userId) {
        const resp = NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
        return applyCookies(resp)
      }
      const { data: user } = await supabase
        .from('users')
        .select('role, active_role')
        .eq('id', auth.userId)
        .single()
      const effectiveRole = user?.active_role || user?.role
      if (effectiveRole !== 'TIERS_CONFIANCE') {
        const resp = NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
        return applyCookies(resp)
      }
    }

    // ── Try to serve from Storage first ──
    if (leaseAny.contract_url) {
      try {
        const storageRes = await fetch(leaseAny.contract_url)
        if (storageRes.ok) {
          const blob = await storageRes.arrayBuffer()
          const contentType = storageRes.headers.get('content-type') || 'application/pdf'
          const filename = `Bail_${id}.${contentType.includes('pdf') ? 'pdf' : 'docx'}`
          return new NextResponse(new Uint8Array(blob), {
            status: 200,
            headers: {
              'Content-Type': contentType,
              'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
            },
          })
        }
      } catch {
        console.warn('Failed to fetch from Storage, falling back to generation')
      }
    }

    // ── Fallback: allow download even if not signed (for preview) ──
    // Fetch related data
    const [propRes, usersRes] = await Promise.all([
      supabase.from('properties').select('*').eq('id', leaseAny.property_id).maybeSingle(),
      supabase.from('users').select('*').in('id', [leaseAny.owner_id, leaseAny.tenant_id].filter(Boolean)),
    ])

    const property = (propRes as any).data
    const userMap = new Map((usersRes.data ?? []).map((u: any) => [u.id, u]))
    const leaseOwner = userMap.get(leaseAny.owner_id)
    const leaseTenant = userMap.get(leaseAny.tenant_id)

    // Fetch property owner (may differ from lease owner)
    let propOwner: Record<string, any> | undefined
    if (property?.owner_id && property.owner_id !== leaseAny.owner_id) {
      const { data: po } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, phone, address')
        .eq('id', property.owner_id)
        .single()
      propOwner = po ?? undefined
    } else {
      propOwner = leaseOwner
    }

    // Fetch inventory reports
    const { data: invReports } = await (supabase
      .from('inventory_reports')
      .select('*')
      .eq('lease_id', id)
      .order('created_at', { ascending: false })
      .limit(1) as any)

    let inventoryItems: any[] = []
    const latestReport = invReports?.[0]
    if (latestReport) {
      const { data: items } = await (supabase
          .from('inventory_report_items')
          .select('*')
          .eq('report_id', latestReport.id)
          .order('designation_order', { ascending: true }) as any)
        inventoryItems = items ?? []
    }

    // Build property description
    const descParts: string[] = []
    if (property?.type) descParts.push(property.type.toLowerCase())
    if (property?.bedrooms) descParts.push(`${property.bedrooms} chambre${property.bedrooms > 1 ? 's' : ''}`)
    if (property?.area) descParts.push(`${property.area} m²`)
    const propertyDescription = descParts.length > 0
      ? `un logement composé de ${descParts.join(', ')}`
      : property?.description || property?.title || ''

    const mappedItems = inventoryItems.map((item: any) => ({
      designation: item.designation,
      kitchen: item.kitchen,
      mainBathroom: item.main_bathroom,
      otherBathroom: item.other_bathroom,
      otherRoom1: item.other_room_1,
      otherRoom2: item.other_room_2,
      observations: item.observations,
    }))
    const monthlyRent = getLeaseMonthlyRent(leaseAny.monthly_rent, property?.price || 0)
    const depositAmount = getLeaseDepositAmount(monthlyRent)
    const advanceRentAmount = getLeaseAdvanceRentAmount(monthlyRent)
    const advanceRentMonths = getLeaseAdvanceMonthLabels(leaseAny.start_date)

    const contractData: BailContractData = {
      ownerFirstName: propOwner?.first_name || leaseOwner?.first_name || '',
      ownerLastName: propOwner?.last_name || leaseOwner?.last_name || '',
      ownerIdRef: '',
      ownerPhone: propOwner?.phone || leaseOwner?.phone || '',
      ownerEmail: propOwner?.email || leaseOwner?.email || '',
      ownerAddress: propOwner?.address || property?.address || '',

      tenantFirstName: leaseTenant?.first_name || '',
      tenantLastName: leaseTenant?.last_name || '',
      tenantIdRef: '',
      tenantProfession: '',
      tenantPhone: leaseTenant?.phone || '',
      tenantEmail: leaseTenant?.email || '',

      propertyTitle: property?.title || '',
      propertyAddress: property?.address || '',
      propertyCity: property?.city || '',
      propertyDescription,

      monthlyRent,
      deposit: depositAmount,
      advanceRent: advanceRentAmount,
      advanceRentMonths,

      leaseDuration: String(Math.max(1, Math.round(
        (new Date(leaseAny.end_date).getTime() - new Date(leaseAny.start_date).getTime()) /
        (365.25 * 24 * 60 * 60 * 1000)
      ))),
      startDate: leaseAny.start_date,
      endDate: leaseAny.end_date,

      ownerSignatureImage: leaseAny.owner_signature_image || undefined,
      tenantSignatureImage: leaseAny.tenant_signature_image || undefined,
      ownerSignedAt: leaseAny.owner_signed_at || undefined,
      tenantSignedAt: leaseAny.tenant_signed_at || undefined,

      inventoryItems: mappedItems,
      totalKeys: latestReport?.total_keys ?? undefined,
      generalObservations: latestReport?.general_observations ?? undefined,
    }

    const docxBuffer = await generateBailContract(contractData)

    const baseFilename = `Bail_${(property?.title || '').replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}`

    if (format === 'pdf') {
      try {
        const pdfBuffer = await convertDocxToPdf(docxBuffer, `${baseFilename}.docx`)
        const filename = `${baseFilename}.pdf`
        return new NextResponse(new Uint8Array(pdfBuffer), {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
          },
        })
      } catch (conversionError) {
        console.error('PDF conversion failed, falling back to DOCX:', conversionError)
        const filename = `${baseFilename}.docx`
        return new NextResponse(new Uint8Array(docxBuffer), {
          status: 200,
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
          },
        })
      }
    }

    const filename = `${baseFilename}.docx`
    return new NextResponse(new Uint8Array(docxBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
      },
    })
  } catch (error) {
    console.error('Contract generation error:', error)
    const resp = NextResponse.json({ error: 'Erreur lors de la génération du contrat' }, { status: 500 })
    return resp
  }
}
