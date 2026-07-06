import { NextRequest, NextResponse } from "next/server"
import { generateOtpCode, sendOtpEmail } from "@/lib/ansut-messaging"
import { getSupabaseAdminClient } from "@/lib/supabase/admin"
import {
    createEmailOtp,
    getUserProfileByEmail,
    invalidateEmailOtps,
} from "@/lib/supabase/email-auth"
import { toAuthUser } from "@/lib/supabase/profile"
import { createRouteHandlerSupabaseClient } from "@/lib/supabase/server"
import { checkRateLimit } from "@/lib/rate-limiter"

export async function POST(req: NextRequest) {
    try {
        const { email, password } = await req.json()

        if (!email || !password) {
            return NextResponse.json(
                { error: "Email et mot de passe requis" },
                { status: 400 }
            )
        }

        const { allowed } = checkRateLimit('login', email.toLowerCase().trim(), { maxRequests: 5, windowMs: 60_000 })
        if (!allowed) {
            return NextResponse.json(
                { error: 'Trop de tentatives. Veuillez réessayer dans une minute.' },
                { status: 429 }
            )
        }

        const admin = getSupabaseAdminClient()
        const profile = await getUserProfileByEmail(admin, email)

        if (!profile || !profile.is_active) {
            return NextResponse.json(
                { error: "Email ou mot de passe incorrect" },
                { status: 401 }
            )
        }

        const { supabase, applyCookies } = createRouteHandlerSupabaseClient(req)
        const { data, error } = await supabase.auth.signInWithPassword({
            email: profile.email,
            password,
        })

        if (error || !data.user) {
            return NextResponse.json(
                { error: "Email ou mot de passe incorrect" },
                { status: 401 }
            )
        }

        if (!profile.is_email_verified) {
            await invalidateEmailOtps(admin, profile.email, "EMAIL_VERIFY")

            const otpCode = generateOtpCode(6)
            await createEmailOtp(admin, {
                email: profile.email,
                code: otpCode,
                type: "EMAIL_VERIFY",
                userId: profile.id,
            })

            const emailResult = await sendOtpEmail(
                profile.email,
                otpCode,
                profile.first_name,
                "email_verify"
            )

            if (!emailResult.success) {
                console.warn(
                    `[Login] Email send failed for ${profile.email}, but OTP stored. Code: ${otpCode}`
                )
            }

            const isDev = process.env.NODE_ENV !== "production"
            return NextResponse.json(
                {
                    error: "Votre email n'est pas encore vérifié. Un code de vérification vient d'être envoyé.",
                    needsVerification: true,
                    email: profile.email,
                    ...(isDev && { devCode: otpCode }),
                },
                { status: 403 }
            )
        }

        const response = NextResponse.json({
            user: toAuthUser(profile),
        })

        return applyCookies(response)
    } catch (error) {
        console.error("Login error:", error)
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
    }
}
