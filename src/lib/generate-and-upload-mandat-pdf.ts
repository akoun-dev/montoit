import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { uploadFromBase64, BUCKETS } from '@/lib/supabase/storage'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { writeFile, readFile, unlink, mkdir } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

const execFileAsync = promisify(execFile)

async function convertHtmlToPdf(html: string, filename: string): Promise<Buffer | null> {
  try {
    const tmpDir = join(tmpdir(), 'mon-toit-contracts')
    await mkdir(tmpDir, { recursive: true })
    const baseName = filename.replace(/\.html$/, '').replace(/\.pdf$/, '')
    const htmlPath = join(tmpDir, `${baseName}.html`)
    const pdfPath = join(tmpDir, `${baseName}.pdf`)

    try {
      await writeFile(htmlPath, html, 'utf-8')
      // Use wkhtmltopdf if available, or puppeteer as fallback
      try {
        await execFileAsync('wkhtmltopdf', [
          '--enable-local-file-access',
          '--margin-top', '20',
          '--margin-right', '20',
          '--margin-bottom', '20',
          '--margin-left', '20',
          htmlPath,
          pdfPath,
        ], { timeout: 30000 })
      } catch (wkErr) {
        console.error('wkhtmltopdf not available, trying puppeteer-like conversion:', wkErr)
        // Fallback: Try using wkhtmltoimage or other tools
        try {
          await execFileAsync('wkhtmltoimage', [
            '--enable-local-file-access',
            '--format', 'pdf',
            htmlPath,
            pdfPath,
          ], { timeout: 30000 })
        } catch {
          // Last resort: write HTML directly and let the client print
          return null
        }
      }
      const pdfBuffer = await readFile(pdfPath)
      return pdfBuffer
    } finally {
      try { await unlink(htmlPath) } catch { /* ignore */ }
      try { await unlink(pdfPath) } catch { /* ignore */ }
    }
  } catch (err) {
    console.error('convertHtmlToPdf error:', err)
    return null
  }
}

const MANDAT_TYPE_LABELS: Record<string, string> = {
  GESTION_COMPLETE: 'Gestion complète',
  GESTION_LOCATION: 'Gestion location',
  MANDAT_SIMPLE: 'Mandat simple',
}

const COMMISSION_TYPE_LABELS: Record<string, string> = {
  PERCENTAGE: 'Pourcentage',
  FIXED: 'Montant fixe',
}

export async function generateAndUploadMandatPdf(
  mandatId: string,
  version: 'initial' | 'owner_signed' | 'agency_signed' | 'final' = 'initial'
): Promise<string | null> {
  const supabase = getSupabaseAdminClient()

  const { data: mandat } = await supabase
    .from('mandats')
    .select('*')
    .eq('id', mandatId)
    .maybeSingle()

  if (!mandat) {
    console.error(`generateAndUploadMandatPdf: Mandat ${mandatId} not found`)
    return null
  }

  const [propRes, usersRes] = await Promise.all([
    supabase.from('properties').select('*').eq('id', mandat.property_id).maybeSingle(),
    supabase.from('users').select('*').in('id', [mandat.owner_id, mandat.agency_id].filter(Boolean)),
  ])

  const property = (propRes as any).data
  const userMap = new Map((usersRes.data ?? []).map((u: any) => [u.id, u]))
  const owner = userMap.get(mandat.owner_id)
  const agency = userMap.get(mandat.agency_id)

  const today = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  const startDate = new Date(mandat.start_date).toLocaleDateString('fr-FR')
  const endDate = new Date(mandat.end_date).toLocaleDateString('fr-FR')

  const commissionText = mandat.commission_type === 'FIXED' && mandat.fixed_commission
    ? `${mandat.fixed_commission.toLocaleString('fr-FR')} FCFA`
    : `${mandat.commissionRate}%`

  const ownerSigHtml = version !== 'initial' && mandat.owner_signature_image
    ? `<tr><td style="padding: 8px 0;"><strong>Signature propriétaire :</strong></td></tr>
       <tr><td style="padding: 0 0 8px 0;"><img src="${mandat.owner_signature_image}" style="max-width: 200px; max-height: 80px;" /></td></tr>
       <tr><td style="padding: 0 0 8px 0; font-size: 11px; color: #666;">Signé le ${mandat.owner_signed_at ? new Date(mandat.owner_signed_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}</td></tr>`
    : ''

  const agencySigHtml = (version === 'agency_signed' || version === 'final') && mandat.agency_signature_image
    ? `<tr><td style="padding: 8px 0;"><strong>Signature agence :</strong></td></tr>
       <tr><td style="padding: 0 0 8px 0;"><img src="${mandat.agency_signature_image}" style="max-width: 200px; max-height: 80px;" /></td></tr>
       <tr><td style="padding: 0 0 8px 0; font-size: 11px; color: #666;">Signé le ${mandat.agency_signed_at ? new Date(mandat.agency_signed_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}</td></tr>`
    : ''

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @page { margin: 20mm; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #222; line-height: 1.6; margin: 0; padding: 0; }
    .header { text-align: center; margin-bottom: 24px; border-bottom: 2px solid #FF6C2F; padding-bottom: 16px; }
    .header h1 { color: #FF6C2F; font-size: 20px; margin: 0 0 4px; }
    .header p { color: #666; font-size: 11px; margin: 0; }
    h2 { font-size: 14px; color: #FF6C2F; border-bottom: 1px solid #ddd; padding-bottom: 6px; margin: 20px 0 12px; }
    table { width: 100%; border-collapse: collapse; margin: 8px 0; }
    td, th { padding: 6px 8px; text-align: left; vertical-align: top; }
    .label { color: #888; font-size: 11px; width: 140px; }
    .value { font-weight: 600; }
    .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #ddd; font-size: 10px; color: #999; text-align: center; }
    .conditions { background: #f9f9f9; padding: 12px; border-radius: 6px; margin: 8px 0; font-style: italic; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Certificat de Mandat de Gestion</h1>
    <p>Réf : ${mandatId.slice(0, 8).toUpperCase()} | Généré le ${today}</p>
    <p>Statut : ${version === 'final' ? 'Signé par les deux parties' : version === 'owner_signed' ? 'Signé par le propriétaire' : version === 'agency_signed' ? 'Signé par l\'agence' : 'En attente de signature'}</p>
  </div>

  <h2>Parties concernées</h2>
  <table>
    <tr><td class="label">Propriétaire</td><td class="value">${owner?.first_name || ''} ${owner?.last_name || ''}</td></tr>
    <tr><td class="label">Email</td><td>${owner?.email || ''}</td></tr>
    <tr><td class="label">Agence</td><td class="value">${agency?.first_name || ''} ${agency?.last_name || ''}</td></tr>
    <tr><td class="label">Email</td><td>${agency?.email || ''}</td></tr>
  </table>

  <h2>Bien immobilier</h2>
  <table>
    <tr><td class="label">Titre</td><td class="value">${property?.title || ''}</td></tr>
    <tr><td class="label">Adresse</td><td>${property?.address || ''}${property?.city ? `, ${property.city}` : ''}</td></tr>
    <tr><td class="label">Type</td><td>${property?.type || ''}</td></tr>
  </table>

  <h2>Conditions du mandat</h2>
  <table>
    <tr><td class="label">Type de mandat</td><td class="value">${MANDAT_TYPE_LABELS[mandat.type] || mandat.type}</td></tr>
    <tr><td class="label">Commission</td><td class="value">${commissionText} (${COMMISSION_TYPE_LABELS[mandat.commission_type] || mandat.commission_type})</td></tr>
    <tr><td class="label">Période</td><td>Du ${startDate} au ${endDate}</td></tr>
  </table>
  ${mandat.conditions ? `<h2>Conditions particulières</h2><div class="conditions">${mandat.conditions}</div>` : ''}

  <h2>Signatures</h2>
  <table>
    ${ownerSigHtml}
    ${agencySigHtml}
  </table>

  <div class="footer">
    <p>Document généré automatiquement par la plateforme Mon Toit.</p>
    <p>Ce certificat atteste de l'existence et du statut du mandat de gestion.</p>
  </div>
</body>
</html>`

  // Try to convert HTML to PDF
  const baseFilename = `Mandat_${(property?.title || 'contrat').replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}`
  const pdfBuffer = await convertHtmlToPdf(html, `${baseFilename}.html`)

  // Determine file extension and content
  const ext = pdfBuffer ? 'pdf' : 'html'
  const contentBuffer = pdfBuffer || Buffer.from(html, 'utf-8')
  const storagePath = `${mandatId}/mandat_${version}.${ext}`

  // Upload to Supabase Storage
  const mimeType = ext === 'pdf' ? 'application/pdf' : 'text/html'
  const base64Data = `data:${mimeType};base64,${contentBuffer.toString('base64')}`

  try {
    const publicUrl = await uploadFromBase64(BUCKETS.MANDAT_DOCUMENTS, base64Data, storagePath)
    return publicUrl
  } catch (error) {
    console.error('Failed to upload mandat PDF:', error)
    return null
  }
}