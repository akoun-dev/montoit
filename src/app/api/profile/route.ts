import { NextRequest, NextResponse } from "next/server"
import { resolveRequestUser } from "@/lib/auth/request-user"
import { getSupabaseAdminClient } from "@/lib/supabase/admin"
import { getUserProfileById } from "@/lib/supabase/email-auth"
import { profileSelect, toProfilePayload } from "@/lib/supabase/profile"
import { normalizePhone } from "@/lib/ansut-messaging"
import type { Database } from "@/lib/supabase/types"

/**
 * GET /api/profile — Fetch current user profile (with scoring-related fields)
 * PUT /api/profile — Update user profile fields
 */
export async function GET(req: NextRequest) {
    try {
        const { userId, applyCookies } = await resolveRequestUser(req)
        if (!userId) {
            return NextResponse.json(
                { error: "Non authentifié" },
                { status: 401 }
            )
        }

        const admin = getSupabaseAdminClient()
        const user = await getUserProfileById(admin, userId)

        if (!user) {
            const response = NextResponse.json(
                { error: "Utilisateur non trouvé" },
                { status: 404 }
            )
            return applyCookies(response)
        }

        const response = NextResponse.json({ user: toProfilePayload(user) })
        return applyCookies(response)
    } catch (error) {
        console.error("Profile GET error:", error)
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
    }
}

export async function PUT(req: NextRequest) {
    try {
        const { userId, applyCookies } = await resolveRequestUser(req)
        if (!userId) {
            return NextResponse.json(
                { error: "Non authentifié" },
                { status: 401 }
            )
        }

        const body = await req.json()
        const {
            firstName,
            lastName,
            phone,
            gender,
            city,
            address,
            birthDate,
            nni,
        } = body

        const updateData: Database["public"]["Tables"]["users"]["Update"] = {}

        if (firstName !== undefined) {
            if (typeof firstName !== "string" || firstName.trim().length < 1) {
                return NextResponse.json(
                    { error: "Le prénom est requis" },
                    { status: 400 }
                )
            }
            updateData.first_name = firstName.trim()
        }

        if (lastName !== undefined) {
            if (typeof lastName !== "string" || lastName.trim().length < 1) {
                return NextResponse.json(
                    { error: "Le nom est requis" },
                    { status: 400 }
                )
            }
            updateData.last_name = lastName.trim()
        }

        if (phone !== undefined) {
            const cleanedPhone = typeof phone === "string" ? normalizePhone(phone) : null
            if (cleanedPhone && cleanedPhone.length !== 10) {
                return NextResponse.json(
                    {
                        error: "Numéro de téléphone invalide (10 chiffres requis)",
                    },
                    { status: 400 }
                )
            }
            updateData.phone = cleanedPhone || null
        }

        if (gender !== undefined) {
            const validGenders = ["M", "F", "AUTRE"]
            if (gender && !validGenders.includes(gender)) {
                return NextResponse.json(
                    { error: "Genre invalide" },
                    { status: 400 }
                )
            }
            updateData.gender = gender || null
        }

        if (city !== undefined) {
            updateData.city =
                typeof city === "string" ? city.trim() || null : null
        }

        if (address !== undefined) {
            updateData.address =
                typeof address === "string" ? address.trim() || null : null
        }

        if (birthDate !== undefined) {
            if (birthDate) {
                const parsedDate = new Date(birthDate)
                if (Number.isNaN(parsedDate.getTime())) {
                    return NextResponse.json(
                        { error: "Date de naissance invalide" },
                        { status: 400 }
                    )
                }
                updateData.birth_date = parsedDate.toISOString()
            } else {
                updateData.birth_date = null
            }
        }

        if (nni !== undefined) {
            if (nni && !/^\d{10,11}$/.test(String(nni).trim())) {
                return NextResponse.json(
                    { error: "NNI invalide (10-11 chiffres requis)" },
                    { status: 400 }
                )
            }
            updateData.nni = typeof nni === "string" ? nni.trim() || null : null
        }

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json(
                { error: "Aucune donnée à mettre à jour" },
                { status: 400 }
            )
        }

        const admin = getSupabaseAdminClient()
        const { data: updatedUser, error } = await admin
            .from("users")
            .update(updateData)
            .eq("id", userId)
            .select(profileSelect)
            .single()

        if (error || !updatedUser) {
            throw error || new Error("Impossible de mettre à jour le profil")
        }

        const response = NextResponse.json({
            user: toProfilePayload(updatedUser),
        })
        return applyCookies(response)
    } catch (error: any) {
        console.error("Profile PUT error:", error)

        // Détection de violation de contrainte unique (ex: téléphone déjà utilisé)
        if (error?.code === '23505') {
            const details = error?.details || ''
            if (details.includes('phone')) {
                return NextResponse.json(
                    { error: "Ce numéro de téléphone est déjà utilisé par un autre compte." },
                    { status: 409 }
                )
            }
            return NextResponse.json(
                { error: "Une valeur est déjà utilisée par un autre compte." },
                { status: 409 }
            )
        }

        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
    }
}
