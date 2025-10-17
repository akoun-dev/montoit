import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ModerationResult {
  reviewId: string;
  moderationResult: {
    sentiment: 'positive' | 'negative' | 'neutral';
    inappropriateLanguage: boolean;
    personalInfoDetected: boolean;
    suspiciousContent: boolean;
    confidenceScore: number;
    suggestedAction: 'approve' | 'reject' | 'flag_for_review';
    aiReason: string;
  };
}

// Basic keyword-based content analysis
function analyzeContentBasic(text: string): ModerationResult['moderationResult'] {
  const lowerText = text.toLowerCase();
  
  // Inappropriate language detection
  const inappropriateKeywords = [
    'connard', 'salaud', 'merde', 'putain', 'enculé', 'con', 'débile',
    'crétin', 'idiot', 'imbécile', 'nul', 'pourri', 'arnaque', 'escroquerie'
  ];
  const inappropriateLanguage = inappropriateKeywords.some(keyword => lowerText.includes(keyword));
  
  // Personal information detection
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const phoneRegex = /(\+?225|0)?[0-9]{8,10}/;
  const personalInfoDetected = emailRegex.test(text) || phoneRegex.test(text);
  
  // Suspicious content (too short, repetitive, spam patterns)
  const words = text.trim().split(/\s+/);
  const suspiciousContent = 
    words.length < 5 || // Too short
    /(.)\1{4,}/.test(text) || // Repeated characters
    /^[A-Z\s!]+$/.test(text); // All caps (shouting)
  
  // Sentiment analysis (basic)
  const positiveKeywords = ['bien', 'bon', 'excellent', 'super', 'parfait', 'agréable', 'propre', 'calme'];
  const negativeKeywords = ['mauvais', 'sale', 'bruyant', 'insalubre', 'dangereux', 'problème', 'défaut'];
  
  const positiveCount = positiveKeywords.filter(kw => lowerText.includes(kw)).length;
  const negativeCount = negativeKeywords.filter(kw => lowerText.includes(kw)).length;
  
  let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
  if (positiveCount > negativeCount) sentiment = 'positive';
  else if (negativeCount > positiveCount) sentiment = 'negative';
  
  // Calculate toxicity score
  let toxicityScore = 0;
  if (inappropriateLanguage) toxicityScore += 40;
  if (personalInfoDetected) toxicityScore += 20;
  if (suspiciousContent) toxicityScore += 15;
  if (sentiment === 'negative') toxicityScore += 10;
  
  // Suggested action based on score
  let suggestedAction: 'approve' | 'reject' | 'flag_for_review' = 'approve';
  if (toxicityScore >= 50) suggestedAction = 'reject';
  else if (toxicityScore >= 20) suggestedAction = 'flag_for_review';
  
  // Build reason
  const reasons: string[] = [];
  if (inappropriateLanguage) reasons.push('langage inapproprié détecté');
  if (personalInfoDetected) reasons.push('informations personnelles détectées');
  if (suspiciousContent) reasons.push('contenu suspect (trop court ou spam)');
  
  const aiReason = reasons.length > 0 
    ? `Problèmes détectés : ${reasons.join(', ')}`
    : 'Aucun problème majeur détecté';
  
  return {
    sentiment,
    inappropriateLanguage,
    personalInfoDetected,
    suspiciousContent,
    confidenceScore: toxicityScore,
    suggestedAction,
    aiReason
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user is admin
    const { data: isAdmin } = await supabase.rpc('has_role', { 
      _user_id: user.id, 
      _role: 'admin' 
    });

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { reviewId, reviewText } = await req.json();

    let textToAnalyze = reviewText;

    // If reviewId provided, fetch the review
    if (reviewId && !reviewText) {
      const { data: review, error: reviewError } = await supabase
        .from('reviews')
        .select('comment')
        .eq('id', reviewId)
        .single();

      if (reviewError) throw reviewError;
      textToAnalyze = review.comment;
    }

    if (!textToAnalyze) {
      return new Response(JSON.stringify({ error: 'No text to analyze' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Basic keyword-based moderation
    const moderationResult = analyzeContentBasic(textToAnalyze);

    // Auto-update review if confidence is high
    if (reviewId && moderationResult.confidenceScore > 90) {
      const newStatus = moderationResult.suggestedAction === 'approve' ? 'approved' : 
                       moderationResult.suggestedAction === 'reject' ? 'rejected' : 'pending';
      
      await supabase
        .from('reviews')
        .update({
          moderation_status: newStatus,
          moderation_notes: moderationResult.aiReason,
          moderated_by: user.id,
          moderated_at: new Date().toISOString(),
        })
        .eq('id', reviewId);
    }

    const result: ModerationResult = {
      reviewId: reviewId || 'N/A',
      moderationResult,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
