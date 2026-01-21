/**
 * OTP Unified Service - Brevo Integration
 *
 * Service unifié pour la gestion des codes OTP via Brevo
 * Supporte Email, SMS et WhatsApp pour l'authentification
 */

import { supabase } from "@/services/supabase/client";

export interface OTPRequest {
  recipient: string; // Email ou numéro de téléphone
  method: "email" | "sms" | "whatsapp";
  userName?: string;
  purpose?: "auth" | "verification" | "reset"; // Usage de l'OTP
  expiresIn?: number; // En minutes (défaut: 10)
}

export interface OTPVerification {
  recipient: string;
  code: string;
  method: "email" | "sms" | "whatsapp";
}

export interface OTPResult {
  success: boolean;
  error?: string;
  otp?: string; // Uniquement en dev
  messageId?: string;
}

export interface OTPVerificationResult {
  success: boolean;
  error?: string;
  isNewUser?: boolean;
  userId?: string;
}

class OTPUnifiedService {
  private readonly DEFAULT_EXPIRY = 10; // minutes

  /**
   * Génère un code OTP sécurisé
   */
  private generateOTP(): string {
    // Utiliser crypto.getRandomValues pour une meilleure sécurité
    const array = new Uint8Array(6);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => (byte % 10).toString()).join("");
  }

  /**
   * Détermine si le recipient est un email ou un numéro de téléphone
   */
  private detectRecipientType(recipient: string): "email" | "phone" {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(recipient) ? "email" : "phone";
  }

  /**
   * Formate le numéro pour Brevo
   */
  private formatPhoneNumber(phone: string): string {
    // Nettoyer le numéro
    let formatted = phone.replace(/[^\d+]/g, "");

    // Ajouter l'indicatif si absent
    if (formatted.startsWith("07") || formatted.startsWith("05")) {
      formatted = "+225" + formatted;
    }

    // Assurer le format E.164
    if (!formatted.startsWith("+")) {
      formatted = "+" + formatted;
    }

    return formatted;
  }

  /**
   * Stocke l'OTP en base de données pour vérification ultérieure
   */
  private async storeOTP(
    recipient: string,
    code: string,
    method: string,
    expiresIn: number,
    purpose: string = "auth",
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const expiresAt = new Date(Date.now() + expiresIn * 60 * 1000);

      // Formater le recipient si c'est un numéro de téléphone
      let storedRecipient = recipient;
      if (method === "sms" || method === "whatsapp") {
        storedRecipient = this.formatPhoneNumber(recipient);
      }

      const { error } = await supabase.from("otp_codes").insert({
        recipient: storedRecipient,
        code,
        method,
        purpose,
        expires_at: expiresAt.toISOString(),
        attempts: 0,
        created_at: new Date().toISOString(),
      });

      if (error) {
        console.error("Erreur stockage OTP:", error);
        return {
          success: false,
          error: "Erreur lors de la sauvegarde du code",
        };
      }

      return { success: true };
    } catch (error) {
      console.error("Exception stockage OTP:", error);
      return { success: false, error: "Erreur interne" };
    }
  }

  /**
   * Envoie un OTP par email via Brevo
   */
  private async sendEmailOTP(
    recipient: string,
    otp: string,
    userName?: string,
  ): Promise<OTPResult> {
    try {
      const { data, error } = await supabase.functions.invoke(
        "send-email-brevo",
        {
          body: {
            type: "otp",
            to: recipient,
            otp,
            toName: userName,
          },
        },
      );

      if (error) {
        console.error("Erreur envoi OTP email:", error);
        return {
          success: false,
          error: error.message || "Erreur lors de l'envoi de l'email",
        };
      }

      return {
        success: data?.status === "ok",
        error: data?.status === "error" ? data?.reason : undefined,
        messageId: data?.brevoMessageId,
      };
    } catch (error) {
      console.error("Exception envoi OTP email:", error);
      return {
        success: false,
        error: "Erreur lors de l'envoi de l'email",
      };
    }
  }

  /**
   * Envoie un OTP par SMS via Azure MTN
   */
  private async sendSMSOTP(recipient: string, otp: string): Promise<OTPResult> {
    console.log("[OTP] 📤 Envoi SMS OTP:", { recipient, otp });
    const formattedPhone = this.formatPhoneNumber(recipient);
    console.log("[OTP] Numéro formaté:", formattedPhone);

    const message =
      `MonToit: Votre code de verification est ${otp}. Valide 10min. Ne partagez jamais ce code.`;
    console.log("[OTP] Message:", message);

    try {
      console.log("[OTP] Appel Edge Function send-sms-azure...");
      const { data, error } = await supabase.functions.invoke(
        "send-sms-azure",
        {
          body: {
            phone: formattedPhone,
            message,
            tag: "AUTH_OTP",
          },
        },
      );

      console.log("[OTP] Réponse Edge Function:", { data, error });

      if (error) {
        console.error("[OTP] ❌ Erreur envoi OTP SMS:", error);
        console.error("[OTP] Error details:", {
          message: error.message,
          status: error.status,
        });
        return {
          success: false,
          error: error.message || "Erreur lors de l'envoi du SMS",
        };
      }

      if (data?.status === "ok") {
        console.log("[OTP] ✅ SMS OTP envoyé avec succès:", {
          messageId: data.messageId,
        });
      } else {
        console.error("[OTP] ❌ Statut error dans la réponse:", data);
      }

      return {
        success: data?.status === "ok",
        error: data?.status === "error" ? data?.reason : undefined,
        messageId: data?.messageId,
      };
    } catch (error) {
      console.error("[OTP] ❌ Exception envoi OTP SMS:", error);
      return {
        success: false,
        error: "Erreur lors de l'envoi du SMS",
      };
    }
  }

  /**
   * Envoie un OTP par WhatsApp (via SMS Azure MTN)
   */
  private async sendWhatsAppOTP(
    recipient: string,
    otp: string,
  ): Promise<OTPResult> {
    try {
      // Message optimisé pour WhatsApp
      const message =
        `MonToit: Votre code de verification est ${otp}. Valide 10min. Ne partagez jamais ce code.`;

      const { data, error } = await supabase.functions.invoke(
        "send-sms-azure",
        {
          body: {
            phone: this.formatPhoneNumber(recipient),
            message,
            tag: "WHATSAPP_OTP",
          },
        },
      );

      if (error) {
        console.error("Erreur envoi OTP WhatsApp:", error);
        return {
          success: false,
          error: error.message || "Erreur lors de l'envoi WhatsApp",
        };
      }

      return {
        success: data?.status === "ok",
        error: data?.status === "error" ? data?.reason : undefined,
        messageId: data?.messageId,
      };
    } catch (error) {
      console.error("Exception envoi OTP WhatsApp:", error);
      return {
        success: false,
        error: "Erreur lors de l'envoi WhatsApp",
      };
    }
  }

  /**
   * Envoie un code OTP
   */
  async sendOTP(request: OTPRequest): Promise<OTPResult> {
    console.log("[OTP] 🚀 sendOTP appelé avec:", request);

    const {
      recipient,
      method,
      userName,
      purpose = "auth",
      expiresIn = this.DEFAULT_EXPIRY,
    } = request;

    console.log("[OTP] Paramètres:", {
      recipient,
      method,
      userName,
      purpose,
      expiresIn,
    });

    // Validation de base
    if (!recipient || !method) {
      console.error("[OTP] ❌ Destinataire ou méthode manquant");
      return {
        success: false,
        error: "Destinataire et méthode requis",
      };
    }

    // Valider la cohérence email/méthode
    const recipientType = this.detectRecipientType(recipient);
    console.log("[OTP] Type détecté:", recipientType);

    if (method === "email" && recipientType !== "email") {
      console.error("[OTP] ❌ Méthode email incompatible avec le destinataire");
      return {
        success: false,
        error: "Méthode email incompatible avec le destinataire",
      };
    }

    if (
      (method === "sms" || method === "whatsapp") && recipientType !== "phone"
    ) {
      console.error(
        "[OTP] ❌ Méthode SMS/WhatsApp incompatible avec le destinataire",
      );
      return {
        success: false,
        error: "Méthode SMS/WhatsApp incompatible avec le destinataire",
      };
    }

    // Vérifier le rate limiting
    console.log("[OTP] Vérification rate limit...");
    const rateLimitCheck = await this.checkRateLimit(
      recipient,
      "otp-send",
      5,
      3,
    );
    if (!rateLimitCheck.allowed) {
      console.error("[OTP] ❌ Rate limit dépassé:", rateLimitCheck);
      return {
        success: false,
        error:
          `Trop de tentatives. Réessayez dans ${rateLimitCheck.remainingTime} secondes.`,
      };
    }
    console.log("[OTP] ✅ Rate limit OK");

    // Générer l'OTP
    const otp = this.generateOTP();
    console.log("[OTP] 🔐 OTP généré (longueur:", otp.length, ")");

    // Stocker l'OTP
    console.log("[OTP] 💾 Stockage OTP en base...");
    const storageResult = await this.storeOTP(
      recipient,
      otp,
      method,
      expiresIn,
      purpose,
    );
    if (!storageResult.success) {
      console.error("[OTP] ❌ Erreur stockage OTP:", storageResult.error);
      return {
        success: false,
        error: storageResult.error,
      };
    }
    console.log("[OTP] ✅ OTP stocké avec succès");

    // Envoyer selon la méthode
    console.log("[OTP] 📤 Envoi OTP par", method);
    let sendResult: OTPResult;

    switch (method) {
      case "email":
        sendResult = await this.sendEmailOTP(recipient, otp, userName);
        break;
      case "sms":
        sendResult = await this.sendSMSOTP(recipient, otp);
        break;
      case "whatsapp":
        sendResult = await this.sendWhatsAppOTP(recipient, otp);
        break;
      default:
        console.error("[OTP] ❌ Méthode non supportée:", method);
        return {
          success: false,
          error: "Méthode non supportée",
        };
    }

    console.log("[OTP] Résultat final:", sendResult);
    return sendResult;
  }

  /**
   * Vérifie un code OTP
   */
  async verifyOTP(
    verification: OTPVerification,
  ): Promise<OTPVerificationResult> {
    const { recipient, code, method } = verification;

    try {
      // Formater le recipient si c'est un numéro de téléphone
      let searchRecipient = recipient;
      if (method === "sms" || method === "whatsapp") {
        searchRecipient = this.formatPhoneNumber(recipient);
      }

      // Récupérer l'OTP valide le plus récent
      const { data: otpData, error: fetchError } = await supabase
        .from("otp_codes")
        .select("*")
        .eq("recipient", searchRecipient)
        .eq("method", method)
        .eq("code", code)
        .gte("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (fetchError) {
        console.error("Erreur vérification OTP:", fetchError);
        return {
          success: false,
          error: "Code invalide ou expiré",
        };
      }

      if (!otpData) {
        return {
          success: false,
          error: "Code invalide ou expiré",
        };
      }

      // Marquer l'OTP comme utilisé
      await supabase
        .from("otp_codes")
        .update({
          used: true,
          used_at: new Date().toISOString(),
        })
        .eq("id", otpData.id);

      // Vérifier si l'utilisateur existe déjà
      const isEmail = this.detectRecipientType(recipient) === "email";
      let userExists = false;
      let userId: string | undefined;

      if (isEmail) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("email", recipient)
          .maybeSingle();
        userExists = !!profile;
        userId = profile?.id;
      } else {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("phone", searchRecipient)
          .maybeSingle();
        userExists = !!profile;
        userId = profile?.id;
      }

      return {
        success: true,
        isNewUser: !userExists,
        userId,
      };
    } catch (error) {
      console.error("Exception vérification OTP:", error);
      return {
        success: false,
        error: "Erreur lors de la vérification",
      };
    }
  }

  /**
   * Vérifie le rate limiting pour un destinataire
   */
  async checkRateLimit(
    recipient: string,
    action: string = "otp-send",
    windowMinutes: number = 5,
    maxAttempts: number = 3,
  ): Promise<{ allowed: boolean; remainingTime?: number }> {
    try {
      const cutoffTime = new Date(Date.now() - windowMinutes * 60 * 1000)
        .toISOString();

      // Formater le recipient si c'est un numéro de téléphone
      let searchRecipient = recipient;
      if (this.detectRecipientType(recipient) === "phone") {
        searchRecipient = this.formatPhoneNumber(recipient);
      }

      const { data, error } = await supabase
        .from("otp_codes")
        .select("created_at")
        .eq("recipient", searchRecipient)
        .gte("created_at", cutoffTime)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erreur rate limit check:", error);
        return { allowed: true }; // En cas d'erreur, autoriser
      }

      if (!data || data.length < maxAttempts) {
        return { allowed: true };
      }

      const lastAttempt = new Date(data[0].created_at);
      const remainingTime = Math.ceil(
        (lastAttempt.getTime() + windowMinutes * 60 * 1000 - Date.now()) / 1000,
      );

      return { allowed: false, remainingTime: Math.max(0, remainingTime) };
    } catch (error) {
      console.error("Exception rate limit check:", error);
      return { allowed: true };
    }
  }
}

// Export du singleton
export const otpUnifiedService = new OTPUnifiedService();
export default otpUnifiedService;
