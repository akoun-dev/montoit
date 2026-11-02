import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/supabase/admin"
import { resolveRequestUser } from "@/lib/auth/request-user"

// DAT-005 — PATCH /api/agence/agents/[id]
// Lie (userId: string) ou délie (userId: null) un compte users existant à un
// agent agence. Patch minimal : le module équipe agence (team.tsx) reste
// inchangé, cette capability servira à l'UI de liaison (wave 3).
//
// Validation : le user doit exister et être libre (non lié à un autre agent).
// La contrainte d'unicité partielle uniq_agency_agents_user_id (migration
// 20261027000030) est le dernier rempart contre les courses concurrentes.

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId, applyCookies } = await resolveRequestUser(req)
        if (!userId) {
            const resp = NextResponse.json(
                { error: "Non authentifié" },
                { status: 401 }
            )
            return applyCookies(resp)
        }

        const supabase = getSupabaseAdminClient()

        const { data: profile } = await supabase
            .from("users")
            .select("role, active_role")
            .eq("id", userId)
            .single()

        const effectiveRole = profile?.active_role || profile?.role
        if (effectiveRole !== "AGENCE") {
            const resp = NextResponse.json(
                { error: "Accès refusé" },
                { status: 403 }
            )
            return applyCookies(resp)
        }

        const { id: agentId } = await params

        const body = await req.json()
        const linkedUserId: unknown = body?.userId

        const { data: agent } = await supabase
            .from("agency_agents")
            .select("id, agency_id, first_name, last_name, user_id")
            .eq("id", agentId)
            .maybeSingle()

        if (!agent) {
            const resp = NextResponse.json(
                { error: "Agent introuvable" },
                { status: 404 }
            )
            return applyCookies(resp)
        }
        if ((agent as any).agency_id !== userId) {
            const resp = NextResponse.json(
                { error: "Cet agent ne vous appartient pas" },
                { status: 403 }
            )
            return applyCookies(resp)
        }

        // Délier : user_id = null
        if (linkedUserId === null) {
            const { data: updated } = await supabase
                .from("agency_agents")
                .update({ user_id: null } as any)
                .eq("id", agentId)
                .eq("agency_id", userId)
                .select()
                .single()
            const resp = NextResponse.json({ agent: updated })
            return applyCookies(resp)
        }

        // Lier : user_id = <string>
        if (typeof linkedUserId !== "string" || linkedUserId.trim() === "") {
            const resp = NextResponse.json(
                { error: "userId doit être un identifiant utilisateur valide, ou null pour délier" },
                { status: 400 }
            )
            return applyCookies(resp)
        }

        const { data: linkedUser } = await supabase
            .from("users")
            .select("id")
            .eq("id", linkedUserId)
            .maybeSingle()
        if (!linkedUser) {
            const resp = NextResponse.json(
                { error: "Compte utilisateur introuvable : l'utilisateur à lier doit exister" },
                { status: 404 }
            )
            return applyCookies(resp)
        }

        // Libre = non lié à un AUTRE agent (re-liage idempotent du même agent OK).
        const { data: alreadyLinked } = await supabase
            .from("agency_agents")
            .select("id")
            .eq("user_id", linkedUserId)
            .neq("id", agentId)
            .maybeSingle()
        if (alreadyLinked) {
            const resp = NextResponse.json(
                { error: "Ce compte utilisateur est déjà lié à un autre agent" },
                { status: 409 }
            )
            return applyCookies(resp)
        }

        const { data: updated } = await supabase
            .from("agency_agents")
            .update({ user_id: linkedUserId } as any)
            .eq("id", agentId)
            .eq("agency_id", userId)
            .select()
            .single()

        const resp = NextResponse.json({ agent: updated })
        return applyCookies(resp)
    } catch (error) {
        console.error("Link agent user error:", error)
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
    }
}
