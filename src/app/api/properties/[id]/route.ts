import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdFromRequest } from '@/lib/session'

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
      select: { id: true, ownerId: true, status: true },
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

    // If publishing (changing status to ACTIVE), validate required fields
    const newStatus = status || existing.status
    if (newStatus === 'ACTIVE') {
      const finalTitle = title !== undefined ? title : ''
      const finalDescription = description !== undefined ? description : ''
      const finalPrice = price !== undefined ? price : 0
      const finalArea = area !== undefined ? area : 0
      const finalAddress = address !== undefined ? address : ''
      const finalCity = city !== undefined ? city : ''

      // If any required field is missing, check existing data too
      if (!finalTitle.trim() && existing.status !== 'ACTIVE') {
        return NextResponse.json({ error: 'Le titre est requis pour publier' }, { status: 400 })
      }
      if (!finalDescription.trim() && existing.status !== 'ACTIVE') {
        return NextResponse.json({ error: 'La description est requise pour publier' }, { status: 400 })
      }
      if ((!finalPrice || finalPrice <= 0) && existing.status !== 'ACTIVE') {
        return NextResponse.json({ error: 'Le prix doit être positif pour publier' }, { status: 400 })
      }
      if ((!finalArea || finalArea <= 0) && existing.status !== 'ACTIVE') {
        return NextResponse.json({ error: 'La surface doit être positive pour publier' }, { status: 400 })
      }
      if (!finalAddress.trim() && existing.status !== 'ACTIVE') {
        return NextResponse.json({ error: "L'adresse est requise pour publier" }, { status: 400 })
      }
      if (!finalCity.trim() && existing.status !== 'ACTIVE') {
        return NextResponse.json({ error: 'La ville est requise pour publier' }, { status: 400 })
      }
    }

    // Validate type if provided
    if (type && !VALID_PROPERTY_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `Le type doit être l'un des suivants : ${VALID_PROPERTY_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate video if provided
    if (virtualTourUrl !== undefined && virtualTourUrl !== null) {
      if (typeof virtualTourUrl !== 'string' || !virtualTourUrl.startsWith('data:')) {
        return NextResponse.json(
          { error: 'La vidéo de visite virtuelle doit être une URL de données base64 valide' },
          { status: 400 }
        )
      }
      const base64Part = virtualTourUrl.split(',')[1] || ''
      const estimatedSize = Math.ceil(base64Part.length * 0.75)
      if (estimatedSize > MAX_VIDEO_SIZE_BYTES) {
        return NextResponse.json(
          { error: 'La vidéo ne doit pas dépasser 50 Mo' },
          { status: 400 }
        )
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {}
    if (title !== undefined) updateData.title = String(title).trim()
    if (description !== undefined) updateData.description = String(description).trim()
    if (type !== undefined) updateData.type = type
    if (price !== undefined) updateData.price = Number(price)
    if (area !== undefined) updateData.area = Number(area)
    if (bedrooms !== undefined) updateData.bedrooms = bedrooms !== null ? Number(bedrooms) : null
    if (bathrooms !== undefined) updateData.bathrooms = bathrooms !== null ? Number(bathrooms) : null
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
    if (status !== undefined) updateData.status = status

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

    return NextResponse.json({ property })
  } catch (error) {
    console.error('Property update error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// GET /api/properties/[id] — Get a single property (for editing)
export async function GET(
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
      include: {
        images: { orderBy: { order: 'asc' } },
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    if (!property) {
      return NextResponse.json({ error: 'Bien introuvable' }, { status: 404 })
    }

    // Only allow owner to fetch their draft/property for editing
    if (property.ownerId !== userId) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
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
