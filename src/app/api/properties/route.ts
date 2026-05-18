import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'
import { notifyMany } from '@/lib/notify'

function generateId() {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

const VALID_PROPERTY_TYPES = ['APPARTEMENT', 'MAISON', 'STUDIO', 'DUPLEX', 'PENTHOUSE', 'VILLA'] as const
const MAX_IMAGES = 10
const MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)

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

    let isMineRequest = false
    let mineUserId: string | null = null
    if (mine === 'true') {
      const auth = await resolveRequestUser(req)
      if (auth?.userId) {
        isMineRequest = true
        mineUserId = auth.userId
      }
    }

    let isTCRequestingPending = false
    if (pending === 'true') {
      const auth = await resolveRequestUser(req)
      if (auth?.userId) {
        const admin = getSupabaseAdminClient()
        const { data: user } = await admin
          .from('users')
          .select('role')
          .eq('id', auth.userId)
          .single()
        if (user?.role === 'TIERS_CONFIANCE') {
          isTCRequestingPending = true
        }
      }
    }

    const admin = getSupabaseAdminClient()

    let query = admin.from('properties').select('*')

    if (isMineRequest) {
      query = query.eq('owner_id', mineUserId!)
    } else if (isTCRequestingPending) {
      query = query.eq('status', 'PENDING_VERIFICATION')
    } else {
      query = query.eq('status', 'ACTIVE')
    }

    if (type) {
      query = query.eq('type', type)
    }

    if (commune) {
      query = query.ilike('commune', `%${commune}%`)
    }

    if (search) {
      query = query.or(
        `title.ilike.%${search}%,address.ilike.%${search}%,commune.ilike.%${search}%`
      )
    }

    if (minPrice || maxPrice) {
      if (minPrice) query = query.gte('price', parseFloat(minPrice))
      if (maxPrice) query = query.lte('price', parseFloat(maxPrice))
    }

    if (minBedrooms) {
      query = query.gte('bedrooms', parseInt(minBedrooms))
    }

    if (furnished === 'true') {
      query = query.eq('is_furnished', true)
    } else if (furnished === 'false') {
      query = query.eq('is_furnished', false)
    }

    if (sort === 'price-asc') {
      query = query.order('price', { ascending: true })
    } else if (sort === 'price-desc') {
      query = query.order('price', { ascending: false })
    } else if (sort === 'popular') {
      query = query.order('views_count', { ascending: false })
    } else {
      query = query.order('created_at', { ascending: false })
    }

    if (all !== 'true') {
      query = query.limit(limit)
    }

    const { data: properties, error } = await query

    if (error) {
      console.error('Properties error:', error)
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    }

    const enriched = await enrichProperties(admin, properties ?? [])

    return NextResponse.json({ properties: enriched })
  } catch (error) {
    console.error('Properties error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await resolveRequestUser(req)
    if (!auth || !auth.userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const userId = auth.userId

    const admin = getSupabaseAdminClient()

    const { data: user } = await admin
      .from('users')
      .select('role, active_role')
      .eq('id', userId)
      .single()
    if (!user) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
    }

    const effectiveRole = user.active_role || user.role
    if (effectiveRole !== 'PROPRIETAIRE' && effectiveRole !== 'AGENCE') {
      return NextResponse.json(
        { error: 'Seuls les propriétaires et les agences peuvent créer des annonces' },
        { status: 403 }
      )
    }

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

    const isDraft = draft === true
    const status = isDraft ? 'DRAFT' : 'PENDING_VERIFICATION'

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

    if (virtualTourUrl !== null && virtualTourUrl !== undefined && virtualTourUrl !== '') {
      if (typeof virtualTourUrl !== 'string') {
        return NextResponse.json({ error: 'Format de vidéo invalide' }, { status: 400 })
      }
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

    const propertyId = generateId()

    const { data: property, error } = await admin
      .from('properties')
      .insert({
        id: propertyId,
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
        is_furnished: Boolean(isFurnished),
        has_parking: Boolean(hasParking),
        has_garden: Boolean(hasGarden),
        has_pool: Boolean(hasPool),
        has_guardian: Boolean(hasGuardian),
        has_climate: Boolean(hasClimate),
        amenities: typeof amenities === 'string' ? amenities : '[]',
        rental_terms: typeof rentalTerms === 'string' ? rentalTerms : '{}',
        hide_owner_name: Boolean(hideOwnerName),
        virtual_tour_url: virtualTourUrl || null,
        owner_id: userId,
      })
      .select()
      .single()

    if (error) {
      console.error('Property creation error:', error)
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    }

    if (imageArray.length > 0) {
      const imageRows = imageArray.map((url, index) => ({
        id: generateId(),
        url,
        order: index,
        property_id: propertyId,
      }))
      await admin.from('property_images').insert(imageRows)
    }

    const { data: owner } = await admin
      .from('users')
      .select('id, first_name, last_name, email, phone')
      .eq('id', userId)
      .single()

    const { data: propertyImages } = await admin
      .from('property_images')
      .select('*')
      .eq('property_id', propertyId)
      .order('order', { ascending: true })

    const result = mapProperty(property, propertyImages ?? [], owner)

    if (status === 'PENDING_VERIFICATION') {
      const ownerName = owner ? `${owner.first_name} ${owner.last_name}` : ''
      notifyNewProperty(admin, propertyId, property.title || '', ownerName).catch(() => {})
    }

    return NextResponse.json({ property: result }, { status: 201 })
  } catch (error) {
    console.error('Property creation error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

async function notifyNewProperty(admin: ReturnType<typeof getSupabaseAdminClient>, propertyId: string, propertyTitle: string, ownerName: string) {
  const { data: adminUsers } = await admin
    .from('users')
    .select('id')
    .eq('role', 'ADMIN')
    .eq('is_active', true)

  if (adminUsers && adminUsers.length > 0) {
    await Promise.all(
      adminUsers.map((a) =>
        fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/notifications`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: a.id,
            type: 'PROPERTY_VERIFICATION',
            title: 'Nouveau bien à vérifier',
            message: `Le bien "${propertyTitle}" publié par ${ownerName} nécessite une vérification.`,
            actionUrl: 'properties-moderation',
            entityId: propertyId,
          }),
        }).catch(() => {})
      )
    )
  }

  const { data: tcUsers } = await admin
    .from('users')
    .select('id')
    .eq('role', 'TIERS_CONFIANCE')
    .eq('is_active', true)

  if (tcUsers && tcUsers.length > 0) {
    await notifyMany({
      userIds: tcUsers.map((tc) => tc.id),
      type: 'PROPERTY_VERIFICATION',
      title: 'Nouveau bien à vérifier',
      message: `Le bien "${propertyTitle}" nécessite une vérification sur place.`,
      actionUrl: 'property-verifications',
      entityId: propertyId,
    })
  }
}

async function enrichProperties(admin: ReturnType<typeof getSupabaseAdminClient>, properties: any[]) {
  const propertyIds = properties.map((p) => p.id)
  const ownerIds = [...new Set(properties.map((p) => p.owner_id))]

  const { data: allImages } = await admin
    .from('property_images')
    .select('*')
    .in('property_id', propertyIds)
    .order('order', { ascending: true })

  const { data: owners } = await admin
    .from('users')
    .select('id, first_name, last_name, email, phone, created_at')
    .in('id', ownerIds)

  const imgMap = groupBy(allImages ?? [], 'property_id')
  const ownerMap = new Map(owners?.map((o) => [o.id, o]))

  return properties.map((p) => {
    const images = imgMap.get(p.id) ?? []
    const firstImage = images.length > 0 ? images[0] : null
    const owner = ownerMap.get(p.owner_id)

    const mapped = mapProperty(p, images, owner)
    return {
      ...mapped,
      image: firstImage ? firstImage.url : null,
    }
  })
}

function mapProperty(p: any, images: any[], owner: any) {
  return {
    id: p.id,
    title: p.title,
    description: p.description,
    type: p.type,
    status: p.status,
    rentalStatus: p.rental_status,
    price: p.price,
    currency: p.currency,
    area: p.area,
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    address: p.address,
    city: p.city,
    commune: p.commune,
    latitude: p.latitude,
    longitude: p.longitude,
    isFurnished: p.is_furnished,
    isVerified: p.is_verified,
    hasParking: p.has_parking,
    hasGarden: p.has_garden,
    hasPool: p.has_pool,
    hasGuardian: p.has_guardian,
    hasClimate: p.has_climate,
    amenities: p.amenities,
    rentalTerms: p.rental_terms,
    hideOwnerName: p.hide_owner_name,
    virtualTourUrl: p.virtual_tour_url,
    viewsCount: p.views_count,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
    ownerId: p.owner_id,
    images: images.map((img: any) => ({
      id: img.id,
      url: img.url,
      order: img.order,
      createdAt: img.created_at,
      propertyId: img.property_id,
    })),
    owner: owner ? {
      id: owner.id,
      firstName: owner.first_name,
      lastName: owner.last_name,
      email: owner.email,
      phone: owner.phone,
      createdAt: owner.created_at,
    } : undefined,
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
