/**
 * OTP Unified Service - Azure Gateway Integration
 *
 * Service unifié pour la gestion des codes OTP via Azure Gateway
 * Supporte Email et SMS pour l'authentification
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

export type OTPErrorCode =
  | 'INVALID_OTP'
  | 'USER_EXISTS_CONFLICT'
  | 'REGISTRATION_FAILED'
  | 'SESSION_GENERATION_FAILED'
  | 'INTERNAL_LOGIN_ERROR'
  | 'INTERNAL_SERVER_ERROR'
  | 'SERVER_CONFIG_ERROR'
  | 'MISSING_INPUT'
  | string;

export interface OTPVerificationResult {
  success: boolean;
  error?: string;
  errorCode?: OTPErrorCode;
  details?: unknown;
  isNewUser?: boolean;
  userId?: string;
  action?: 'needsName' | 'register' | 'login' | 'complete';
  sessionUrl?: string;
  needsProfileCompletion?: boolean;
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
   * Regex de validation email conforme RFC 5322
   * - Partie locale : lettres, chiffres, caractères spéciaux autorisés
   * - Domaine : lettres, chiffres, tirets, points
   * - TLD : minimum 2 caractères
   */
  private readonly EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9]{0,61}[a-zA-Z0-9])?)+$/;

  /**
   * Valide un format d'email
   */
  validateEmail(email: string): boolean {
    return this.EMAIL_REGEX.test(email);
  }

  /**
   * Détermine si le recipient est un email ou un numéro de téléphone
   */
  private detectRecipientType(recipient: string): "email" | "phone" {
    return this.EMAIL_REGEX.test(recipient) ? "email" : "phone";
  }

  /**
   * Formate le numéro pour l'API SMS
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
        expires_at: expiresAt,
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
   * Envoie un OTP par email via Azure Gateway
   */
  private async sendEmailOTP(
    recipient: string,
    otp: string,
    userName?: string
  ): Promise<OTPResult> {
    // OTP and userName are not directly used in this implementation
    // The edge function handles OTP generation internally
    void otp;
    void userName;
    try {
      const { data, error } = await supabase.functions.invoke("email-otp-send", {
        body: {
          email: recipient,
          purpose: "email_verification",
        },
      });

      if (error) {
        console.error("Erreur envoi OTP email:", error);
        return {
          success: false,
          error: error.message || "Erreur lors de l'envoi de l'email",
        };
      }

      // email-otp-send renvoie: { success, message, expiresIn }
      // On considère que success === true est OK
      return {
        success: data?.success === true,
        error: data?.success === false ? (data?.message || "Erreur inconnue") : undefined,
        messageId: undefined, // email-otp-send ne renvoie pas messageId
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
    console.log("[OTP] Envoi SMS OTP:", { recipient, otp });
    const formattedPhone = this.formatPhoneNumber(recipient);
    console.log("[OTP] Numero formaté:", formattedPhone);

    const message =
      `MonToit: Votre code de verification est ${otp}. Valide 10min. Ne partagez jamais ce code.`;
    console.log("[OTP] Message:", message);

    try {
      console.log("[OTP] Appel Edge Function sms-otp-send...");
      const { data, error } = await supabase.functions.invoke("sms-otp-send", {
        body: {
          phone: formattedPhone,
          message,
          tag: "AUTH_OTP",
        },
      });

      console.log("[OTP] Reponse Edge Function:", { data, error });

      if (error) {
        console.error("[OTP] Erreur envoi OTP SMS:", error);
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
        console.log("[OTP] SMS envoye avec succes:", {
          messageId: data.messageId,
        });
      } else {
        console.error("[OTP] Statut error dans la reponse:", data);
      }
      return {
        success: data?.status === "ok",
        error: data?.status === "error" ? data?.reason : undefined,
        messageId: data?.messageId,
      };
    } catch (error) {
      console.error("[OTP] Exception envoi OTP SMS:", error);
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
    otp: string
  ): Promise<OTPResult> {
    try {
      // Message optimisé pour WhatsApp
      const message =
        `MonToit: Votre code de verification est ${otp}. Valide 10min. Ne partagez jamais ce code.`;

      const { data, error } = await supabase.functions.invoke("sms-otp-send", {
        body: {
          phone: this.formatPhoneNumber(recipient),
          message,
          tag: "WHATSAPP_OTP",
        },
      });

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
    console.log("[OTP] sendOTP appelé avec:", request);

    const {
      recipient,
      method,
      userName,
      purpose = "auth",
      expiresIn = this.DEFAULT_EXPIRY,
    } = request;

    console.log("[OTP] Parametres:", {
      recipient,
      method,
      userName,
      purpose,
      expiresIn,
    });

    // Validation de base
    if (!recipient || !method) {
      console.error("[OTP] Destinataire ou methode manquant");
      return {
        success: false,
        error: "Destinataire et methode requis",
      };
    }

    // Valider la coherence email/methode
    const recipientType = this.detectRecipientType(recipient);
    console.log("[OTP] Type detecté:", recipientType);

    if (method === "email" && recipientType !== "email") {
      console.error("[OTP] Methode email incompatible avec le destinataire");
      return {
        success: false,
        error: "Methode email incompatible avec le destinataire",
      };
    }

    if (
      (method === "sms" || method === "whatsapp") && recipientType !== "phone"
    ) {
      console.error(
        "[OTP] Methode SMS/WhatsApp incompatible avec le destinataire"
      );
      return {
        success: false,
        error: "Methode SMS/WhatsApp incompatible avec le destinataire",
      };
    }

    // Verifier le rate limiting
    console.log("[OTP] Verification rate limit...");
    const rateLimitCheck = await this.checkRateLimit(
      recipient,
      "otp-send",
      5,
      3,
      3,
    );
    if (!rateLimitCheck.allowed) {
      console.error("[OTP] Rate limit depasse:", rateLimitCheck);
      return {
        success: false,
        error:
          `Trop de tentatives. Reessayez dans ${rateLimitCheck.remainingTime} secondes.`,
      };
    }
    console.log("[OTP] Rate limit OK");

    // Generer l'OTP
    const otp = this.generateOTP();
    console.log("[OTP] OTP genere (longueur:", otp.length, ")");

    // Stocker l'OTP
    console.log("[OTP] Stockage OTP en base...");
    const storageResult = await this.storeOTP(
      recipient,
      otp,
      method,
      expiresIn,
      purpose,
    );
    if (!storageResult.success) {
      console.error("[OTP] Erreur stockage OTP:", storageResult.error);
      return {
        success: false,
        error: storageResult.error,
      };
    }
    console.log("[OTP] OTP stocke avec succes");

    // Envoyer selon la methode
    console.log("[OTP] Envoi OTP par", method);
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
        console.error("[OTP] Methode non supportee:", method);
        return {
          success: false,
          error: "Methode non supportee",
        };
    }

    console.log("[OTP] Resultat final:", sendResult);
    return sendResult;
  }

  /**
   * Verifie un code OTP
   */
  async verifyOTP(
    verification: OTPVerification,
  ): Promise<OTPVerificationResult> {
    const { recipient, code, method } = verification;

    try {
      // Formater le recipient si c'est un numero de telephone
      let searchRecipient = recipient;
      if (method === "sms" || method === "whatsapp") {
        searchRecipient = this.formatPhoneNumber(recipient);
      }

      // Récupérer l'OTP valide le plus récent
      const { data: otpData, error: fetchError } = await supabase
        .from("otp_codes")
        .select("*")
        .eq("recipient", searchRecipient)
        .eq("code", code)
        .gte("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (fetchError) {
        console.error("Erreur verification OTP:", fetchError);
        return {
          success: false,
          errorCode: "INVALID_OTP",
          error: "Code invalide ou expire",
        };
      }

      if (!otpData) {
        return {
          success: false,
          errorCode: "INVALID_OTP",
          error: "Code invalide ou expire",
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
      console.error("Exception verification OTP:", error);
      return {
        success: false,
        error: "Erreur lors de la verification",
      };
    }
  }

  /**
   * Vérifie le rate limiting pour un destinataire
   * Note: Le paramètre action est réservé pour une utilisation future (différencier les types d'actions)
   */
  async checkRateLimit(
    recipient: string,
    action: string = "otp-send",
    windowMinutes: number = 5,
    maxAttempts: number = 3,
  ): Promise<{ allowed: boolean; remainingTime?: number }> {
    // Le paramètre action est réservé pour une utilisation future
    void action;
    try {
      const cutoffTime = new Date(
        Date.now() - windowMinutes * 60 * 1000
      ).toISOString();

      // Formater le recipient si c'est un numero de telephone
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
        (lastAttempt.getTime() + windowMinutes * 60 * 1000 - Date.now()) / 1000
      );

      return { allowed: false, remainingTime: Math.max(0, remainingTime) };
    } catch (error) {
      console.error("Exception rate limit check:", error);
      return { allowed: true };
    }
  }
}

// Export du singleton
export const otpService = new OTPUnifiedService();
export default otpService;
