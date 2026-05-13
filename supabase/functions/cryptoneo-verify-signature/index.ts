import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CRYPTONEO_BASE_URL = Deno.env.get('CRYPTONEO_BASE_URL');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { operationId } = await req.json();

    if (!operationId) {
      return new Response(
        JSON.stringify({ error: 'Operation ID requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🔍 Vérification signature CryptoNeo - Operation ID:', operationId);

    // 1. Get JWT token from auth function
    const authResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/cryptoneo-auth`, {
      headers: {
        Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
      }
    });

    if (!authResponse.ok) {
      return new Response(
        JSON.stringify({ error: 'Échec authentification CryptoNeo' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { token: jwt } = await authResponse.json();

    // 2. Call CryptoNeo verifySignedBatch API
    const verifyResponse = await fetch(`${CRYPTONEO_BASE_URL}/sign/verifySignedBatch`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ operationId })
    });

    if (!verifyResponse.ok) {
      const error = await verifyResponse.text();
      console.error('CryptoNeo verification failed:', error);
      return new Response(
        JSON.stringify({ error: 'Échec vérification signature CryptoNeo' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const verifyData = await verifyResponse.json();
    console.log('CryptoNeo verification response:', verifyData);

    // CryptoNeo retourne statusCode 7004 pour succès
    if (verifyData.statusCode === 7004) {
      const results = verifyData.data?.results || [];

      // Traiter les résultats
      const completedDocs = results.filter((r: Record<string, unknown>) => r.statusCode === 7000);
      const failedDocs = results.filter((r: Record<string, unknown>) => r.statusCode !== 7000);

      // Trouver le contrat par operationId
      const { data: contract } = await supabaseAdmin
        .from('lease_contracts')
        .select('*')
        .eq('cryptoneo_operation_id', operationId)
        .single();

      if (contract) {
        // Télécharger et stocker les documents signés
        const signedDocumentUrls: string[] = [];

        for (const result of completedDocs) {
          if (result.data?.fileName && result.data?.downloadUrl) {
            try {
              // Télécharger le PDF signé
              const pdfResponse = await fetch(result.data.downloadUrl);
              if (!pdfResponse.ok) {
                console.error('Failed to download signed PDF:', result.data.fileName);
                continue;
              }

              const pdfBlob = await pdfResponse.blob();
              const pdfBuffer = await pdfBlob.arrayBuffer();

              // Upload vers Supabase Storage
              const fileName = `contracts/${contract.id}_signed_${Date.now()}.pdf`;
              const { error: uploadError } = await supabaseAdmin.storage
                .from('contract-documents')
                .upload(fileName, pdfBuffer, {
                  contentType: 'application/pdf',
                  upsert: true
                });

              if (uploadError) {
                console.error('Error uploading signed PDF:', uploadError);
                continue;
              }

              // Récupérer l'URL publique
              const { data: urlData } = supabaseAdmin.storage
                .from('contract-documents')
                .getPublicUrl(fileName);

              signedDocumentUrls.push(urlData.publicUrl);
            } catch (err) {
              console.error('Error processing signed document:', err);
            }
          }
        }

        // Mettre à jour le contrat
        const updateData: Record<string, unknown> = {
          cryptoneo_signature_status: 'completed',
          cryptoneo_callback_received_at: new Date().toISOString(),
        };

        if (signedDocumentUrls.length > 0) {
          updateData.cryptoneo_signed_document_url = signedDocumentUrls[0]; // Premier document comme principal
          updateData.document_url = signedDocumentUrls[0]; // Mettre à jour l'URL du document
        }

        if (failedDocs.length === 0) {
          // Tous les documents sont signés avec succès
          updateData.cryptoneo_all_signed = true;
        }

        await supabaseAdmin
          .from('lease_contracts')
          .update(updateData)
          .eq('id', contract.id);

        // Créer les notifications
        if (signedDocumentUrls.length > 0) {
          await supabaseAdmin.from('notifications').insert([
            {
              user_id: contract.owner_id,
              type: 'contract_electronically_signed',
              category: 'contract',
              title: 'Contrat signé électroniquement',
              message: 'Le contrat a été signé électroniquement avec succès via CryptoNeo.',
              link: `/proprietaire/mes-contrats/${contract.id}`
            },
            {
              user_id: contract.tenant_id,
              type: 'contract_electronically_signed',
              category: 'contract',
              title: 'Contrat signé électroniquement',
              message: 'Le contrat a été signé électroniquement avec succès via CryptoNeo.',
              link: `/locataire/mes-contrats/${contract.id}`
            }
          ]);
        }

        // Log dans les audits
        await supabaseAdmin.from('admin_audit_logs').insert({
          admin_id: contract.owner_id,
          action_type: 'contract_electronically_signed',
          target_type: 'lease_contract',
          target_id: contract.id,
          notes: `Signature CryptoNeo réussie - ${completedDocs.length}/${results.length} documents signés - Operation: ${operationId}`
        });

        console.log('✅ Signature vérifiée avec succès pour contrat:', contract.id);

        return new Response(
          JSON.stringify({
            success: true,
            statusCode: 7004,
            data: {
              operationId,
              results,
              signedDocumentUrls,
              completed: completedDocs.length,
              total: results.length
            },
            message: 'Signature vérifiée avec succès'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      } else {
        // Aucun contrat trouvé pour cet operationId
        console.warn('Aucun contrat trouvé pour operationId:', operationId);

        return new Response(
          JSON.stringify({
            success: true,
            statusCode: verifyData.statusCode,
            data: verifyData.data,
            message: 'Aucun contrat trouvé pour cet operationId'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else if (verifyData.statusCode === 7005) {
      // Signature en cours
      console.log('⏳ Signature en cours pour operationId:', operationId);

      return new Response(
        JSON.stringify({
          success: true,
          statusCode: 7005,
          message: 'Signature en cours de traitement'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Erreur
      return new Response(
        JSON.stringify({
          error: verifyData.statusMessage || 'Erreur lors de la vérification',
          statusCode: verifyData.statusCode
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Error in cryptoneo-verify-signature:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
