import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { generateBailContract, type BailContractData } from '@/lib/generate-bail'
import { uploadFromBase64, getPublicUrl, BUCKETS } from '@/lib/supabase/storage'
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

async function convertDocxToPdf(docxBuffer: Buffer, filename: string): Promise<Buffer | null> {
  try {
    const tmpDir = join(tmpdir(), 'mon-toit-contracts')
    await mkdir(tmpDir, { recursive: true })
    const baseName = filename.replace(/\.docx$/, '').replace(/\.pdf$/, '')
    const docxPath = join(tmpDir, `${baseName}.docx`)
    const pdfPath = join(tmpDir, `${baseName}.pdf`)

    try {
      await writeFile(docxPath, docxBuffer)
      await execFileAsync('libreoffice', [
        '--headless', '--convert-to', 'pdf', '--outdir', tmpDir, docxPath,
      ], { timeout: 30000 })
      const pdfBuffer = await readFile(pdfPath)
      return pdfBuffer
    } finally {
      try { await unlink(docxPath) } catch { /* ignore */ }
      try { await unlink(pdfPath) } catch { /* ignore */ }
    }
  } catch {
    return null // Fallback: DOCX only
  }
}

function bufferToBase64(buffer: Buffer): string {
  return `data:application/pdf;base64,${buffer.toString('base64')}`
}

/**
 * Generate the lease contract as PDF (with DOCX fallback) and upload to Supabase Storage.
 * Returns the public URL of the stored document, or null if generation failed.
 * @param leaseId - The lease ID
 * @param version - Document version (e.g. 'v1' for initial, 'v2' for owner-signed, 'v3' for final)
 * @returns The public URL or null
 */
export async function generateAndUploadLeasePdf(
  leaseId: string,
  version: 'initial' | 'owner_signed' | 'tenant_signed' | 'final' = 'initial'
): Promise<string | null> {
  const supabase = getSupabaseAdminClient()

  // Fetch lease with all related data
  const { data: lease } = await supabase
    .from('leases')
    .select('*')
    .eq('id', leaseId)
    .maybeSingle()

  if (!lease) {
    console.error(`generateAndUploadLeasePdf: Lease ${leaseId} not found`)
    return null
  }

  const [propRes, usersRes] = await Promise.all([
    supabase.from('properties').select('*').eq('id', lease.property_id).maybeSingle(),
    supabase.from('users').select('*').in('id', [lease.owner_id, lease.tenant_id].filter(Boolean)),
  ])

  const property = (propRes as any).data
  const userMap = new Map((usersRes.data ?? []).map((u: any) => [u.id, u]))
  const leaseOwner = userMap.get(lease.owner_id)
  const leaseTenant = userMap.get(lease.tenant_id)

  let propOwner: Record<string, any> | undefined
  if (property?.owner_id && property.owner_id !== lease.owner_id) {
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
    .eq('lease_id', leaseId)
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
  const monthlyRent = getLeaseMonthlyRent(lease.monthly_rent, property?.price || 0)
  const depositAmount = getLeaseDepositAmount(monthlyRent)
  const advanceRentAmount = getLeaseAdvanceRentAmount(monthlyRent)
  const advanceRentMonths = getLeaseAdvanceMonthLabels(lease.start_date)

  const mappedItems = inventoryItems.map((item: any) => ({
    designation: item.designation,
    kitchen: item.kitchen,
    mainBathroom: item.main_bathroom,
    otherBathroom: item.other_bathroom,
    otherRoom1: item.other_room_1,
    otherRoom2: item.other_room_2,
    observations: item.observations,
  }))

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
      (new Date(lease.end_date).getTime() - new Date(lease.start_date).getTime()) /
      (365.25 * 24 * 60 * 60 * 1000)
    ))),
    startDate: lease.start_date,
    endDate: lease.end_date,

    // For 'initial' version: no signatures
    ownerSignatureImage: version !== 'initial' ? (lease.owner_signature_image || undefined) : undefined,
    tenantSignatureImage: version === 'final' || version === 'tenant_signed' ? (lease.tenant_signature_image || undefined) : undefined,
    ownerSignedAt: version !== 'initial' ? (lease.owner_signed_at || undefined) : undefined,
    tenantSignedAt: version === 'final' || version === 'tenant_signed' ? (lease.tenant_signed_at || undefined) : undefined,

    inventoryItems: mappedItems,
    totalKeys: latestReport?.total_keys ?? undefined,
    generalObservations: latestReport?.general_observations ?? undefined,
  }

  // Generate DOCX
  const docxBuffer = await generateBailContract(contractData)

  // Try to convert to PDF
  const baseFilename = `Bail_${(property?.title || 'contrat').replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}`
  const pdfBuffer = await convertDocxToPdf(docxBuffer, `${baseFilename}.docx`)

  // Determine file extension and content
  const ext = pdfBuffer ? 'pdf' : 'docx'
  const contentBuffer = pdfBuffer || docxBuffer
  const storagePath = `${leaseId}/bail_${version}.${ext}`

  // Upload to Supabase Storage
  const base64Data = `data:application/${ext === 'pdf' ? 'pdf' : 'vnd.openxmlformats-officedocument.wordprocessingml.document'};base64,${contentBuffer.toString('base64')}`

  try {
    const publicUrl = await uploadFromBase64(BUCKETS.LEASE_DOCUMENTS, base64Data, storagePath)
    return publicUrl
  } catch (error) {
    console.error(`Failed to upload lease PDF to Storage:`, error)
    return null
  }
}
