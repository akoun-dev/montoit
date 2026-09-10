import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ImageRun,
  ShadingType,
  VerticalAlign,
  PageBreak,
} from 'docx'

// ────────────────────────────────────────────────────────────
// Interface
// ────────────────────────────────────────────────────────────

export interface BailContractData {
  logoImage?: Buffer

  // Owner info
  ownerFirstName: string
  ownerLastName: string
  ownerIdRef: string
  ownerPhone: string
  ownerEmail: string
  ownerAddress: string

  // Tenant info
  tenantFirstName: string
  tenantLastName: string
  tenantIdRef: string
  tenantProfession: string
  tenantPhone: string
  tenantEmail: string

  // Property info
  propertyTitle: string
  propertyAddress: string
  propertyCity: string
  propertyDescription: string

  // Financial
  monthlyRent: number
  deposit: number
  advanceRent: number
  advanceRentMonths: string

  // Lease terms
  leaseDuration: string
  startDate: string
  endDate: string

  // Signature images (base64 PNG data URLs from SignaturePad)
  ownerSignatureImage?: string
  tenantSignatureImage?: string

  // Sign dates
  ownerSignedAt?: string
  tenantSignedAt?: string

  // Inventory report data (optional)
  inventoryItems?: Array<{
    designation: string
    kitchen: string | null
    mainBathroom: string | null
    otherBathroom: string | null
    otherRoom1: string | null
    otherRoom2: string | null
    observations: string | null
  }>
  totalKeys?: number
  generalObservations?: string
}

// ────────────────────────────────────────────────────────────
// Number-to-words in French (up to 99 999 999)
// ────────────────────────────────────────────────────────────

const UNITS = [
  '', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
  'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf',
]

const TENS = [
  '', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt',
]

function below100(n: number): string {
  if (n < 20) return UNITS[n]
  const t = Math.floor(n / 10)
  const u = n % 10
  if (t === 7 || t === 9) {
    // 70-79 = soixante-dix... ; 90-99 = quatre-vingt-dix...
    const base = t === 7 ? 'soixante' : 'quatre-vingt'
    const sub = n - (t === 7 ? 60 : 80)
    if (sub === 1 && t === 7) return base + ' et onze'
    if (sub === 11 && t === 7) return base + ' et onze'
    if (sub < 20) return base + '-' + UNITS[sub]
    return base + '-' + UNITS[sub]
  }
  if (u === 0) {
    if (t === 8) return 'quatre-vingts'
    return TENS[t]
  }
  if (u === 1 && t !== 8) return TENS[t] + ' et un'
  return TENS[t] + '-' + UNITS[u]
}

function below1000(n: number): string {
  if (n < 100) return below100(n)
  const h = Math.floor(n / 100)
  const rest = n % 100
  let prefix = h === 1 ? 'cent' : UNITS[h] + ' cent'
  if (rest === 0) {
    if (h > 1) return prefix + 's'
    return prefix
  }
  return prefix + ' ' + below100(rest)
}

function numberToFrenchWords(n: number): string {
  if (n === 0) return 'zéro'
  if (n < 0 || n > 99999999) return String(n)

  const millions = Math.floor(n / 1000000)
  const thousands = Math.floor((n % 1000000) / 1000)
  const rest = n % 1000

  const parts: string[] = []

  if (millions > 0) {
    if (millions === 1) parts.push('un million')
    else parts.push(below1000(millions) + ' millions')
  }

  if (thousands > 0) {
    if (thousands === 1) parts.push('mille')
    else parts.push(below1000(thousands) + ' mille')
  }

  if (rest > 0) {
    parts.push(below1000(rest))
  }

  return parts.join(' ')
}

function formatFCFA(amount: number): string {
  const words = numberToFrenchWords(amount)
  const formatted = amount.toLocaleString('fr-FR')
  return `${words} (${formatted}) FCFA`
}

// ────────────────────────────────────────────────────────────
// Date formatting
// ────────────────────────────────────────────────────────────

function formatDateFR(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatDateShort(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

// ────────────────────────────────────────────────────────────
// Signature image helper
// ────────────────────────────────────────────────────────────

function signatureImageRun(dataUrl: string | undefined): ImageRun | null {
  if (!dataUrl) return null
  const match = dataUrl.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/)
  if (!match) return null
  const buffer = Buffer.from(match[2], 'base64')
  return new ImageRun({
    data: buffer,
    transformation: { width: 180, height: 70 },
    type: match[1] === 'jpeg' || match[1] === 'jpg' ? 'jpg' : 'png',
  })
}

const BRAND_ORANGE = 'FF6C2F'
const BRAND_INK = '2D2D2D'

function brandHeader(logoImage: Buffer | undefined): Table {
  const logo = logoImage
    ? new ImageRun({ data: logoImage, transformation: { width: 42, height: 42 }, type: 'png' })
    : null

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [new TableRow({ children: [
      new TableCell({
        width: { size: 18, type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.SOLID, color: BRAND_ORANGE },
        borders: { top: { style: BorderStyle.NONE, size: 0 }, bottom: { style: BorderStyle.NONE, size: 0 }, left: { style: BorderStyle.NONE, size: 0 }, right: { style: BorderStyle.NONE, size: 0 } },
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: logo ? [logo] : [] })],
      }),
      new TableCell({
        width: { size: 82, type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.SOLID, color: BRAND_ORANGE },
        borders: { top: { style: BorderStyle.NONE, size: 0 }, bottom: { style: BorderStyle.NONE, size: 0 }, left: { style: BorderStyle.NONE, size: 0 }, right: { style: BorderStyle.NONE, size: 0 } },
        children: [
          new Paragraph({ children: [new TextRun({ text: 'MON TOIT', bold: true, color: 'FFFFFF', size: 30, font: 'Arial' })] }),
          new Paragraph({ children: [new TextRun({ text: 'PLATEFORME DE LOCATION ANSUT', color: 'FFF1E8', size: 16, font: 'Arial' })] }),
        ],
      }),
    ] })],
  })
}

// ────────────────────────────────────────────────────────────
// Helper builders
// ────────────────────────────────────────────────────────────

function titleParagraph(text: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 400, after: 200 },
    children: [
      new TextRun({
        text,
         bold: true,
         color: BRAND_ORANGE,
        size: 32,
        font: 'Times New Roman',
      }),
    ],
  })
}

function subTitleParagraph(text: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 100 },
    children: [
      new TextRun({
        text,
         bold: true,
         color: BRAND_INK,
        size: 24,
        font: 'Times New Roman',
      }),
    ],
  })
}

function emptyLine(): Paragraph {
  return new Paragraph({ spacing: { before: 100, after: 100 }, children: [] })
}

function normalParagraph(text: string, opts?: { bold?: boolean; spacing?: { before?: number; after?: number } }): Paragraph {
  return new Paragraph({
    spacing: opts?.spacing ?? { before: 60, after: 60 },
    children: [
      new TextRun({
        text,
        bold: opts?.bold ?? false,
        size: 22,
        font: 'Times New Roman',
      }),
    ],
  })
}

function articleTitle(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 200, after: 80 },
    children: [
      new TextRun({
        text,
         bold: true,
         color: BRAND_ORANGE,
        size: 22,
        font: 'Times New Roman',
      }),
    ],
  })
}

function articleParagraph(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 40, after: 40 },
    children: [
      new TextRun({
        text,
        size: 22,
        font: 'Times New Roman',
      }),
    ],
  })
}

function italicParagraph(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 40, after: 40 },
    children: [
      new TextRun({
        text,
        italics: true,
        size: 22,
        font: 'Times New Roman',
      }),
    ],
  })
}

function boldInlineParagraph(parts: Array<{ text: string; bold?: boolean; italics?: boolean }>): Paragraph {
  return new Paragraph({
    spacing: { before: 60, after: 60 },
    children: parts.map(
      (p) =>
        new TextRun({
          text: p.text,
          bold: p.bold ?? false,
          italics: p.italics ?? false,
          size: 22,
          font: 'Times New Roman',
        }),
    ),
  })
}

// ────────────────────────────────────────────────────────────
// Inventory table builders
// ────────────────────────────────────────────────────────────

function headerCell(text: string, widthPct: number): TableCell {
  return new TableCell({
    width: { size: widthPct, type: WidthType.PERCENTAGE },
     shading: { type: ShadingType.SOLID, color: BRAND_ORANGE },
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
         new TextRun({ text, bold: true, color: 'FFFFFF', size: 20, font: 'Times New Roman' }),
        ],
      }),
    ],
  })
}

function dataCell(text: string, widthPct: number): TableCell {
  return new TableCell({
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: text || '', size: 20, font: 'Times New Roman' }),
        ],
      }),
    ],
  })
}

function buildInventoryTable(items: BailContractData['inventoryItems']): Table | null {
  if (!items || items.length === 0) return null

  const colWidths = [22, 10, 12, 12, 12, 12, 20]

  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      headerCell('DÉSIGNATION', colWidths[0]),
      headerCell('CUISINE', colWidths[1]),
      headerCell('SDB PRINCIPALE', colWidths[2]),
      headerCell('AUTRE SDB', colWidths[3]),
      headerCell('AUTRE PIÈCE 1', colWidths[4]),
      headerCell('AUTRE PIÈCE 2', colWidths[5]),
      headerCell('OBSERVATIONS', colWidths[6]),
    ],
  })

  const dataRows = items.map(
    (item) =>
      new TableRow({
        children: [
          dataCell(item.designation, colWidths[0]),
          dataCell(item.kitchen === 'BON' ? '☒ BON' : item.kitchen === 'MAUVAIS' ? '☒ MAUVAIS' : item.kitchen ?? '—', colWidths[1]),
          dataCell(item.mainBathroom === 'BON' ? '☒ BON' : item.mainBathroom === 'MAUVAIS' ? '☒ MAUVAIS' : item.mainBathroom ?? '—', colWidths[2]),
          dataCell(item.otherBathroom === 'BON' ? '☒ BON' : item.otherBathroom === 'MAUVAIS' ? '☒ MAUVAIS' : item.otherBathroom ?? '—', colWidths[3]),
          dataCell(item.otherRoom1 === 'BON' ? '☒ BON' : item.otherRoom1 === 'MAUVAIS' ? '☒ MAUVAIS' : item.otherRoom1 ?? '—', colWidths[4]),
          dataCell(item.otherRoom2 === 'BON' ? '☒ BON' : item.otherRoom2 === 'MAUVAIS' ? '☒ MAUVAIS' : item.otherRoom2 ?? '—', colWidths[5]),
          dataCell(item.observations ?? '', colWidths[6]),
        ],
      }),
  )

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...dataRows],
  })
}

// ────────────────────────────────────────────────────────────
// Main generator
// ────────────────────────────────────────────────────────────

export async function generateBailContract(data: BailContractData): Promise<Buffer> {
  const startDateFR = formatDateFR(data.startDate)
  const endDateFR = formatDateFR(data.endDate)
  const todayFR = formatDateFR(new Date().toISOString())

  const ownerSignature = signatureImageRun(data.ownerSignatureImage)
  const tenantSignature = signatureImageRun(data.tenantSignatureImage)

  // ── Build document sections ──

  const children: (Paragraph | Table)[] = []

  // ─────────── TITLE ───────────
  children.push(brandHeader(data.logoImage))
  children.push(emptyLine())
  children.push(titleParagraph("BAIL À USAGE D'HABITATION"))
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 100, after: 300 },
      children: [
        new TextRun({
          text: 'Loi N°2019-576 du 26 juin 2019 instituant Code de la Construction et de l\'Habitat',
          italics: true,
          size: 20,
          font: 'Times New Roman',
        }),
      ],
    }),
  )

  // ─────────── PARTIES ───────────
  children.push(subTitleParagraph('ENTRE LES SOUSSIGNÉS'))

  children.push(emptyLine())

  // Owner
  children.push(
    boldInlineParagraph([
      { text: 'Le BAILLEUR : ', bold: true },
      { text: `Monsieur/Madame ${data.ownerFirstName} ${data.ownerLastName}` },
    ]),
  )
  children.push(normalParagraph(`Demeurant au : ${data.ownerAddress}`))
  children.push(normalParagraph(`Pièce d'identité / RCCM : ${data.ownerIdRef}`))
  children.push(normalParagraph(`Téléphone : ${data.ownerPhone}`))
  children.push(normalParagraph(`Email : ${data.ownerEmail}`))

  children.push(emptyLine())

  // Tenant
  children.push(
    boldInlineParagraph([
      { text: 'Le PRENEUR : ', bold: true },
      { text: `Monsieur/Madame ${data.tenantFirstName} ${data.tenantLastName}` },
    ]),
  )
  children.push(normalParagraph(`Profession : ${data.tenantProfession}`))
  children.push(normalParagraph(`Pièce d'identité : ${data.tenantIdRef}`))
  children.push(normalParagraph(`Téléphone : ${data.tenantPhone}`))
  children.push(normalParagraph(`Email : ${data.tenantEmail}`))

  children.push(emptyLine())

  // ─────────── DESIGNATION ───────────
  children.push(subTitleParagraph('DÉSIGNATION'))

  children.push(
    normalParagraph(
      `Le BAILLEUR donne à bail au PRENEUR qui accepte, ${data.propertyDescription}, situé(e) au ${data.propertyAddress}, ${data.propertyCity}.`,
    ),
  )
  children.push(normalParagraph(`Titre de propriété : ${data.propertyTitle}`))

  children.push(emptyLine())

  // ─────────── ÉTAT DES LIEUX ───────────
  children.push(subTitleParagraph('ÉTAT DES LIEUX'))

  children.push(
    articleParagraph(
      "Un état des lieux contradictoire sera établi à l'entrée et à la sortie du locataire. L'état des lieux d'entrée est annexé au présent contrat. En l'absence d'état des lieux, le locataire est présumé avoir reçu les locaux en bon état et doit les restituer dans le même état.",
    ),
  )

  children.push(emptyLine())

  // ═══════════════════════════════════════════════════════════
  // TITRE I – DISPOSITIONS GÉNÉRALES
  // ═══════════════════════════════════════════════════════════
  children.push(
    new Paragraph({
      spacing: { before: 300, after: 150 },
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: 'TITRE I – DISPOSITIONS GÉNÉRALES',
          bold: true,
          size: 24,
          font: 'Times New Roman',
        }),
      ],
    }),
  )

  // Article 1 – Objet
  children.push(articleTitle('Article 1 – Objet'))
  children.push(
    articleParagraph(
      `Le présent bail a pour objet la location ${data.propertyDescription}, situé(e) au ${data.propertyAddress}, ${data.propertyCity}, appartenant au BAILLEUR et désigné(e) ci-dessus.`,
    ),
  )

  // Article 2 – Durée
  children.push(articleTitle('Article 2 – Durée'))
  children.push(
    articleParagraph(
      `Le présent bail est conclu pour une durée de ${data.leaseDuration} ans à compter du ${startDateFR} pour se terminer le ${endDateFR}. Il est conclu conformément aux dispositions de la Loi N°2019-576 du 26 juin 2019.`,
    ),
  )
  children.push(
    articleParagraph(
      "À l'expiration du bail, le PRENEUR bénéficie du droit de renouvellement dans les conditions prévues par la loi. Le BAILLEUR qui souhaite reprendre le local doit en faire la demande par lettre recommandée avec accusé de réception six (6) mois avant l'expiration du bail.",
    ),
  )

  // Article 3 – Loyer
  children.push(articleTitle('Article 3 – Loyer'))
  children.push(
    articleParagraph(
      `Le loyer est fixé à la somme de ${formatFCFA(data.monthlyRent)} par mois.`,
    ),
  )
  children.push(
    articleParagraph(
      'Le loyer est payable d\'avance, au plus tard le 05 de chaque mois, au domicile du BAILLEUR ou sur son compte bancaire. Toute période commencée est due.',
    ),
  )
  children.push(
    articleParagraph(
      'En cas de retard de paiement, le PRENEUR sera redevable d\'une pénalité de retard de 10 % du montant du loyer après un délai de grâce de dix (10) jours.',
    ),
  )

  // Article 4 – Dépôt de garantie
  children.push(articleTitle('Article 4 – Dépôt de garantie'))
  children.push(
    articleParagraph(
      `À la signature du présent contrat, le PRENEUR verse au BAILLEUR un dépôt de garantie de ${formatFCFA(data.deposit)}.`,
    ),
  )
  children.push(
    articleParagraph(
      "Le dépôt de garantie n'est pas considéré comme un paiement du dernier mois de loyer. Il sera restitué au PRENEUR dans un délai d'un (1) mois après la remise des clés, déduction faite des sommes éventuellement dues par le PRENEUR au titre des loyers impayés, des charges ou des réparations locatives.",
    ),
  )

  // Article 5 – Avance sur loyer
  children.push(articleTitle('Article 5 – Avance sur loyer'))
  children.push(
    articleParagraph(
      `Le PRENEUR verse au BAILLEUR, à la signature du présent contrat, une avance sur loyer de ${formatFCFA(data.advanceRent)} correspondant aux mois de ${data.advanceRentMonths}.`,
    ),
  )

  // Article 6 – Enregistrement
  children.push(articleTitle('Article 6 – Enregistrement'))
  children.push(
    articleParagraph(
      "Le présent bail sera enregistré dans les formes et délais prévus par la loi. Les frais d'enregistrement sont à la charge du BAILLEUR conformément aux dispositions légales en vigueur.",
    ),
  )

  children.push(emptyLine())

  // ═══════════════════════════════════════════════════════════
  // TITRE II – OBLIGATIONS DES PARTIES
  // ═══════════════════════════════════════════════════════════
  children.push(
    new Paragraph({
      spacing: { before: 300, after: 150 },
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: 'TITRE II – OBLIGATIONS DES PARTIES',
          bold: true,
          size: 24,
          font: 'Times New Roman',
        }),
      ],
    }),
  )

  // Article 7 – Obligations du bailleur
  children.push(articleTitle('Article 7 – Obligations du bailleur'))
  children.push(
    articleParagraph(
      'Le BAILLEUR est tenu de :',
    ),
  )
  children.push(articleParagraph('a) Livrer le logement en bon état d\'usage et de réparations ;'))
  children.push(articleParagraph('b) Assurer au locataire la jouissance paisible du logement ;'))
  children.push(articleParagraph('c) Entretenir les locaux en état de servir à l\'usage prévu ;'))
  children.push(articleParagraph('d) Procéder aux grosses réparations nécessaires, sauf clause contraire ;'))
  children.push(articleParagraph('e) Garantir le locataire contre les vices et défauts de nature à empêcher l\'usage du logement ;'))
  children.push(articleParagraph('f) Respecter les normes de décence et d\'habitabilité du logement conformément à la Loi N°2019-576 du 26 juin 2019 ;'))
  children.push(articleParagraph('g) Fournir au locataire un logement décent ne présentant pas de risques manifestes pour la sécurité et la santé ;'))
  children.push(articleParagraph('h) Réparer les dégradations dues à la vétusté, à un vice de construction ou à un cas de force majeure.'))

  // Article 8 – Obligations du preneur
  children.push(articleTitle('Article 8 – Obligations du preneur'))
  children.push(
    articleParagraph(
      'Le PRENEUR est tenu de :',
    ),
  )
  children.push(articleParagraph('a) Payer le loyer et les charges aux termes convenus ;'))
  children.push(articleParagraph('b) User paisiblement des lieux loués suivant la destination qui leur a été donnée par le bail ;'))
  children.push(articleParagraph('c) Répondre des dégradations et pertes qui surviennent pendant la jouissance du logement, à moins qu\'il ne prouve qu\'elles ont eu lieu sans sa faute ;'))
  children.push(articleParagraph('d) Prendre à sa charge les réparations locatives définies par la loi et les menues réparations ;'))
  children.push(articleParagraph('e) S\'abstenir de transformer le logement et les équipements sans l\'accord écrit du BAILLEUR ;'))
  children.push(articleParagraph('f) Permettre l\'accès au logement pour les réparations nécessaires et urgentes ;'))
  children.push(articleParagraph('g) Se conformer aux règles de la copropriété, le cas échéant ;'))
  children.push(articleParagraph('h) Souscrire une assurance habitation et en justifier auprès du BAILLEUR chaque année ;'))
  children.push(articleParagraph('i) Ne pas sous-louer le logement sans l\'accord écrit du BAILLEUR ;'))
  children.push(articleParagraph('j) Restituer le logement en bon état à l\'expiration du bail, sauf usure normale.'))

  // Article 9 – Usage des lieux
  children.push(articleTitle('Article 9 – Usage des lieux'))
  children.push(
    articleParagraph(
      "Le PRENEUR utilisera les lieux exclusivement à des fins d'habitation. Toute modification de l'usage des lieux sans l'accord préalable et écrit du BAILLEUR constitue une violation du présent contrat pouvant entraîner sa résiliation.",
    ),
  )

  // Article 10 – Sous-location
  children.push(articleTitle('Article 10 – Sous-location'))
  children.push(
    articleParagraph(
      "Le PRENEUR ne peut ni sous-louer, ni céder le présent bail sans l'accord préalable et écrit du BAILLEUR. Toute sous-location ou cession non autorisée entraîne la résiliation de plein droit du présent bail.",
    ),
  )

  // Article 11 – Travaux
  children.push(articleTitle('Article 11 – Travaux'))
  children.push(
    articleParagraph(
      "Le PRENEUR ne peut effectuer aucun travail de transformation ou d'aménagement des lieux sans l'autorisation préalable et écrite du BAILLEUR. Les améliorations réalisées avec l'accord du BAILLEUR demeureront dans les lieux sans que le PRENEUR puisse réclamer une indemnité au titre de la plus-value, sauf convention contraire.",
    ),
  )

  // Article 12 – Charges et consommations
  children.push(articleTitle('Article 12 – Charges et consommations'))
  children.push(
    articleParagraph(
      "Le PRENEUR supporte les charges locatives ainsi que les consommations d'eau, d'électricité, de gaz et de toute autre fourniture individuelle relative à son occupation des lieux. Le BAILLEUR fournira un décompte détaillé des charges récupérables une fois par an.",
    ),
  )

  // Article 13 – Assurance
  children.push(articleTitle('Article 13 – Assurance'))
  children.push(
    articleParagraph(
      "Le PRENEUR est tenu de souscrire une assurance couvrant les risques locatifs auprès d'une compagnie agréée et d'en justifier auprès du BAILLEUR lors de la remise des clés puis chaque année à la date d'anniversaire du bail. En cas de non-présentation de l'attestation, le BAILLEUR pourra faire procéder à la résiliation du bail.",
    ),
  )

  // Article 14 – Visite des lieux
  children.push(articleTitle('Article 14 – Visite des lieux'))
  children.push(
    articleParagraph(
      "Le PRENEUR autorise le BAILLEUR ou son mandataire à visiter les lieux loués, sur rendez-vous pris au moins vingt-quatre (24) heures à l'avance, notamment en vue de la vente ou de la relocation des locaux, deux (2) mois avant l'expiration du bail.",
    ),
  )

  // Article 15 – Jouissance paisible
  children.push(articleTitle('Article 15 – Jouissance paisible'))
  children.push(
    articleParagraph(
      "Le BAILLEUR garantit au PRENEUR la jouissance paisible des lieux loués. Le PRENEUR s'engage à ne causer aucune nuisance de nature à porter atteinte à la tranquillité du voisinage, notamment par des bruits excessifs ou des comportements constitutifs de troubles anormaux de voisinage.",
    ),
  )

  children.push(emptyLine())

  // ═══════════════════════════════════════════════════════════
  // TITRE III – FIN DU BAIL
  // ═══════════════════════════════════════════════════════════
  children.push(
    new Paragraph({
      spacing: { before: 300, after: 150 },
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: 'TITRE III – FIN DU BAIL',
          bold: true,
          size: 24,
          font: 'Times New Roman',
        }),
      ],
    }),
  )

  // Article 16 – Résiliation
  children.push(articleTitle('Article 16 – Résiliation'))
  children.push(
    articleParagraph(
      'Le présent bail sera résilié de plein droit, sans nécessité de procédure judiciaire, en cas de :',
    ),
  )
  children.push(articleParagraph('a) Non-paiement du loyer aux échéances convenues ;'))
  children.push(articleParagraph('b) Non-souscription d\'assurance locative ;'))
  children.push(articleParagraph('c) Sous-location ou cession non autorisée ;'))
  children.push(articleParagraph('d) Transformation des lieux sans autorisation ;'))
  children.push(articleParagraph('e) Utilisation des lieux à des fins autres que l\'habitation ;'))
  children.push(articleParagraph('f) Troubles anormaux de voisinage constatés.'))
  children.push(
    articleParagraph(
      'En cas de résiliation, le PRENEUR devra quitter les lieux dans un délai de trente (30) jours à compter de la notification de la résiliation.',
    ),
  )

  // Article 17 – Congé
  children.push(articleTitle('Article 17 – Congé'))
  children.push(
    articleParagraph(
      "Chaque partie peut donner congé à l'autre par lettre recommandée avec accusé de rétention ou par acte d'huissier, en respectant un préavis de :",
    ),
  )
  children.push(articleParagraph('- Six (6) mois pour le BAILLEUR ;'))
  children.push(articleParagraph('- Trois (3) mois pour le PRENEUR.'))
  children.push(
    articleParagraph(
      "Le délai de préavis court à compter de la réception de la notification. Le PRENEUR est redevable du loyer pendant toute la durée du préavis, sauf si les lieux sont reloués avant l'expiration du préavis et avec l'accord du BAILLEUR.",
    ),
  )

  // Article 18 – Restitution des lieux
  children.push(articleTitle('Article 18 – Restitution des lieux'))
  children.push(
    articleParagraph(
      "À l'expiration du bail ou en cas de résiliation, le PRENEUR doit restituer les lieux dans l'état où il les a reçus, conformément à l'état des lieux d'entrée, déduction faite de l'usure normale. Un état des lieux de sortie contradictoire sera établi. Les clés seront remises au BAILLEUR le jour du départ effectif du locataire.",
    ),
  )

  // Article 19 – Dépôt de garantie – restitution
  children.push(articleTitle('Article 19 – Restitution du dépôt de garantie'))
  children.push(
    articleParagraph(
      "Le dépôt de garantie sera restitué au PRENEUR dans un délai maximum d'un (1) mois à compter de la remise des clés, déduction faite des sommes éventuellement dues au BAILLEUR au titre des loyers impayés, des charges impayées, des réparations locatives ou des dégradations constatées lors de l'état des lieux de sortie. En cas de contestation, le BAILLEUR conservera le dépôt de garantie jusqu'à l'intervention d'une décision judiciaire.",
    ),
  )

  children.push(emptyLine())

  // ═══════════════════════════════════════════════════════════
  // TITRE IV – DISPOSITIONS DIVERSES
  // ═══════════════════════════════════════════════════════════
  children.push(
    new Paragraph({
      spacing: { before: 300, after: 150 },
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: 'TITRE IV – DISPOSITIONS DIVERSES',
          bold: true,
          size: 24,
          font: 'Times New Roman',
        }),
      ],
    }),
  )

  // Article 20 – Copropriété
  children.push(articleTitle('Article 20 – Copropriété'))
  children.push(
    articleParagraph(
      "Si le logement se trouve dans un immeuble en copropriété, le PRENEUR est tenu de se conformer au règlement de copropriété qui lui a été communiqué préalablement à la signature du présent bail. Le PRENEUR supporte les charges de copropriété récupérables sur le locataire dans les conditions prévues par la loi.",
    ),
  )

  // Article 21 – Juridiction compétente
  children.push(articleTitle('Article 21 – Juridiction compétente'))
  children.push(
    articleParagraph(
      "En cas de litige relatif à l'interprétation ou à l'exécution du présent contrat, les parties s'efforceront de trouver une solution amiable. À défaut d'accord amiable, le litige sera soumis aux tribunaux compétents de la République de Côte d'Ivoire, conformément aux dispositions du Code de la Construction et de l'Habitat.",
    ),
  )

  children.push(emptyLine())
  children.push(emptyLine())

  // ─────────── SIGNATURE SECTION ───────────
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 200 },
      children: [
        new TextRun({
          text: `Fait à Abidjan, le ${todayFR}`,
          bold: true,
          size: 22,
          font: 'Times New Roman',
        }),
      ],
    }),
  )

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 100, after: 100 },
      children: [
        new TextRun({
          text: 'En deux (2) exemplaires originaux, dont un remis à chaque partie.',
          italics: true,
          size: 20,
          font: 'Times New Roman',
        }),
      ],
    }),
  )

  children.push(emptyLine())
  children.push(emptyLine())

  // Signature blocks – Owner on left, Tenant on right
  const ownerSigChildren: (TextRun | ImageRun)[] = [
    new TextRun({
      text: 'Le BAILLEUR',
      bold: true,
      size: 22,
      font: 'Times New Roman',
    }),
  ]
  if (ownerSignature) {
    ownerSigChildren.push(new TextRun({ break: 1 }))
    ownerSigChildren.push(ownerSignature)
  }
  if (data.ownerSignedAt) {
    ownerSigChildren.push(new TextRun({ break: 1 }))
    ownerSigChildren.push(
      new TextRun({
        text: `Signé le : ${formatDateShort(data.ownerSignedAt)}`,
        size: 18,
        font: 'Times New Roman',
      }),
    )
  }
  ownerSigChildren.push(new TextRun({ break: 1 }))
  ownerSigChildren.push(
    new TextRun({
      text: `${data.ownerFirstName} ${data.ownerLastName}`,
      size: 20,
      font: 'Times New Roman',
    }),
  )

  const tenantSigChildren: (TextRun | ImageRun)[] = [
    new TextRun({
      text: 'Le PRENEUR',
      bold: true,
      size: 22,
      font: 'Times New Roman',
    }),
  ]
  if (tenantSignature) {
    tenantSigChildren.push(new TextRun({ break: 1 }))
    tenantSigChildren.push(tenantSignature)
  }
  if (data.tenantSignedAt) {
    tenantSigChildren.push(new TextRun({ break: 1 }))
    tenantSigChildren.push(
      new TextRun({
        text: `Signé le : ${formatDateShort(data.tenantSignedAt)}`,
        size: 18,
        font: 'Times New Roman',
      }),
    )
  }
  tenantSigChildren.push(new TextRun({ break: 1 }))
  tenantSigChildren.push(
    new TextRun({
      text: `${data.tenantFirstName} ${data.tenantLastName}`,
      size: 20,
      font: 'Times New Roman',
    }),
  )

  // Build a 2-column table for side-by-side signatures
  const signatureTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE, size: 0 },
              bottom: { style: BorderStyle.NONE, size: 0 },
              left: { style: BorderStyle.NONE, size: 0 },
              right: { style: BorderStyle.NONE, size: 0 },
            },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 100 },
                children: ownerSigChildren,
              }),
            ],
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE, size: 0 },
              bottom: { style: BorderStyle.NONE, size: 0 },
              left: { style: BorderStyle.NONE, size: 0 },
              right: { style: BorderStyle.NONE, size: 0 },
            },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 100 },
                children: tenantSigChildren,
              }),
            ],
          }),
        ],
      }),
    ],
  })

  children.push(signatureTable)

  // ─────────── INVENTORY REPORT (ÉTAT DES LIEUX CONTRADICTOIRE) ───────────
  if (data.inventoryItems && data.inventoryItems.length > 0) {
    children.push(
      new Paragraph({
        children: [new PageBreak()],
      }),
    )
    children.push(brandHeader(data.logoImage))
    children.push(emptyLine())

    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 400, after: 200 },
        children: [
          new TextRun({
            text: "ÉTAT DES LIEUX CONTRADICTOIRE",
            bold: true,
            size: 28,
            font: 'Times New Roman',
          }),
        ],
      }),
    )

    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 100, after: 200 },
        children: [
          new TextRun({
            text: `${data.propertyDescription}`,
            italics: true,
            size: 22,
            font: 'Times New Roman',
          }),
        ],
      }),
    )

    children.push(
      normalParagraph(`Adresse : ${data.propertyAddress}, ${data.propertyCity}`),
    )

    children.push(
      boldInlineParagraph([
        { text: 'BAILLEUR : ', bold: true },
        { text: `${data.ownerFirstName} ${data.ownerLastName}` },
      ]),
    )

    children.push(
      boldInlineParagraph([
        { text: 'PRENEUR : ', bold: true },
        { text: `${data.tenantFirstName} ${data.tenantLastName}` },
      ]),
    )

    if (data.totalKeys !== undefined) {
      children.push(
        normalParagraph(`Nombre total de clés remises : ${data.totalKeys}`),
      )
    }

    children.push(emptyLine())

    // BON / MAUVAIS legend
    children.push(
      normalParagraph('Légende : ☒ BON = État satisfaisant | ☒ MAUVAIS = État dégradé ou non fonctionnel', {
        bold: false,
        spacing: { before: 100, after: 200 },
      }),
    )

    const inventoryTable = buildInventoryTable(data.inventoryItems)
    if (inventoryTable) {
      children.push(inventoryTable)
    }

    if (data.generalObservations) {
      children.push(emptyLine())
      children.push(
        boldInlineParagraph([
          { text: 'Observations générales : ', bold: true },
          { text: data.generalObservations },
        ]),
      )
    }

    children.push(emptyLine())
    children.push(emptyLine())

    // Final signature area
    const finalOwnerSigChildren: (TextRun | ImageRun)[] = [
      new TextRun({
        text: 'BAILLEUR',
        bold: true,
        size: 22,
        font: 'Times New Roman',
      }),
    ]
    if (ownerSignature) {
      finalOwnerSigChildren.push(new TextRun({ break: 1 }))
      finalOwnerSigChildren.push(ownerSignature)
    }
    if (data.ownerSignedAt) {
      finalOwnerSigChildren.push(new TextRun({ break: 1 }))
      finalOwnerSigChildren.push(
        new TextRun({
          text: `Date : ${formatDateShort(data.ownerSignedAt)}`,
          size: 18,
          font: 'Times New Roman',
        }),
      )
    }

    const finalTenantSigChildren: (TextRun | ImageRun)[] = [
      new TextRun({
        text: 'PRENEUR',
        bold: true,
        size: 22,
        font: 'Times New Roman',
      }),
    ]
    if (tenantSignature) {
      finalTenantSigChildren.push(new TextRun({ break: 1 }))
      finalTenantSigChildren.push(tenantSignature)
    }
    if (data.tenantSignedAt) {
      finalTenantSigChildren.push(new TextRun({ break: 1 }))
      finalTenantSigChildren.push(
        new TextRun({
          text: `Date : ${formatDateShort(data.tenantSignedAt)}`,
          size: 18,
          font: 'Times New Roman',
        }),
      )
    }

    const finalSignatureTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              borders: {
                top: { style: BorderStyle.NONE, size: 0 },
                bottom: { style: BorderStyle.NONE, size: 0 },
                left: { style: BorderStyle.NONE, size: 0 },
                right: { style: BorderStyle.NONE, size: 0 },
              },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 100 },
                  children: finalOwnerSigChildren,
                }),
              ],
            }),
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              borders: {
                top: { style: BorderStyle.NONE, size: 0 },
                bottom: { style: BorderStyle.NONE, size: 0 },
                left: { style: BorderStyle.NONE, size: 0 },
                right: { style: BorderStyle.NONE, size: 0 },
              },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 100 },
                  children: finalTenantSigChildren,
                }),
              ],
            }),
          ],
        }),
      ],
    })

    children.push(finalSignatureTable)
  }

  // ─────────── BUILD DOCUMENT ───────────

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              width: 11906, // A4 width in twips (210mm)
              height: 16838, // A4 height in twips (297mm)
            },
            margin: {
              top: 1440,
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        children: children,
      },
    ],
  })

  const buffer = await Packer.toBuffer(doc)
  return Buffer.from(buffer)
}
