import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdAndRole } from '@/lib/session'
import { generateBailContract, type BailContractData } from '@/lib/generate-bail'
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
    // Write DOCX to temp file
    await writeFile(docxPath, docxBuffer)

    // Convert using LibreOffice headless
    await execFileAsync('libreoffice', [
      '--headless',
      '--convert-to', 'pdf',
      '--outdir', tmpDir,
      docxPath,
    ], { timeout: 30000 })

    // Read the generated PDF
    const pdfBuffer = await readFile(pdfPath)
    return pdfBuffer
  } finally {
    // Clean up temp files
    try { await unlink(docxPath) } catch { /* ignore */ }
    try { await unlink(pdfPath) } catch { /* ignore */ }
  }
}

// GET /api/leases/[id]/contract — Generate and download the bail contract as .docx or .pdf
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getUserIdAndRole(req)
    if (!authResult) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const { userId } = authResult

    const { id } = await params

    // Check format parameter
    const format = req.nextUrl.searchParams.get('format') || 'pdf'

    // Fetch the lease with all related data
    const lease = await db.lease.findUnique({
      where: { id },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            address: true,
            city: true,
            commune: true,
            description: true,
            type: true,
            area: true,
            bedrooms: true,
            bathrooms: true,
            owner: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                address: true,
              },
            },
          },
        },
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            address: true,
          },
        },
        tenant: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        inventoryReports: {
          include: {
            items: {
              orderBy: { designationOrder: 'asc' },
            },
          },
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!lease) {
      return NextResponse.json({ error: 'Bail introuvable' }, { status: 404 })
    }

    // Authorization: must be owner, tenant, or TC
    if (lease.ownerId !== userId && lease.tenantId !== userId) {
      const auth = await getUserIdAndRole(req)
      if (!auth || auth.effectiveRole !== 'TIERS_CONFIANCE') {
        return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
      }
    }

    // Must be signed by at least one party
    if (!lease.ownerSignedAt && !lease.tenantSignedAt) {
      return NextResponse.json(
        { error: 'Le bail doit être signé par au moins une partie pour télécharger le contrat' },
        { status: 400 }
      )
    }

    // Build property description
    const prop = lease.property
    const descParts: string[] = []
    if (prop.type) descParts.push(prop.type.toLowerCase())
    if (prop.bedrooms) descParts.push(`${prop.bedrooms} chambre${prop.bedrooms > 1 ? 's' : ''}`)
    if (prop.area) descParts.push(`${prop.area} m²`)
    const propertyDescription = descParts.length > 0
      ? `un logement composé de ${descParts.join(', ')}`
      : prop.description || prop.title

    // Build inventory items
    const latestReport = lease.inventoryReports?.[0]
    const inventoryItems = latestReport?.items?.map((item) => ({
      designation: item.designation,
      kitchen: item.kitchen,
      mainBathroom: item.mainBathroom,
      otherBathroom: item.otherBathroom,
      otherRoom1: item.otherRoom1,
      otherRoom2: item.otherRoom2,
      observations: item.observations,
    }))

    // Build contract data
    const contractData: BailContractData = {
      ownerFirstName: lease.owner.firstName,
      ownerLastName: lease.owner.lastName,
      ownerIdRef: '',
      ownerPhone: lease.owner.phone || '',
      ownerEmail: lease.owner.email,
      ownerAddress: lease.owner.address || prop.address || '',

      tenantFirstName: lease.tenant.firstName,
      tenantLastName: lease.tenant.lastName,
      tenantIdRef: '',
      tenantProfession: '',
      tenantPhone: lease.tenant.phone || '',
      tenantEmail: lease.tenant.email || '',

      propertyTitle: prop.title,
      propertyAddress: prop.address || '',
      propertyCity: prop.city || '',
      propertyDescription,

      monthlyRent: lease.monthlyRent,
      deposit: lease.deposit || 0,
      advanceRent: 0,
      advanceRentMonths: '',

      leaseDuration: String(Math.max(1, Math.round(
        (new Date(lease.endDate).getTime() - new Date(lease.startDate).getTime()) /
        (365.25 * 24 * 60 * 60 * 1000)
      ))),
      startDate: lease.startDate.toISOString(),
      endDate: lease.endDate.toISOString(),

      ownerSignatureImage: lease.ownerSignatureImage || undefined,
      tenantSignatureImage: lease.tenantSignatureImage || undefined,
      ownerSignedAt: lease.ownerSignedAt?.toISOString(),
      tenantSignedAt: lease.tenantSignedAt?.toISOString(),

      inventoryItems,
      totalKeys: latestReport?.totalKeys ?? undefined,
      generalObservations: latestReport?.generalObservations ?? undefined,
    }

    // Generate the .docx buffer
    const docxBuffer = await generateBailContract(contractData)

    const baseFilename = `Bail_${prop.title.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}`

    if (format === 'pdf') {
      // Convert DOCX → PDF using LibreOffice headless
      try {
        const pdfBuffer = await convertDocxToPdf(docxBuffer, `${baseFilename}.docx`)
        const filename = `${baseFilename}.pdf`

        return new NextResponse(pdfBuffer, {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
          },
        })
      } catch (conversionError) {
        console.error('PDF conversion failed, falling back to DOCX:', conversionError)
        // Fall back to DOCX if PDF conversion fails
        const filename = `${baseFilename}.docx`
        return new NextResponse(docxBuffer, {
          status: 200,
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
          },
        })
      }
    }

    // Return DOCX directly
    const filename = `${baseFilename}.docx`
    return new NextResponse(docxBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
      },
    })
  } catch (error) {
    console.error('Contract generation error:', error)
    return NextResponse.json({ error: 'Erreur lors de la génération du contrat' }, { status: 500 })
  }
}
