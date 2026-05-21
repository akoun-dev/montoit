import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/supabase/admin"
import { resolveRequestUser } from "@/lib/auth/request-user"

async function authorizeTC(request: NextRequest) {
    const { userId, applyCookies } = await resolveRequestUser(request)
    if (!userId)
        return {
            error: applyCookies(
                NextResponse.json({ error: "Non authentifié" }, { status: 401 })
            ),
        }

    const supabase = getSupabaseAdminClient()
    const { data: profile } = await ((supabase as any)
        .from("users")
        .select("role, active_role")
        .eq("id", userId)
        .single() as any)

    const effectiveRole = profile?.active_role || profile?.role
    if (effectiveRole !== "TIERS_CONFIANCE")
        return {
            error: NextResponse.json(
                { error: "Accès refusé" },
                { status: 403 }
            ),
        }

    return { userId, applyCookies, supabase }
}

export async function GET(request: NextRequest) {
    const auth = await authorizeTC(request)
    if ("error" in auth) return auth.error
    const { userId, applyCookies, supabase } = auth

    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search")?.trim()
    const isActive = searchParams.get("isActive")

    let query = supabase
        .from("verification_agents")
        .select("*")
        .eq("tc_id", userId)

    if (isActive === "true") query = query.eq("is_active", true)
    else if (isActive === "false") query = query.eq("is_active", false)

    if (search) {
        query = query.or(
            `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`
        )
    }

    query = query.order("created_at", { ascending: false })

    const { data: agentsData } = await query
    const agentsRaw = (agentsData ?? []) as any[]

    const agentIds = agentsRaw.map((a: any) => a.id)

    const { data: missionsData } =
        agentIds.length > 0
            ? await (supabase as any)
                  .from("missions")
                  .select("*, property:properties(id, title, address, city)")
                  .in("agent_id", agentIds)
                  .order("scheduled_at", { ascending: false })
            : { data: [] as any[] }

    const { data: feedbacksData } =
        agentIds.length > 0
            ? await (supabase as any)
                  .from("agent_feedback")
                  .select("*")
                  .in("agent_id", agentIds)
                  .order("created_at", { ascending: false })
            : { data: [] as any[] }

    const missionsByAgent = new Map<string, any[]>()
    for (const m of (missionsData ?? []) as any[]) {
        if (!missionsByAgent.has(m.agent_id))
            missionsByAgent.set(m.agent_id, [])
        missionsByAgent.get(m.agent_id)!.push(m)
    }

    const feedbacksByAgent = new Map<string, any[]>()
    for (const f of (feedbacksData ?? []) as any[]) {
        if (!feedbacksByAgent.has(f.agent_id))
            feedbacksByAgent.set(f.agent_id, [])
        feedbacksByAgent.get(f.agent_id)!.push(f)
    }

    const now = new Date()
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    const agents = agentsRaw.map((agent: any) => {
        const missions = missionsByAgent.get(agent.id) ?? []
        const feedbacks = feedbacksByAgent.get(agent.id) ?? []
        const completedMissions = missions.filter(
            (m: any) => m.status === "COMPLETED"
        )
        const totalMissions = missions.length
        const successRate =
            totalMissions > 0
                ? Math.round((completedMissions.length / totalMissions) * 100)
                : 0

        let avgCompletionHours = 0
        if (completedMissions.length > 0) {
            const totalHours = completedMissions.reduce(
                (sum: number, m: any) => {
                    if (m.completed_at && m.created_at) {
                        return (
                            sum +
                            (new Date(m.completed_at).getTime() -
                                new Date(m.created_at).getTime()) /
                                (1000 * 60 * 60)
                        )
                    }
                    return sum
                },
                0
            )
            avgCompletionHours = Math.round(
                totalHours / completedMissions.length
            )
        }

        const lastMission =
            completedMissions.length > 0
                ? completedMissions.sort(
                      (a: any, b: any) =>
                          new Date(b.completed_at!).getTime() -
                          new Date(a.completed_at!).getTime()
                  )[0]
                : null

        const upcomingMissions = missions.filter((m: any) => {
            const schedDate = new Date(m.scheduled_at)
            return (
                schedDate >= now &&
                schedDate <= sevenDaysFromNow &&
                (m.status === "ASSIGNED" || m.status === "IN_PROGRESS")
            )
        })

        const avgRating =
            feedbacks.length > 0
                ? Math.round(
                      (feedbacks.reduce(
                          (sum: number, f: any) => sum + f.rating,
                          0
                      ) /
                          feedbacks.length) *
                          10
                  ) / 10
                : 0

        const reports = completedMissions
            .filter((m: any) => m.report_url)
            .map((m: any) => ({
                id: m.id,
                reportUrl: m.report_url,
                propertyTitle: m.property?.title || "",
                completedAt: m.completed_at,
            }))

        return {
            id: agent.id,
            firstName: agent.first_name,
            lastName: agent.last_name,
            email: agent.email,
            phone: agent.phone,
            isActive: agent.is_active,
            createdAt: agent.created_at,
            _count: { missions: totalMissions },
            performance: {
                totalMissions,
                completedCount: completedMissions.length,
                successRate,
                avgCompletionHours,
                lastMissionDate: lastMission?.completed_at || null,
            },
            feedbackSummary: {
                avgRating,
                totalFeedbacks: feedbacks.length,
                recentFeedbacks: feedbacks.slice(0, 3).map((f: any) => ({
                    id: f.id,
                    rating: f.rating,
                    comment: f.comment,
                    createdAt: f.created_at,
                })),
            },
            availability: {
                upcomingMissions: upcomingMissions.map((m: any) => ({
                    id: m.id,
                    scheduledAt: m.scheduled_at,
                    status: m.status,
                    type: m.type,
                    propertyTitle: m.property?.title || "",
                })),
                missionCountNext7Days: upcomingMissions.length,
            },
            reports,
        }
    })

    const resp = NextResponse.json(agents)
    return applyCookies(resp)
}

export async function POST(request: NextRequest) {
    const auth = await authorizeTC(request)
    if ("error" in auth) return auth.error
    const { userId, applyCookies, supabase } = auth

    try {
        const body = await request.json()
        const { firstName, lastName, email, phone } = body

        if (!firstName || typeof firstName !== "string" || !firstName.trim()) {
            return NextResponse.json(
                { error: "Le prénom est requis" },
                { status: 400 }
            )
        }
        if (!lastName || typeof lastName !== "string" || !lastName.trim()) {
            return NextResponse.json(
                { error: "Le nom est requis" },
                { status: 400 }
            )
        }
        if (!email || typeof email !== "string" || !email.trim()) {
            return NextResponse.json(
                { error: "L'email est requis" },
                { status: 400 }
            )
        }
        if (phone && phone.length !== 10) {
            return NextResponse.json(
                { error: "Numéro de téléphone invalide (10 chiffres requis)" },
                { status: 400 }
            )
        }

        const trimmedEmail = email.trim().toLowerCase()
        const trimmedFirstName = firstName.trim()
        const trimmedLastName = lastName.trim()

        const { data: existing } = await (supabase as any)
            .from("verification_agents")
            .select("*")
            .eq("tc_id", userId)
            .eq("email", trimmedEmail)
            .maybeSingle()

        if (existing) {
            if (!existing.is_active) {
                const { data: reactivated } = await ((supabase as any)
                    .from("verification_agents")
                    .update({
                        first_name: trimmedFirstName,
                        last_name: trimmedLastName,
                        phone: phone?.trim() || null,
                        is_active: true,
                    })
                    .eq("id", existing.id)
                    .select()
                    .single() as any)

                const resp = NextResponse.json(reactivated, { status: 201 })
                return applyCookies(resp)
            }
            return NextResponse.json(
                {
                    error: "Un agent avec cet email existe déjà dans votre équipe",
                },
                { status: 409 }
            )
        }

        const { data: agent } = await ((supabase as any)
            .from("verification_agents")
            .insert({
                first_name: trimmedFirstName,
                last_name: trimmedLastName,
                email: trimmedEmail,
                phone: phone?.trim() || null,
                tc_id: userId,
            })
            .select()
            .single() as any)

        const resp = NextResponse.json(agent, { status: 201 })
        return applyCookies(resp)
    } catch (error) {
        console.error("[TC Agents POST] Error:", error)
        return NextResponse.json(
            { error: "Erreur interne du serveur" },
            { status: 500 }
        )
    }
}

export async function PATCH(request: NextRequest) {
    const auth = await authorizeTC(request)
    if ("error" in auth) return auth.error
    const { userId, applyCookies, supabase } = auth

    try {
        const body = await request.json()
        const { id, firstName, lastName, email, phone, isActive } = body

        if (!id || typeof id !== "string") {
            return NextResponse.json(
                { error: "L'identifiant de l'agent est requis" },
                { status: 400 }
            )
        }

        const { data: agent } = await ((supabase as any)
            .from("verification_agents")
            .select("*")
            .eq("id", id)
            .single() as any)

        if (!agent) {
            return NextResponse.json(
                { error: "Agent introuvable" },
                { status: 404 }
            )
        }
        if (agent.tc_id !== userId) {
            return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
        }

        if (email && email.trim().toLowerCase() !== agent.email) {
            const { data: existing } = await (supabase as any)
                .from("verification_agents")
                .select("id")
                .eq("tc_id", userId)
                .eq("email", email.trim().toLowerCase())
                .neq("id", id)
                .maybeSingle()
            if (existing) {
                return NextResponse.json(
                    {
                        error: "Un agent avec cet email existe déjà dans votre équipe",
                    },
                    { status: 409 }
                )
            }
        }

        if (isActive === false && agent.is_active === true) {
            await (supabase as any)
                .from("missions")
                .update({ status: "CANCELLED" })
                .eq("agent_id", id)
                .in("status", ["ASSIGNED", "IN_PROGRESS"])
        }

        const updateData: Record<string, unknown> = {}
        if (firstName !== undefined) updateData.first_name = firstName.trim()
        if (lastName !== undefined) updateData.last_name = lastName.trim()
        if (email !== undefined) updateData.email = email.trim().toLowerCase()
        if (phone !== undefined) updateData.phone = phone?.trim() || null
        if (isActive !== undefined) updateData.is_active = isActive

        const { data: updated } = await ((supabase as any)
            .from("verification_agents")
            .update(updateData as any)
            .eq("id", id)
            .select()
            .single() as any)

        const { count: missionCount } = await supabase
            .from("missions")
            .select("id", { count: "exact", head: true })
            .eq("agent_id", id)

        const resp = NextResponse.json({
            ...updated,
            _count: { missions: missionCount ?? 0 },
        })
        return applyCookies(resp)
    } catch (error) {
        console.error("[TC Agents PATCH] Error:", error)
        return NextResponse.json(
            { error: "Erreur interne du serveur" },
            { status: 500 }
        )
    }
}

export async function DELETE(request: NextRequest) {
    const auth = await authorizeTC(request)
    if ("error" in auth) return auth.error
    const { userId, applyCookies, supabase } = auth

    try {
        const body = await request.json()
        const { id } = body

        if (!id || typeof id !== "string") {
            return NextResponse.json(
                { error: "L'identifiant de l'agent est requis" },
                { status: 400 }
            )
        }

        const { data: agent } = await ((supabase as any)
            .from("verification_agents")
            .select("*")
            .eq("id", id)
            .single() as any)

        if (!agent) {
            return NextResponse.json(
                { error: "Agent introuvable" },
                { status: 404 }
            )
        }
        if (agent.tc_id !== userId) {
            return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
        }

        await (supabase as any)
            .from("missions")
            .update({ status: "CANCELLED" })
            .eq("agent_id", id)
            .in("status", ["ASSIGNED", "IN_PROGRESS"])

        const { data: updated } = await ((supabase as any)
            .from("verification_agents")
            .update({ is_active: false })
            .eq("id", id)
            .select()
            .single() as any)

        const { count: missionCount } = await supabase
            .from("missions")
            .select("id", { count: "exact", head: true })
            .eq("agent_id", id)

        const resp = NextResponse.json({
            ...updated,
            _count: { missions: missionCount ?? 0 },
        })
        return applyCookies(resp)
    } catch (error) {
        console.error("[TC Agents DELETE] Error:", error)
        return NextResponse.json(
            { error: "Erreur interne du serveur" },
            { status: 500 }
        )
    }
}
