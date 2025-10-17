import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FaceVerificationRequest {
  cniImageBase64: string;
  selfieBase64: string;
}

interface AzureFaceDetectResponse {
  faceId: string;
  faceRectangle: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
}

interface AzureFaceVerifyResponse {
  isIdentical: boolean;
  confidence: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { cniImageBase64, selfieBase64 }: FaceVerificationRequest = await req.json();

    console.log('Face Verification Request received');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Check verification attempts (max 3 per day)
    const { data: verification } = await supabase
      .from('user_verifications')
      .select('face_verification_attempts, updated_at')
      .eq('user_id', user.id)
      .single();

    const today = new Date().toDateString();
    const lastAttempt = verification?.updated_at ? new Date(verification.updated_at).toDateString() : null;
    
    if (lastAttempt === today && verification && verification.face_verification_attempts >= 3) {
      return new Response(
        JSON.stringify({ 
          error: 'Limite de tentatives atteinte',
          message: 'Vous avez atteint la limite de 3 tentatives par jour. Réessayez demain.' 
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const azureEndpoint = Deno.env.get('AZURE_FACE_ENDPOINT')!;
    const azureApiKey = Deno.env.get('AZURE_FACE_API_KEY')!;

    // Convert base64 to binary
    const cniImageBinary = Uint8Array.from(atob(cniImageBase64.split(',')[1]), c => c.charCodeAt(0));
    const selfieBinary = Uint8Array.from(atob(selfieBase64.split(',')[1]), c => c.charCodeAt(0));

    console.log('Detecting face in CNI image...');
    
    // Step 1: Detect face in CNI image
    const cniDetectResponse = await fetch(
      `${azureEndpoint}/face/v1.0/detect?returnFaceId=true&returnFaceLandmarks=false`,
      {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': azureApiKey,
          'Content-Type': 'application/octet-stream',
        },
        body: cniImageBinary,
      }
    );

    if (!cniDetectResponse.ok) {
      const error = await cniDetectResponse.text();
      console.error('CNI detection error:', error);
      throw new Error('Impossible de détecter un visage dans la photo de CNI');
    }

    const cniDetectResult: AzureFaceDetectResponse[] = await cniDetectResponse.json();
    
    if (cniDetectResult.length === 0) {
      throw new Error('Aucun visage détecté dans la photo de CNI');
    }
    
    if (cniDetectResult.length > 1) {
      throw new Error('Plusieurs visages détectés dans la photo de CNI');
    }

    const cniFaceId = cniDetectResult[0].faceId;

    console.log('Detecting face in selfie...');

    // Step 2: Detect face in selfie
    const selfieDetectResponse = await fetch(
      `${azureEndpoint}/face/v1.0/detect?returnFaceId=true&returnFaceLandmarks=false`,
      {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': azureApiKey,
          'Content-Type': 'application/octet-stream',
        },
        body: selfieBinary,
      }
    );

    if (!selfieDetectResponse.ok) {
      const error = await selfieDetectResponse.text();
      console.error('Selfie detection error:', error);
      throw new Error('Impossible de détecter un visage dans le selfie');
    }

    const selfieDetectResult: AzureFaceDetectResponse[] = await selfieDetectResponse.json();
    
    if (selfieDetectResult.length === 0) {
      throw new Error('Aucun visage détecté dans le selfie');
    }
    
    if (selfieDetectResult.length > 1) {
      throw new Error('Plusieurs visages détectés dans le selfie');
    }

    const selfieFaceId = selfieDetectResult[0].faceId;

    console.log('Verifying faces match...');

    // Step 3: Verify if faces match
    const verifyResponse = await fetch(
      `${azureEndpoint}/face/v1.0/verify`,
      {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': azureApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          faceId1: cniFaceId,
          faceId2: selfieFaceId,
        }),
      }
    );

    if (!verifyResponse.ok) {
      const error = await verifyResponse.text();
      console.error('Verification error:', error);
      throw new Error('Erreur lors de la vérification des visages');
    }

    const verifyResult: AzureFaceVerifyResponse = await verifyResponse.json();
    
    const similarityScore = verifyResult.confidence * 100;
    const isVerified = verifyResult.isIdentical && similarityScore >= 70;

    console.log('Verification result:', { isVerified, similarityScore });

    // Update user verification record
    const newAttempts = lastAttempt === today 
      ? (verification?.face_verification_attempts || 0) + 1 
      : 1;

    const updateData: any = {
      face_verification_attempts: newAttempts,
      face_similarity_score: similarityScore,
    };

    if (isVerified) {
      updateData.face_verification_status = 'verified';
      updateData.face_verified_at = new Date().toISOString();
    } else {
      updateData.face_verification_status = 'failed';
    }

    const { error: updateError } = await supabase
      .from('user_verifications')
      .update(updateData)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error updating verification:', updateError);
    }

    // Send success email if verified
    if (isVerified) {
      await supabase.functions.invoke('send-email', {
        body: {
          type: 'face-verification-success',
          to: user.email,
          data: {
            userName: user.user_metadata?.full_name || 'Utilisateur',
            similarityScore: similarityScore.toFixed(1),
          }
        }
      });
    }

    return new Response(
      JSON.stringify({
        verified: isVerified,
        similarityScore: similarityScore.toFixed(1),
        message: isVerified 
          ? 'Vérification faciale réussie !' 
          : `La similarité (${similarityScore.toFixed(1)}%) est trop faible. Le seuil minimum est de 70%.`,
        attemptsRemaining: Math.max(0, 3 - newAttempts),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in face-verification:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        verified: false 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
