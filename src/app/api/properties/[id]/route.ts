import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdFromRequest, getUserIdAndRole } from '@/lib/session'
import { notifyMany } from '@/lib/notify'

const VALID_PROPERTY_TYPES = ['APPARTEMENT', 'MAISON', 'STUDIO', 'DUPLEX', 'PENTHOUSE', 'VILLA'] as const
const MAX_IMAGES = 10
const MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024 // 50MB

// PATCH /api/properties/[id] — Update a property (draft or published)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    // Verify property exists and belongs to user
    const existing = await db.property.findUnique({
      where: { id },
      select: { id: true, ownerId: true, status: true, title: true, description: true, price: true, area: true, address: true, city: true },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Bien introuvable' }, { status: 404 })
    }

    if (existing.ownerId !== userId) {
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

    // Only validate required fields when explicitly publishing (status === 'ACTIVE' sent in body)
    // Auto-saves (drafts) should never trigger publish validation
    // Properties must be verified by TC before becoming ACTIVE
    const isPublishing = status === 'ACTIVE'
    if (isPublishing) {
      // Merge provided values with existing data for validation
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

    // Validate type if provided
    if (type !== undefined && type !== null && !VALID_PROPERTY_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `Le type doit être l'un des suivants : ${VALID_PROPERTY_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate video if provided (allow null to clear, allow any string for flexibility)
    if (virtualTourUrl !== undefined && virtualTourUrl !== null && virtualTourUrl !== '') {
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
            { error: 'La vidéo ne doit pas dépasser 50 Mo' },
            { status: 400 }
          )
        }
      }
    }

    // Build update data — sanitize numeric fields to avoid NaN
    const updateData: Record<string, unknown> = {}
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
    if (isFurnished !== undefined) updateData.isFurnished = Boolean(isFurnished)
    if (hasParking !== undefined) updateData.hasParking = Boolean(hasParking)
    if (hasGarden !== undefined) updateData.hasGarden = Boolean(hasGarden)
    if (hasPool !== undefined) updateData.hasPool = Boolean(hasPool)
    if (hasGuardian !== undefined) updateData.hasGuardian = Boolean(hasGuardian)
    if (hasClimate !== undefined) updateData.hasClimate = Boolean(hasClimate)
    if (hideOwnerName !== undefined) updateData.hideOwnerName = Boolean(hideOwnerName)
    if (virtualTourUrl !== undefined) updateData.virtualTourUrl = virtualTourUrl || null
    // Properties must be verified by TC before becoming ACTIVE
    // Intercept ACTIVE status and change to PENDING_VERIFICATION
    if (status !== undefined) {
      updateData.status = status === 'ACTIVE' ? 'PENDING_VERIFICATION' : status
    }

    // Handle images replacement
    if (images !== undefined) {
      const imageArray: string[] = Array.isArray(images) ? images : []
      if (imageArray.length > MAX_IMAGES) {
        return NextResponse.json(
          { error: `Maximum ${MAX_IMAGES} images autorisées` },
          { status: 400 }
        )
      }

      // Delete existing images and create new ones
      await db.propertyImage.deleteMany({ where: { propertyId: id } })
      updateData.images = {
        create: imageArray.map((url: string, index: number) => ({
          url,
          order: index,
        })),
      }
    }

    // Update the property
    const property = await db.property.update({
      where: { id },
      data: updateData,
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

    // Notify all TC users when property is submitted for verification
    if (isPublishing) {
      const tcUsers = await db.user.findMany({
        where: { role: 'TIERS_CONFIANCE', isActive: true },
        select: { id: true },
      })
      if (tcUsers.length > 0) {
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

    return NextResponse.json({ property })
  } catch (error) {
    console.error('Property update error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// GET /api/properties/[id] — Get a single property
// - Unauthenticated users can view ACTIVE properties (public listing detail)
// - Authenticated owners can view their own DRAFT/any-status properties (for editing)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const userId = await getUserIdFromRequest(req)

    const property = await db.property.findUnique({
      where: { id },
      include: {
        images: { orderBy: { order: 'asc' } },
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            avatarUrl: true,
            createdAt: true,
          },
        },
      },
    })

    if (!property) {
      return NextResponse.json({ error: 'Bien introuvable' }, { status: 404 })
    }

    // Access control:
    // - ACTIVE properties are publicly viewable
    // - Non-ACTIVE properties (DRAFT, PENDING_VERIFICATION, SUSPENDED, etc.) require ownership or TC role
    if (property.status !== 'ACTIVE') {
      if (!userId) {
        return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
      }
      // Owner can always view their own properties
      if (property.ownerId !== userId) {
        // TC users can view any non-ACTIVE property
        const authResult = await getUserIdAndRole(req)
        if (!authResult || authResult.effectiveRole !== 'TIERS_CONFIANCE') {
          return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
        }
      }
    }

    // Increment views count (fire and forget, only for active properties)
    if (property.status === 'ACTIVE') {
      db.property.update({
        where: { id },
        data: { viewsCount: { increment: 1 } },
      }).catch(() => {
        // Silently ignore increment errors
      })
    }

    // If the owner has hidden their name, anonymize owner data for non-owners
    if (property.hideOwnerName && property.ownerId !== userId) {
      property.owner.firstName = 'Propriétaire'
      property.owner.lastName = 'anonyme'
      property.owner.email = ''
      property.owner.phone = null
    }

    return NextResponse.json({ property })
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
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const property = await db.property.findUnique({
      where: { id },
      select: { id: true, ownerId: true, status: true },
    })

    if (!property) {
      return NextResponse.json({ error: 'Bien introuvable' }, { status: 404 })
    }

    if (property.ownerId !== userId) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    // Delete the property (cascade deletes images, etc.)
    await db.property.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Property DELETE error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
