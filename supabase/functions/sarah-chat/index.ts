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
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
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
        .from('sarah_conversations')
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
    await supabase.from('sarah_messages').insert({
      conversation_id: currentConversationId,
      role: 'user',
      content: message
    });

    // Récupérer l'historique de la conversation
    const { data: history } = await supabase
      .from('sarah_messages')
      .select('role, content')
      .eq('conversation_id', currentConversationId)
      .order('created_at', { ascending: true });

    // Préparer les messages pour l'IA
    const messages = [
      {
        role: 'system',
        content: `Tu es Sarah, l'assistante virtuelle de Mon Toit, la plateforme de location immobilière certifiée en Côte d'Ivoire.

Tu es chaleureuse, professionnelle et empathique. Tu connais parfaitement :
- La location immobilière en Côte d'Ivoire
- Le processus de certification ANSUT (Agence Nationale de Sécurité des Usagers des TIC)
- Les différents quartiers et villes de Côte d'Ivoire (Abidjan, Yamoussoukro, etc.)
- Les types de biens disponibles (appartements, studios, villas, bureaux)

Tes responsabilités :
1. Aider les locataires à créer leur dossier de candidature
2. Guider les propriétaires dans la publication de leurs biens
3. Expliquer le processus de certification ANSUT et ses avantages
4. Répondre aux questions sur la location sécurisée
5. Orienter les utilisateurs dans l'application

Contexte technique :
- Mon Toit offre des baux certifiés ANSUT avec signature électronique
- Les locataires peuvent se faire vérifier (ONECI, CNAM, biométrie)
- Les propriétaires peuvent publier des biens avec photos, vidéos, visites 360°
- La plateforme gère les paiements mobile money et les candidatures

Ton style :
- Tutoiement amical mais professionnel
- Réponses concises et actionnables
- Utilise des emojis avec parcimonie (max 2 par message)
- Propose toujours une prochaine étape concrète

Si tu ne connais pas une information, redis-le honnêtement et propose d'autres ressources.`
      },
      ...(history || [])
    ];

    // Appeler Lovable AI avec streaming
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
        stream: true,
        temperature: 0.7,
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
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: "Service temporairement indisponible. Veuillez réessayer." 
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
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

          // Sauvegarder la réponse de l'assistant
          await supabase.from('sarah_messages').insert({
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
    console.error('Sarah chat error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Une erreur est survenue' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
