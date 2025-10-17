// ============================================================================
// SMILE ID VERIFICATION - EDGE FUNCTION
// ============================================================================
// Enhanced version with strict validation, error handling, and security
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

// ============================================================================
// CONFIGURATION
// ============================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_DAILY_ATTEMPTS = 3;
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const BASE64_IMAGE_PATTERN = /^data:image\/(jpeg|jpg|png);base64,/;
const MIN_CONFIDENCE_SCORE = 70;

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface SmileIDRequest {
  cniImageBase64: string;
  selfieBase64: string;
}

interface SmileIDConfig {
  partnerId: string;
  apiKey: string;
  environment: 'test' | 'production';
  baseUrl: string;
}

interface VerificationAttempts {
  count: number;
  remaining: number;
  resetDate: string;
}

interface VerificationResult {
  verified: boolean;
  similarityScore: string;
  livenessCheck: boolean;
  selfieToIdMatch: boolean;
  idNumber: string;
  resultText: string;
  message: string;
  canRetry: boolean;
  attemptsRemaining: number;
  resetDate: string;
}

interface SmileIDResponse {
  ResultCode?: string;
  result_code?: string;
  ResultText?: string;
  result_text?: string;
  ConfidenceValue?: string;
  confidence_value?: string;
  Actions?: Record<string, string>;
  actions?: Record<string, string>;
  job_id?: string;
  IDNumber?: string;
  id_number?: string;
}

// ============================================================================
// CUSTOM ERROR CLASS
// ============================================================================

class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate environment variables at startup
 */
function validateEnvironment(): void {
  const required = [
    'SMILE_ID_PARTNER_ID',
    'SMILE_ID_API_KEY',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];
  
  const missing = required.filter(key => !Deno.env.get(key));
  
  if (missing.length > 0) {
    throw new AppError(
      'ENV_MISSING',
      `Variables d'environnement manquantes: ${missing.join(', ')}`,
      500
    );
  }
}

/**
 * Validate base64 image format and size
 */
function validateBase64Image(image: string, fieldName: string): void {
  if (!image || typeof image !== 'string') {
    throw new AppError(
      'INVALID_INPUT',
      `${fieldName} est requis et doit être une chaîne de caractères`
    );
  }

  if (!BASE64_IMAGE_PATTERN.test(image)) {
    throw new AppError(
      'INVALID_FORMAT',
      `${fieldName} doit être au format base64 valide (jpeg, jpg ou png)`
    );
  }

  try {
    const base64Data = image.split(',')[1];
    if (!base64Data) {
      throw new Error('Invalid base64 format');
    }
    
    const sizeInBytes = (base64Data.length * 3) / 4;
    
    if (sizeInBytes > MAX_IMAGE_SIZE) {
      throw new AppError(
        'FILE_TOO_LARGE',
        `${fieldName} trop volumineuse (max ${MAX_IMAGE_SIZE / 1024 / 1024}MB)`
      );
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('INVALID_FORMAT', `${fieldName} - format base64 invalide`);
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Structured logger
 */
const logger = {
  info: (message: string, data?: any) => {
    console.log(`[INFO] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  },
  error: (message: string, error?: any) => {
    console.error(`[ERROR] ${message}`, error);
  },
  success: (message: string, data?: any) => {
    console.log(`[SUCCESS] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  },
  warn: (message: string, data?: any) => {
    console.warn(`[WARN] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }
};

/**
 * Get configuration from environment
 */
function getSmileIDConfig(): SmileIDConfig {
  const environment = (Deno.env.get('SMILE_ID_ENVIRONMENT') || 'test') as 'test' | 'production';
  
  return {
    partnerId: Deno.env.get('SMILE_ID_PARTNER_ID')!,
    apiKey: Deno.env.get('SMILE_ID_API_KEY')!,
    environment,
    baseUrl: environment === 'production'
      ? 'https://api.smileidentity.com/v1'
      : 'https://testapi.smileidentity.com/v1'
  };
}

/**
 * Calculate verification attempts for the current day
 */
function getVerificationAttempts(verification: any, today: string): VerificationAttempts {
  const lastAttempt = verification?.updated_at
    ? new Date(verification.updated_at).toDateString()
    : null;

  const currentCount = lastAttempt === today
    ? (verification?.face_verification_attempts || 0)
    : 0;

  const remaining = Math.max(0, MAX_DAILY_ATTEMPTS - currentCount);
  
  const resetDate = lastAttempt === today
    ? new Date(new Date().setHours(24, 0, 0, 0)).toISOString()
    : new Date().toISOString();

  return { count: currentCount, remaining, resetDate };
}

/**
 * Generate HMAC-SHA256 signature for Smile ID
 */
async function generateSignature(
  timestamp: string,
  partnerId: string,
  apiKey: string
): Promise<string> {
  const message = `${timestamp}${partnerId}sid_request`;
  const encoder = new TextEncoder();
  const keyData = encoder.encode(apiKey);
  const messageData = encoder.encode(message);

  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", key, messageData);
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Parse Smile ID API response with robust error handling
 */
function parseSmileIDResponse(response: SmileIDResponse): {
  resultCode: string;
  resultText: string;
  actions: Record<string, string>;
  confidenceValue: number;
  idNumber: string;
} {
  try {
    return {
      resultCode: response.ResultCode ?? response.result_code ?? '',
      resultText: response.ResultText ?? response.result_text ?? '',
      actions: response.Actions ?? response.actions ?? {},
      confidenceValue: parseFloat(response.ConfidenceValue ?? response.confidence_value ?? '0'),
      idNumber: response.IDNumber ?? response.id_number ?? ''
    };
  } catch (error) {
    logger.error('Failed to parse Smile ID response', error);
    throw new AppError(
      'PARSE_ERROR',
      'Format de réponse Smile ID invalide',
      500
    );
  }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate environment on startup
    validateEnvironment();

    // Parse and validate request body
    const { cniImageBase64, selfieBase64 }: SmileIDRequest = await req.json();

    logger.info('Smile ID Verification Request received');

    // Validate images
    validateBase64Image(cniImageBase64, 'Image CNI');
    validateBase64Image(selfieBase64, 'Selfie');

    // Get configuration
    const config = getSmileIDConfig();

    // Initialize Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new AppError('UNAUTHORIZED', 'En-tête d\'autorisation manquant', 401);
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      logger.error('Auth error:', authError);
      throw new AppError('UNAUTHORIZED', 'Non autorisé', 401);
    }

    logger.info(`User authenticated: ${user.id}`);

    // Check verification attempts
    const { data: verification } = await supabase
      .from('user_verifications')
      .select('face_verification_attempts, updated_at')
      .eq('user_id', user.id)
      .maybeSingle();

    const today = new Date().toDateString();
    const attempts = getVerificationAttempts(verification, today);

    if (attempts.remaining <= 0) {
      return new Response(
        JSON.stringify({
          error: 'Limite de tentatives atteinte',
          message: `Vous avez atteint la limite de ${MAX_DAILY_ATTEMPTS} tentatives par jour. Réessayez demain.`,
          attemptsRemaining: 0,
          resetDate: attempts.resetDate
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logger.info(`Attempts remaining: ${attempts.remaining}`);

    // Generate timestamp and signature
    const timestamp = new Date().toISOString();
    const signature = await generateSignature(timestamp, config.partnerId, config.apiKey);

    // Prepare Smile ID request payload
    // IMPORTANT: For CI (Côte d'Ivoire), id_type is REQUIRED for job_type 5
    // IDENTITY_CARD = CNI with photo (for visual verification)
    const smileIdPayload = {
      partner_id: config.partnerId,
      timestamp: timestamp,
      signature: signature,
      country: "CI", // Côte d'Ivoire
      id_type: "IDENTITY_CARD", // Required for CI CNI with photo
      job_type: 5, // Enhanced Document Verification
      user_id: user.id,
      images: [
        {
          image_type_id: 1, // Selfie
          image: selfieBase64.split(',')[1],
        },
        {
          image_type_id: 3, // ID Card
          image: cniImageBase64.split(',')[1],
        }
      ],
      partner_params: {
        user_id: user.id,
        job_id: crypto.randomUUID(),
      }
    };

    logger.info('Calling Smile ID API', {
      country: smileIdPayload.country,
      job_type: smileIdPayload.job_type,
      partner_id: config.partnerId,
      images_count: smileIdPayload.images.length
    });

    // Call Smile ID API
    const smileResponse = await fetch(`${config.baseUrl}/id_verification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(smileIdPayload),
    });

    if (!smileResponse.ok) {
      const errorText = await smileResponse.text();
      logger.error(`Smile ID API error: ${smileResponse.status}`, errorText);
      throw new AppError(
        'SMILE_ID_ERROR',
        `Erreur API Smile ID: ${smileResponse.status}`,
        500
      );
    }

    const smileResult: SmileIDResponse = await smileResponse.json();
    logger.info('Smile ID response received', smileResult);

    // Parse results
    const {
      resultCode,
      resultText,
      actions,
      confidenceValue,
      idNumber
    } = parseSmileIDResponse(smileResult);

    // Parse actions
    const livenessCheck = actions.Liveness_Check === 'Passed' || actions.liveness_check === 'Passed';
    const selfieToIdMatch =
      actions.Selfie_To_ID_Authority_Compare === 'Passed' ||
      actions.selfie_to_id_authority_compare === 'Passed' ||
      actions.Selfie_To_ID_Card_Compare === 'Passed' ||
      actions.selfie_to_id_card_compare === 'Passed';

    // Determine if verification passed
    const isVerified =
      (resultCode === '1' || resultCode === '0') &&
      livenessCheck &&
      selfieToIdMatch &&
      confidenceValue >= MIN_CONFIDENCE_SCORE;

    logger.info('Verification result', {
      isVerified,
      resultCode,
      livenessCheck,
      selfieToIdMatch,
      confidenceValue
    });

    // Update attempts
    const newAttempts = attempts.count + 1;
    const newAttemptsRemaining = Math.max(0, MAX_DAILY_ATTEMPTS - newAttempts);

    // Prepare update data
    const updateData: any = {
      user_id: user.id, // Required for upsert
      face_verification_attempts: newAttempts,
      face_similarity_score: confidenceValue,
      smile_id_job_id: smileResult.job_id || smileIdPayload.partner_params.job_id,
      smile_id_result_code: resultCode,
      smile_id_confidence_score: confidenceValue,
      smile_id_actions: actions,
      id_number_extracted: idNumber,
      liveness_check_passed: livenessCheck,
      selfie_to_id_match_passed: selfieToIdMatch,
      updated_at: new Date().toISOString()
    };

    if (isVerified) {
      updateData.face_verification_status = 'verified';
      updateData.face_verified_at = new Date().toISOString();
    } else {
      updateData.face_verification_status = 'failed';
    }

    // Use upsert instead of update to avoid errors if record doesn't exist
    const { error: upsertError } = await supabase
      .from('user_verifications')
      .upsert(updateData, {
        onConflict: 'user_id'
      });

    if (upsertError) {
      logger.error('Error upserting verification', upsertError);
    } else {
      logger.success('Verification data saved');
    }

    // Send success email if verified (non-blocking)
    if (isVerified) {
      try {
        await supabase.functions.invoke('send-email', {
          body: {
            type: 'face-verification-success',
            to: user.email,
            data: {
              userName: user.user_metadata?.full_name || 'Utilisateur',
              similarityScore: confidenceValue.toFixed(1),
            }
          }
        });
        logger.info('Verification success email sent');
      } catch (emailError) {
        logger.warn('Failed to send email (non-blocking)', emailError);
        // Continue without interrupting the process
      }
    }

    const result: VerificationResult = {
      verified: isVerified,
      similarityScore: confidenceValue.toFixed(1),
      livenessCheck,
      selfieToIdMatch,
      idNumber,
      resultText,
      message: isVerified
        ? 'Vérification Smile ID réussie !'
        : `Vérification échouée. ${resultText}`,
      canRetry: newAttemptsRemaining > 0,
      attemptsRemaining: newAttemptsRemaining,
      resetDate: attempts.resetDate
    };

    logger.success('Verification process completed', {
      verified: isVerified,
      attemptsRemaining: newAttemptsRemaining
    });

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    // Handle custom AppError
    if (error instanceof AppError) {
      logger.error(`${error.code}: ${error.message}`);
      return new Response(
        JSON.stringify({
          error: error.code,
          message: error.message,
          verified: false
        }),
        {
          status: error.statusCode,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Handle unexpected errors
    logger.error('Unexpected error in smile-id-verification', error);
    return new Response(
      JSON.stringify({
        error: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Erreur interne du serveur',
        verified: false
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
