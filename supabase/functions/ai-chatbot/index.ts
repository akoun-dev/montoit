import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUTA_SYSTEM_PROMPT = `Tu es SUTA (Smart User Technology Assistant), l'assistant virtuel intelligent de Mon Toit, la plateforme de location immobilière certifiée en Côte d'Ivoire.

Tu es professionnel, chaleureux et expert en immobilier ivoirien. Tu connais parfaitement :
- La location immobilière en Côte d'Ivoire (lois, pratiques, quartiers)
- Les différents quartiers d'Abidjan (Cocody, Marcory, Yopougon, Plateau, Treichville, etc.)
- Les types de biens (appartements, studios, villas, bureaux, commerces)
- Les prix du marché immobilier ivoirien
- Les bonnes pratiques pour éviter les arnaques

Tes responsabilités :
1. Aider les locataires à trouver un logement sécurisé
2. Guider les propriétaires dans la publication de leurs biens
3. Protéger les utilisateurs contre les arnaques immobilières
4. Expliquer les processus de location et les contrats
5. Répondre aux questions sur la plateforme Mon Toit

⚠️ RÈGLES DE SÉCURITÉ IMPORTANTES :
- Toujours rappeler de NE JAMAIS payer avant une visite physique
- Alerter sur les signes d'arnaques (prix trop bas, urgence, demande d'avance)
- Recommander les visites accompagnées et les paiements sécurisés

Style de communication :
- Tutoiement amical mais professionnel
- Réponses concises et actionnables (max 200 mots)
- Utilise des emojis avec parcimonie (max 2 par message)
- Adapté au contexte ivoirien

Si tu ne connais pas une information, redis-le honnêtement.`;

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface KnowledgeEntry {
  question: string;
  answer: string;
  category: string;
}

// Detect category from user message
function detectCategory(message: string): string {
  const lowerMsg = message.toLowerCase();

  if (
    lowerMsg.includes('arnaque') ||
    lowerMsg.includes('fraude') ||
    lowerMsg.includes('escroquerie') ||
    lowerMsg.includes('sécurité')
  ) {
    return 'securite';
  }
  if (lowerMsg.includes('contrat') || lowerMsg.includes('bail') || lowerMsg.includes('signature')) {
    return 'contrat';
  }
  if (
    lowerMsg.includes('payer') ||
    lowerMsg.includes('rent') ||
    lowerMsg.includes('paiement') ||
    lowerMsg.includes('argent')
  ) {
    return 'paiement';
  }
  if (
    lowerMsg.includes('quartier') ||
    lowerMsg.includes('abidjan') ||
    lowerMsg.includes('cocody') ||
    lowerMsg.includes('marcory')
  ) {
    return 'quartiers';
  }
  if (
    lowerMsg.includes('document') ||
    lowerMsg.includes('dossier') ||
    lowerMsg.includes('papier')
  ) {
    return 'location';
  }

  return 'general';
}

// Extract keywords from message for knowledge search
function extractKeywords(message: string): string[] {
  const stopWords = [
    'je',
    'tu',
    'il',
    'elle',
    'nous',
    'vous',
    'ils',
    'elles',
    'le',
    'la',
    'les',
    'un',
    'une',
    'des',
    'de',
    'du',
    'à',
    'au',
    'aux',
    'et',
    'ou',
    'mais',
    'donc',
    'car',
    'ni',
    'que',
    'qui',
    'quoi',
    'comment',
    'pourquoi',
    'est',
    'sont',
    'suis',
    'es',
    'ai',
    'as',
    'a',
    'avons',
    'avez',
    'ont',
    'pour',
    'dans',
    'sur',
    'avec',
    'sans',
    'par',
    'en',
    'ne',
    'pas',
    'plus',
    'moins',
    'très',
    'bien',
    'mal',
    'tout',
    'tous',
    'toute',
    'toutes',
    'ce',
    'cette',
    'ces',
    'mon',
    'ma',
    'mes',
    'ton',
    'ta',
    'tes',
    'son',
    'sa',
    'ses',
  ];

  return message
    .toLowerCase()
    .replace(/[^\w\sàâäéèêëïîôùûüç]/g, '')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !stopWords.includes(word))
    .slice(0, 5);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, userId, conversationHistory = [] } = await req.json();

    console.log(`[SUTA] Processing message for user: ${userId}`);

    const AZURE_OPENAI_API_KEY = Deno.env.get('VITE_AZURE_OPENAI_API_KEY');
    const AZURE_OPENAI_ENDPOINT = Deno.env.get('VITE_AZURE_OPENAI_ENDPOINT');
    const AZURE_OPENAI_DEPLOYMENT_NAME = Deno.env.get('VITE_AZURE_OPENAI_DEPLOYMENT_NAME');
    const AZURE_OPENAI_API_VERSION = Deno.env.get('VITE_AZURE_OPENAI_API_VERSION');

    // Fallback response when Azure is not available
    const getFallbackResponse = (category: string, message: string) => {
      const lowerMsg = message.toLowerCase();
      
      // Réponses spécifiques selon la catégorie détectée
      switch (category) {
        case 'quartiers':
          if (lowerMsg.includes('abidjan') || lowerMsg.includes('apartment')) {
            return "🏠 Bonjour ! Je peux vous aider à trouver un appartement à Abidjan. Pour commencer, quel quartier vous intéresse le plus ? Cocody, Marcory, Yopougon, Plateau, ou un autre quartier ? N'oubliez jamais de visiter le bien avant de payer !";
          }
          return "🏘 Je peux vous aider à trouver un logement dans les différents quartiers d'Abidjan. Chaque quartier a ses particularités : Cocody (résidentiel et cher), Marcory (commercial et animé), Yopougon (abordable), Plateau (centre d'affaires). Quel type de quartier recherchez-vous ?";
          
        case 'paiement':
          if (lowerMsg.includes('prix') || lowerMsg.includes('rent')) {
            return "💰 Les loyers à Abidjan varient selon les quartiers : En moyenne, comptez entre 50 000 et 150 000 FCFA/mois pour un studio, et 80 000 à 300 000 FCFA pour un 2 pièces. Méfiez-vous des prix trop bas, c'est souvent le signe d'une arnaque !";
          }
          return "💳 Pour les paiements sécurisés, utilisez toujours la plateforme Mon Toit. Nous proposons plusieurs options : Mobile Money, carte bancaire, et portefeuille électronique. Tous les paiements sont protégés et tracés.";
          
        case 'securite':
          return "🔒 Pour éviter les arnaques : 1) Ne JAMAIS payer avant la visite physique 2) Méfiez-vous des prix anormalement bas 3) Privilégiez les visites accompagnées 4) Utilisez des paiements sécurisés via Mon Toit 5) Vérifiez toujours l'identité du propriétaire.";
          
        case 'contrat':
          return "📋 Pour les contrats de location en Côte d'Ivoire, assurez-vous d'avoir : l'identité complète du propriétaire, la description précise du bien, les conditions de paiement, et la durée du bail. Mon Toit vous aide à générer des contrats conformes à la loi ivoirienne.";
          
        case 'location':
          return "📄 Pour louer un bien à Abidjan, vous aurez besoin généralement de : pièce d'identité, justificatif de revenu, caution (équivalent à 1-2 mois de loyer), et garant si possible. Mon Toit vérifie tous les documents pour votre sécurité.";
          
        default:
          return "Bonjour ! Je suis SUTA, votre assistant immobilier pour la Côte d'Ivoire. Je peux vous aider à trouver un logement, vérifier un propriétaire, ou répondre à vos questions sur la location à Abidjan. Comment puis-je vous aider ?";
      }
    };

    // Initialize Supabase client for knowledge base
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Search knowledge base for relevant information
    let knowledgeContext = '';
    const category = detectCategory(message);
    const keywords = extractKeywords(message);

    try {
      // Search by category and keywords
      const { data: knowledgeEntries } = await supabase
        .from('suta_knowledge_base')
        .select('question, answer, category, id')
        .eq('is_active', true)
        .order('priority', { ascending: false })
        .limit(5);

      if (knowledgeEntries && knowledgeEntries.length > 0) {
        // Filter entries that match keywords or category
        const relevantEntries = knowledgeEntries
          .filter((entry: KnowledgeEntry) => {
            const entryText = `${entry.question} ${entry.answer}`.toLowerCase();
            const categoryMatch = entry.category === category;
            const keywordMatch = keywords.some((kw) => entryText.includes(kw));
            return categoryMatch || keywordMatch;
          })
          .slice(0, 3);

        if (relevantEntries.length > 0) {
          knowledgeContext = `
📚 INFORMATIONS PERTINENTES DE LA BASE DE CONNAISSANCES :
${relevantEntries
  .map(
    (entry: KnowledgeEntry) => `
Q: ${entry.question}
R: ${entry.answer}
`
  )
  .join('\n')}

Utilise ces informations si elles sont pertinentes pour répondre à la question de l'utilisateur.
`;
          console.log(`[SUTA] Found ${relevantEntries.length} relevant knowledge entries`);

          // Update usage count for used entries
          for (const entry of relevantEntries) {
            const entryWithId = entry as KnowledgeEntry & { id: string };
            await supabase
              .from('suta_knowledge_base')
              .update({ usage_count: supabase.rpc('increment_usage', { row_id: entryWithId.id }) })
              .eq('id', entryWithId.id);
          }
        }
      }

      // Log analytics
      await supabase.rpc('upsert_suta_analytics', {
        p_category: category,
        p_topic: keywords[0] || 'general',
        p_is_positive: null,
      });
    } catch (kbError) {
      console.log('[SUTA] Knowledge base lookup skipped:', kbError);
    }

    // Build enriched system prompt
    const enrichedSystemPrompt = SUTA_SYSTEM_PROMPT + knowledgeContext;

    // Build messages for API
    const messages: ChatMessage[] = [
      { role: 'system', content: enrichedSystemPrompt },
      ...conversationHistory.slice(-10).map((msg: ChatMessage) => ({
        role: msg.role,
        content: msg.content,
      })),
      { role: 'user', content: message },
    ];

    console.log(
      `[SUTA] Calling Azure OpenAI API with ${messages.length} messages, category: ${category}`
    );

    // Filter out system message for Azure OpenAI (it doesn't support system role in the same way)
    const systemMessage = messages.find((msg) => msg.role === 'system');
    const filteredMessages = messages.filter((msg) => msg.role !== 'system');

    // Add system message as first user message if it exists
    if (systemMessage) {
      filteredMessages.unshift({
        role: 'system',
        content: systemMessage.content,
      });
    }

    const response = await fetch(
      `${AZURE_OPENAI_ENDPOINT}openai/deployments/${AZURE_OPENAI_DEPLOYMENT_NAME}/chat/completions?api-version=${AZURE_OPENAI_API_VERSION}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': AZURE_OPENAI_API_KEY!,
        },
        body: JSON.stringify({
          messages: filteredMessages,
          temperature: 0.7,
          max_tokens: 800,
        }),
      }
    );
    // Try Azure OpenAI if configured
    let aiResponse = '';
    let modelUsed = 'fallback';
    let tokensUsed = 0;

    if (AZURE_OPENAI_API_KEY && AZURE_OPENAI_ENDPOINT && AZURE_OPENAI_DEPLOYMENT_NAME) {
      try {
        const response = await fetch(
          `${AZURE_OPENAI_ENDPOINT}openai/deployments/${AZURE_OPENAI_DEPLOYMENT_NAME}/chat/completions?api-version=${AZURE_OPENAI_API_VERSION}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'api-key': AZURE_OPENAI_API_KEY,
            },
            body: JSON.stringify({
              messages: filteredMessages,
              temperature: 0.7,
              max_tokens: 800,
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          aiResponse = data.choices?.[0]?.message?.content || '';
          modelUsed = AZURE_OPENAI_DEPLOYMENT_NAME;
          tokensUsed = data.usage?.total_tokens || 0;
          console.log(`[SUTA] Azure OpenAI response generated successfully`);
        } else {
          const errorText = await response.text();
          console.error(`[SUTA] Azure OpenAI API error: ${response.status}`, errorText);
          // Fall through to fallback response
        }
      } catch (azureError) {
        console.error('[SUTA] Azure OpenAI request failed:', azureError);
        // Fall through to fallback response
      }
    }

    // Use fallback if Azure didn't work
    if (!aiResponse) {
      aiResponse = getFallbackResponse(category, message);
      console.log(`[SUTA] Using fallback response for category: ${category}`);
    }

    return new Response(
      JSON.stringify({
        response: aiResponse,
        model: modelUsed,
        tokensUsed: tokensUsed,
        category: category,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[SUTA] Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        response:
          '❌ Désolé, je rencontre des difficultés techniques. Veuillez réessayer ou contacter le support.',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
