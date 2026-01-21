import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, conversationId, sessionId } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Récupérer ou créer la conversation
    let currentConversationId = conversationId;
    
    if (!currentConversationId) {
      const authHeader = req.headers.get('Authorization');
      let userId = null;
      
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabase.auth.getUser(token);
        userId = user?.id || null;
      }

      const { data: conversation, error: convError } = await supabase
        .from('suta_conversations')
        .insert({
          user_id: userId,
          session_id: sessionId || crypto.randomUUID()
        })
        .select()
        .single();

      if (convError) throw convError;
      currentConversationId = conversation.id;
    }

    // Sauvegarder le message utilisateur
    await supabase.from('suta_messages').insert({
      conversation_id: currentConversationId,
      role: 'user',
      content: message
    });

    // Récupérer l'historique de la conversation
    const { data: history } = await supabase
      .from('suta_messages')
      .select('role, content')
      .eq('conversation_id', currentConversationId)
      .order('created_at', { ascending: true });

    // Préparer les messages pour l'IA avec le prompt SUTA
    const messages = [
      {
        role: 'system',
        content: `Tu es SUTA (Smart User Technology Assistant), l'assistant virtuel intelligent de Mon Toit, la plateforme de location immobilière certifiée ANSUT en Côte d'Ivoire.

Tu es professionnel, chaleureux et expert en immobilier ivoirien. Tu connais parfaitement :
- La location immobilière en Côte d'Ivoire (lois, pratiques, quartiers)
- Le processus de certification ANSUT (Agence Nationale de Sécurité des Usagers des TIC)
- Les différents quartiers et villes de Côte d'Ivoire (Abidjan, Yamoussoukro, Bouaké, etc.)
- Les types de biens disponibles (appartements, studios, villas, bureaux, commerces)
- Les prix du marché immobilier ivoirien

Tes responsabilités :
1. Aider les locataires à créer leur dossier de candidature complet
2. Guider les propriétaires dans la publication et la gestion de leurs biens
3. Expliquer le processus de certification ANSUT et ses avantages sécuritaires
4. Répondre aux questions sur la location sécurisée et les baux certifiés
5. Orienter les utilisateurs dans l'utilisation de la plateforme Mon Toit

Contexte technique de Mon Toit :
- Baux certifiés ANSUT avec signature électronique CryptoNeo
- Vérification d'identité des locataires (Smile ID, biométrie faciale, CNI)
- Publication de biens avec photos, vidéos, visites virtuelles 360°
- Gestion des paiements Mobile Money (Orange Money, MTN, Moov)
- Système de candidatures et de notation des locataires
- Alertes de propriétés personnalisées

Ton style de communication :
- Tutoiement amical mais professionnel (style ivoirien moderne)
- Réponses concises, claires et actionnables
- Utilise des emojis avec parcimonie (max 2 par message)
- Propose toujours une prochaine étape concrète
- Adapte ton langage au contexte ivoirien (nouchi acceptable si approprié)

Si tu ne connais pas une information précise, redis-le honnêtement et propose de rediriger vers le support ou d'autres ressources.

Rappelle-toi : tu es SUTA, pas Sarah. Ton nom vient de Smart User Technology Assistant.`
      },
      ...(history || [])
    ];

    // Appeler OpenAI GPT-4o-mini avec streaming
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        stream: true,
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: "Trop de demandes. Merci de patienter un instant." 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 401) {
        return new Response(JSON.stringify({ 
          error: "Clé API invalide. Veuillez contacter l'administrateur." 
        }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      const errorText = await response.text();
      console.error('OpenAI error:', response.status, errorText);
      throw new Error('Erreur de communication avec l\'IA');
    }

    // Stream la réponse
    const reader = response.body?.getReader();
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    let fullResponse = '';

    const stream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader!.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') continue;

                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content;
                  
                  if (content) {
                    fullResponse += content;
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                      content, 
                      conversationId: currentConversationId 
                    })}\n\n`));
                  }
                } catch (e) {
                  // Ignore parse errors
                }
              }
            }
          }

          // Sauvegarder la réponse de SUTA
          await supabase.from('suta_messages').insert({
            conversation_id: currentConversationId,
            role: 'assistant',
            content: fullResponse
          });

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('SUTA chat error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Une erreur est survenue' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

