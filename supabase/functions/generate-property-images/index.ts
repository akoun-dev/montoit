import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { propertyId, propertyType, city } = await req.json();

    if (!propertyId || !propertyType || !city) {
      throw new Error("Missing required fields");
    }

    // Créer le prompt pour la génération d'image
    const typeDescriptions: Record<string, string> = {
      'appartement': 'modern apartment building exterior with balconies',
      'villa': 'luxury villa with garden and modern architecture',
      'studio': 'contemporary studio apartment building',
      'duplex': 'elegant duplex residence with two floors',
      'maison': 'beautiful family house with yard'
    };

    const baseDesc = typeDescriptions[propertyType] || 'residential property';
    const imagePrompt = `A high-quality, professional real estate photograph of a ${baseDesc} in ${city}, Côte d'Ivoire. The image should be bright, welcoming, with blue sky, showing the exterior facade. Style: professional real estate photography, well-lit, attractive, photorealistic, ultra high resolution.`;

    console.log("Generating image for property", propertyId, "with DALL-E 3");

    // Générer l'image avec OpenAI DALL-E 3
    const imageResponse = await fetch(
      "https://api.openai.com/v1/images/generations",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "dall-e-3",
          prompt: imagePrompt,
          n: 1,
          size: "1024x1024",
          quality: "hd", // Haute qualité pour les photos immobilières
          response_format: "url"
        })
      }
    );

    if (!imageResponse.ok) {
      const errorText = await imageResponse.text();
      console.error("Image generation failed:", errorText);
      
      if (imageResponse.status === 429) {
        throw new Error("Rate limit exceeded. Please try again later.");
      }
      if (imageResponse.status === 401) {
        throw new Error("Invalid OpenAI API key. Please contact administrator.");
      }
      
      throw new Error(`Image generation failed: ${errorText}`);
    }

    const imageData = await imageResponse.json();
    
    // DALL-E 3 retourne l'URL de l'image générée
    const imageUrl = imageData.data?.[0]?.url;

    if (!imageUrl) {
      throw new Error('No image URL returned from DALL-E 3');
    }

    console.log("Image generated successfully, downloading...");

    // Télécharger l'image depuis l'URL OpenAI
    const downloadResponse = await fetch(imageUrl);
    if (!downloadResponse.ok) {
      throw new Error("Failed to download generated image");
    }

    const imageBlob = await downloadResponse.blob();
    const imageBuffer = await imageBlob.arrayBuffer();
    const imageBytes = new Uint8Array(imageBuffer);

    // Upload vers Supabase Storage
    const fileName = `property-${propertyId}-${Date.now()}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from('property-images')
      .upload(fileName, imageBytes, {
        contentType: 'image/jpeg',
        upsert: false
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // Obtenir l'URL publique
    const { data: urlData } = supabase.storage
      .from('property-images')
      .getPublicUrl(fileName);

    // Mettre à jour la propriété
    const { error: updateError } = await supabase
      .from('properties')
      .update({ main_image: urlData.publicUrl })
      .eq('id', propertyId);

    if (updateError) {
      console.error("Update error:", updateError);
      throw new Error(`Failed to update property: ${updateError.message}`);
    }

    console.log("Image generated successfully with DALL-E 3 for property", propertyId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        imageUrl: urlData.publicUrl 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error("Error in generate-property-images:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || "Unknown error occurred" 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

