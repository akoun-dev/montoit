import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdFromRequest, getUserIdAndRole } from '@/lib/session'

const VALID_PROPERTY_TYPES = ['APPARTEMENT', 'MAISON', 'STUDIO', 'DUPLEX', 'PENTHOUSE', 'VILLA'] as const
const MAX_IMAGES = 10
const MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024 // 50MB

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)

    // Parse query params
    const limitParam = searchParams.get('limit')
    const sort = searchParams.get('sort')
    const type = searchParams.get('type')
    const commune = searchParams.get('commune')
    const search = searchParams.get('search')
    const minPrice = searchParams.get('minPrice')
    const maxPrice = searchParams.get('maxPrice')
    const minBedrooms = searchParams.get('minBedrooms')
    const furnished = searchParams.get('furnished')
    const all = searchParams.get('all')
    const pending = searchParams.get('pending')
    const mine = searchParams.get('mine')

    const limit = limitParam ? parseInt(limitParam) : 6

    // Check if user is requesting their own properties
    let isMineRequest = false
    let mineUserId: string | null = null
    if (mine === 'true') {
      const authResult = await getUserIdAndRole(req)
      if (authResult) {
        isMineRequest = true
        mineUserId = authResult.userId
      }
    }

    // Check if TC user is requesting pending verification properties
    let isTCRequestingPending = false
    if (pending === 'true') {
      const authResult = await getUserIdAndRole(req)
      if (authResult && authResult.effectiveRole === 'TIERS_CONFIANCE') {
        isTCRequestingPending = true
      }
    }

    // Build where clause
    // Public listing only shows ACTIVE properties; TC with pending=true sees PENDING_VERIFICATION
    // mine=true shows all statuses for the authenticated user's properties
    const where: Record<string, unknown> = isMineRequest
      ? { ownerId: mineUserId }
      : {
          status: isTCRequestingPending ? 'PENDING_VERIFICATION' : 'ACTIVE',
        }

    if (type) {
      where.type = type
    }

    if (commune) {
      where.commune = { contains: commune }
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { address: { contains: search } },
        { commune: { contains: search } },
      ]
    }

    if (minPrice || maxPrice) {
      where.price = {}
      if (minPrice) where.price.gte = parseFloat(minPrice)
      if (maxPrice) where.price.lte = parseFloat(maxPrice)
    }

    if (minBedrooms) {
      where.bedrooms = { gte: parseInt(minBedrooms) }
    }

    if (furnished === 'true') {
      where.isFurnished = true
    } else if (furnished === 'false') {
      where.isFurnished = false
    }

    // Build order by
    let orderBy: Record<string, string> = { createdAt: 'desc' }
    if (sort === 'price-asc') orderBy = { price: 'asc' }
    else if (sort === 'price-desc') orderBy = { price: 'desc' }
    else if (sort === 'popular') orderBy = { viewsCount: 'desc' }
    // "recent" or default → createdAt desc

    // Execute query
    const properties = await db.property.findMany({
      where,
      include: {
        images: {
          where: { order: 0 },
          take: 1,
        },
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            createdAt: true,
          },
        },
      },
      orderBy,
      ...(all === 'true' ? {} : { take: limit }),
    })

    // Transform: flatten first image into `image` field
    const result = properties.map(({ images, ...property }: { images: { url: string }[]; [key: string]: unknown }) => ({
      ...property,
      image: images.length > 0 ? images[0].url : null,
    }))

    return NextResponse.json({ properties: result })
  } catch (error) {
    console.error('Properties error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST /api/properties — Create a new property (draft or published) with images and optional video
export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    // 2. Validate role (must be PROPRIETAIRE or AGENCE)
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { role: true, activeRole: true },
    })
    if (!user) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
    }

    const effectiveRole = user.activeRole || user.role
    if (effectiveRole !== 'PROPRIETAIRE' && effectiveRole !== 'AGENCE') {
      return NextResponse.json(
        { error: 'Seuls les propriétaires et les agences peuvent créer des annonces' },
        { status: 403 }
      )
    }

    // 3. Parse request body
    const body = await req.json()
    const {
      title,
      description,
      type,
      price,
      area,
      bedrooms,
      bathrooms,
      address,
      city,
      commune,
      isFurnished,
      hasParking,
      hasGarden,
      hasPool,
      hasGuardian,
      hasClimate,
      amenities,
      rentalTerms,
      hideOwnerName,
      virtualTourUrl,
      images,
      draft,
    } = body

    // Determine status: draft=true → DRAFT, otherwise validate and create as PENDING_VERIFICATION
    // Properties must be verified by TC before becoming ACTIVE
    const isDraft = draft === true
    const status = isDraft ? 'DRAFT' : 'PENDING_VERIFICATION'

    // 4. Validate required fields only when publishing (not draft)
    if (!isDraft) {
      if (!title || typeof title !== 'string' || !title.trim()) {
        return NextResponse.json({ error: 'Le titre est requis' }, { status: 400 })
      }
      if (!description || typeof description !== 'string' || !description.trim()) {
        return NextResponse.json({ error: 'La description est requise' }, { status: 400 })
      }
      if (!type || !VALID_PROPERTY_TYPES.includes(type)) {
        return NextResponse.json(
          { error: `Le type doit être l'un des suivants : ${VALID_PROPERTY_TYPES.join(', ')}` },
          { status: 400 }
        )
      }
      if (price === undefined || price === null || typeof price !== 'number' || price <= 0) {
        return NextResponse.json({ error: 'Le prix doit être un nombre positif' }, { status: 400 })
      }
      if (!area || typeof area !== 'number' || area <= 0) {
        return NextResponse.json({ error: 'La surface doit être un nombre positif' }, { status: 400 })
      }
      if (!address || typeof address !== 'string' || !address.trim()) {
        return NextResponse.json({ error: "L'adresse est requise" }, { status: 400 })
      }
      if (!city || typeof city !== 'string' || !city.trim()) {
        return NextResponse.json({ error: 'La ville est requise' }, { status: 400 })
      }
    }

    // 5. Validate images
    const imageArray: string[] = Array.isArray(images) ? images : []
    if (imageArray.length > MAX_IMAGES) {
      return NextResponse.json(
        { error: `Maximum ${MAX_IMAGES} images autorisées` },
        { status: 400 }
      )
    }
    for (let i = 0; i < imageArray.length; i++) {
      if (typeof imageArray[i] !== 'string') {
        return NextResponse.json(
          { error: `L'image ${i + 1} a un format invalide` },
          { status: 400 }
        )
      }
    }

    // 6. Validate video (virtualTourUrl) — allow any string URL, only validate size for data: URLs
    if (virtualTourUrl !== null && virtualTourUrl !== undefined && virtualTourUrl !== '') {
      if (typeof virtualTourUrl !== 'string') {
        return NextResponse.json(
          { error: 'Format de vidéo invalide' },
          { status: 400 }
        )
      }
      // Only validate size for data: URLs (base64 encoded uploads)
      if (virtualTourUrl.startsWith('data:')) {
        const base64Part = virtualTourUrl.split(',')[1] || ''
        const estimatedSize = Math.ceil(base64Part.length * 0.75)
        if (estimatedSize > MAX_VIDEO_SIZE_BYTES) {
          return NextResponse.json(
            { error: 'La vidéo de visite virtuelle ne doit pas dépasser 50 Mo' },
            { status: 400 }
          )
        }
      }
    }

    // 7. Create property with images
    const property = await db.property.create({
      data: {
        title: title ? String(title).trim() : '',
        description: description ? String(description).trim() : '',
        type: type && VALID_PROPERTY_TYPES.includes(type) ? type : 'STUDIO',
        status,
        price: price ? Number(price) : 0,
        area: area ? Number(area) : 0,
        bedrooms: bedrooms !== undefined && bedrooms !== null ? Number(bedrooms) : null,
        bathrooms: bathrooms !== undefined && bathrooms !== null ? Number(bathrooms) : null,
        address: address ? String(address).trim() : '',
        city: city ? String(city).trim() : '',
        commune: commune ? String(commune).trim() : null,
        isFurnished: Boolean(isFurnished),
        hasParking: Boolean(hasParking),
        hasGarden: Boolean(hasGarden),
        hasPool: Boolean(hasPool),
        hasGuardian: Boolean(hasGuardian),
        hasClimate: Boolean(hasClimate),
        amenities: typeof amenities === 'string' ? amenities : '[]',
        rentalTerms: typeof rentalTerms === 'string' ? rentalTerms : '{}',
        hideOwnerName: Boolean(hideOwnerName),
        virtualTourUrl: virtualTourUrl || null,
        ownerId: userId,
        images: {
          create: imageArray.map((url, index) => ({
            url,
            order: index,
          })),
        },
      },
      include: {
        images: { orderBy: { order: 'asc' } },
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
    })

    return NextResponse.json({ property }, { status: 201 })
  } catch (error) {
    console.error('Property creation error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
