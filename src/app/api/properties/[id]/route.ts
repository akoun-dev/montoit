import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'
import { notifyMany } from '@/lib/notify'
import {
  BUCKETS,
  uploadFromBase64,
  deleteFromStorage,
  isBase64DataUrl,
  guessExtensionFromMime,
  extractBucketAndPath,
} from '@/lib/supabase/storage'

function generateId() {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

const VALID_PROPERTY_TYPES = ['APPARTEMENT', 'MAISON', 'STUDIO', 'DUPLEX', 'PENTHOUSE', 'VILLA'] as const
const MAX_IMAGES = 10
const MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024

// PATCH /api/properties/[id] — Update a property (draft or published)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await resolveRequestUser(req)
    if (!auth || !auth.userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const userId = auth.userId

    const admin = getSupabaseAdminClient()

    const { data: existing } = await admin
      .from('properties')
      .select('id, owner_id, status, title, description, price, area, address, city')
      .eq('id', id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Bien introuvable' }, { status: 404 })
    }

    if (existing.owner_id !== userId) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
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
      hideOwnerName,
      virtualTourUrl,
      images,
      status,
    } = body

    const isPublishing = status === 'ACTIVE'
    if (isPublishing) {
      const finalTitle = (title !== undefined ? String(title) : existing.title || '').trim()
      const finalDescription = (description !== undefined ? String(description) : existing.description || '').trim()
      const finalPrice = price !== undefined ? Number(price) : (existing.price || 0)
      const finalArea = area !== undefined ? Number(area) : (existing.area || 0)
      const finalAddress = (address !== undefined ? String(address) : existing.address || '').trim()
      const finalCity = (city !== undefined ? String(city) : existing.city || '').trim()

      if (!finalTitle) {
        return NextResponse.json({ error: 'Le titre est requis pour publier' }, { status: 400 })
      }
      if (!finalDescription) {
        return NextResponse.json({ error: 'La description est requise pour publier' }, { status: 400 })
      }
      if (!finalPrice || finalPrice <= 0 || isNaN(finalPrice)) {
        return NextResponse.json({ error: 'Le prix doit être positif pour publier' }, { status: 400 })
      }
      if (!finalArea || finalArea <= 0 || isNaN(finalArea)) {
        return NextResponse.json({ error: 'La surface doit être positive pour publier' }, { status: 400 })
      }
      if (!finalAddress) {
        return NextResponse.json({ error: "L'adresse est requise pour publier" }, { status: 400 })
      }
      if (!finalCity) {
        return NextResponse.json({ error: 'La ville est requise pour publier' }, { status: 400 })
      }
    }

    if (type !== undefined && type !== null && !VALID_PROPERTY_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `Le type doit être l'un des suivants : ${VALID_PROPERTY_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    if (virtualTourUrl !== undefined && virtualTourUrl !== null && virtualTourUrl !== '') {
      if (typeof virtualTourUrl !== 'string') {
        return NextResponse.json({ error: 'Format de vidéo invalide' }, { status: 400 })
      }
      if (virtualTourUrl.startsWith('data:')) {
        const base64Part = virtualTourUrl.split(',')[1] || ''
        const estimatedSize = Math.ceil(base64Part.length * 0.75)
        if (estimatedSize > MAX_VIDEO_SIZE_BYTES) {
          return NextResponse.json(
            { error: 'La vidéo ne doit pas dépasser 50 Mo' },
            { status: 400 }
          )
        }
      }
    }

    const updateData: any = {}
    if (title !== undefined) updateData.title = String(title).trim()
    if (description !== undefined) updateData.description = String(description).trim()
    if (type !== undefined) updateData.type = type
    if (price !== undefined) {
      const numPrice = Number(price)
      updateData.price = isNaN(numPrice) ? 0 : numPrice
    }
    if (area !== undefined) {
      const numArea = Number(area)
      updateData.area = isNaN(numArea) ? 0 : numArea
    }
    if (bedrooms !== undefined) updateData.bedrooms = bedrooms !== null && bedrooms !== '' ? Number(bedrooms) : null
    if (bathrooms !== undefined) updateData.bathrooms = bathrooms !== null && bathrooms !== '' ? Number(bathrooms) : null
    if (address !== undefined) updateData.address = String(address).trim()
    if (city !== undefined) updateData.city = String(city).trim()
    if (commune !== undefined) updateData.commune = commune ? String(commune).trim() : null
    if (isFurnished !== undefined) updateData.is_furnished = Boolean(isFurnished)
    if (hasParking !== undefined) updateData.has_parking = Boolean(hasParking)
    if (hasGarden !== undefined) updateData.has_garden = Boolean(hasGarden)
    if (hasPool !== undefined) updateData.has_pool = Boolean(hasPool)
    if (hasGuardian !== undefined) updateData.has_guardian = Boolean(hasGuardian)
    if (hasClimate !== undefined) updateData.has_climate = Boolean(hasClimate)
    if (hideOwnerName !== undefined) updateData.hide_owner_name = Boolean(hideOwnerName)
    if (virtualTourUrl !== undefined) {
      if (virtualTourUrl && isBase64DataUrl(virtualTourUrl)) {
        try {
          const ext = guessExtensionFromMime(virtualTourUrl)
          const path = `properties/${id}/video-${generateId()}.${ext}`
          updateData.virtual_tour_url = await uploadFromBase64(BUCKETS.PROPERTY_VIDEOS, virtualTourUrl, path)
        } catch (videoError) {
          // Échec upload vidéo — on garde l'ancienne valeur en DB, on ne met pas à jour
          console.error('Video upload failed (keeping existing):', videoError)
        }
      } else {
        updateData.virtual_tour_url = virtualTourUrl || null
      }
    }
    if (status !== undefined) {
      updateData.status = status === 'ACTIVE' ? 'PENDING_VERIFICATION' : status
    }

    if (images !== undefined) {
      const imageArray: string[] = Array.isArray(images) ? images : []
      if (imageArray.length > MAX_IMAGES) {
        return NextResponse.json(
          { error: `Maximum ${MAX_IMAGES} images autorisées` },
          { status: 400 }
        )
      }

      // Get old images to determine which to delete from storage
      const { data: oldImages } = await admin
        .from('property_images')
        .select('url')
        .eq('property_id', id)

      // Only delete old storage files that are NOT in the new image set
      // (images kept by the user keep their existing storage URL)
      const newUrlSet = new Set(imageArray)
      if (oldImages) {
        for (const img of oldImages) {
          if (!newUrlSet.has(img.url)) {
            const parsed = extractBucketAndPath(img.url)
            if (parsed) {
              await deleteFromStorage(parsed.bucket, parsed.path).catch(() => {})
            }
          }
        }
      }

      // Replace all image records in DB
      await admin.from('property_images').delete().eq('property_id', id)

      // Upload new base64 images to storage in parallel, keep existing URLs as-is
      const uploadedUrls: string[] = await Promise.all(
        imageArray.map(async (url: string) => {
          if (isBase64DataUrl(url)) {
            const ext = guessExtensionFromMime(url)
            const path = `properties/${id}/${generateId()}.${ext}`
            return await uploadFromBase64(BUCKETS.PROPERTY_IMAGES, url, path)
          }
          return url
        })
      )

      if (uploadedUrls.length > 0) {
        const imageRows = uploadedUrls.map((url, index) => ({
          id: generateId(),
          url,
          order: index,
          property_id: id,
        }))
        await admin.from('property_images').insert(imageRows)
      }
    }

    const { data: property } = await admin
      .from('properties')
      .update(updateData as any)
      .eq('id', id)
      .select()
      .single()

    if (!property) {
      return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 })
    }

    if (isPublishing) {
      const { data: tcUsers } = await admin
        .from('users')
        .select('id')
        .eq('role', 'TIERS_CONFIANCE')
        .eq('is_active', true)

      if (tcUsers && tcUsers.length > 0) {
        await notifyMany({
          userIds: tcUsers.map((tc) => tc.id),
          type: 'PROPERTY_VERIFICATION',
          title: 'Nouveau bien en attente de vérification',
          message: `Le bien "${existing.title}" a été soumis pour vérification.`,
          actionUrl: 'property-verifications',
          entityId: existing.id,
        })
      }
    }

    const enriched = await enrichSingleProperty(admin, property)

    return NextResponse.json({ property: enriched })
  } catch (error) {
    console.error('Property update error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// GET /api/properties/[id] — Get a single property
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await resolveRequestUser(req)
    const userId = auth?.userId ?? null

    const admin = getSupabaseAdminClient()

    const { data: property } = await admin
      .from('properties')
      .select('*')
      .eq('id', id)
      .single()

    if (!property) {
      return NextResponse.json({ error: 'Bien introuvable' }, { status: 404 })
    }

    if (property.status !== 'ACTIVE') {
      if (!userId) {
        return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
      }
      if (property.owner_id !== userId) {
        if (!auth?.userId) {
          return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
        }
        const { data: user } = await admin
          .from('users')
          .select('role')
          .eq('id', auth.userId)
          .single()
        if (user?.role !== 'TIERS_CONFIANCE') {
          return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
        }
      }
    }

    if (property.status === 'ACTIVE') {
      admin.from('properties')
        .update({ views_count: (property.views_count || 0) + 1 } as any)
        .eq('id', id)
        .then(() => {}, () => {})
    }

    const enriched = await enrichSingleProperty(admin, property, userId)

    return NextResponse.json({ property: enriched })
  } catch (error) {
    console.error('Property GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// DELETE /api/properties/[id] — Delete a property (only drafts or own properties)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await resolveRequestUser(req)
    if (!auth || !auth.userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const userId = auth.userId

    const admin = getSupabaseAdminClient()

    const { data: property } = await admin
      .from('properties')
      .select('id, owner_id, status')
      .eq('id', id)
      .single()

    if (!property) {
      return NextResponse.json({ error: 'Bien introuvable' }, { status: 404 })
    }

    if (property.owner_id !== userId) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { data: oldImages } = await admin
      .from('property_images')
      .select('url')
      .eq('property_id', id)

    await admin.from('property_images').delete().eq('property_id', id)
    await admin.from('properties').delete().eq('id', id)

    // Clean up storage files
    if (oldImages) {
      for (const img of oldImages) {
        const parsed = extractBucketAndPath(img.url)
        if (parsed) {
          await deleteFromStorage(parsed.bucket, parsed.path).catch(() => {})
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Property DELETE error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

async function enrichSingleProperty(admin: ReturnType<typeof getSupabaseAdminClient>, property: any, requestingUserId?: string | null) {
  const { data: images } = await admin
    .from('property_images')
    .select('*')
    .eq('property_id', property.id)
    .order('order', { ascending: true })

  const { data: owner } = await admin
    .from('users')
    .select('id, first_name, last_name, email, phone, avatar_url, created_at')
    .eq('id', property.owner_id)
    .single()

  const result = {
    id: property.id,
    title: property.title,
    description: property.description,
    type: property.type,
    status: property.status,
    rentalStatus: property.rental_status,
    price: property.price,
    currency: property.currency,
    area: property.area,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    address: property.address,
    city: property.city,
    commune: property.commune,
    latitude: property.latitude,
    longitude: property.longitude,
    isFurnished: property.is_furnished,
    isVerified: property.is_verified,
    hasParking: property.has_parking,
    hasGarden: property.has_garden,
    hasPool: property.has_pool,
    hasGuardian: property.has_guardian,
    hasClimate: property.has_climate,
    amenities: property.amenities,
    rentalTerms: property.rental_terms,
    hideOwnerName: property.hide_owner_name,
    virtualTourUrl: property.virtual_tour_url,
    viewsCount: property.views_count,
    createdAt: property.created_at,
    updatedAt: property.updated_at,
    ownerId: property.owner_id,
    images: (images ?? []).map((img: any) => ({
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
      avatarUrl: owner.avatar_url,
      createdAt: owner.created_at,
    } : undefined,
  }

  if (property.hide_owner_name && property.owner_id !== requestingUserId && result.owner) {
    result.owner.firstName = 'Propriétaire'
    result.owner.lastName = 'anonyme'
    result.owner.email = ''
    result.owner.phone = null as any
  }

  return result
}
