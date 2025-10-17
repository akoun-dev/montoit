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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
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
    const imagePrompt = `Generate a high-quality, professional real estate photograph of a ${baseDesc} in ${city}, Côte d'Ivoire. The image should be bright, welcoming, with blue sky, showing the exterior facade. Style: professional real estate photography, well-lit, attractive, 16:9 aspect ratio. Ultra high resolution.`;

    console.log("Generating image for property", propertyId, "with prompt:", imagePrompt);

    // Générer l'image avec Lovable AI
    const imageResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [
          {
            role: "user",
            content: imagePrompt
          }
        ],
        modalities: ["image", "text"]
      })
    });

    if (!imageResponse.ok) {
      const errorText = await imageResponse.text();
      console.error("Image generation failed:", errorText);
      
      if (imageResponse.status === 429) {
        throw new Error("Rate limit exceeded. Please try again later.");
      }
      if (imageResponse.status === 402) {
        throw new Error("Payment required. Please add credits to your Lovable AI workspace.");
      }
      
      throw new Error(`Image generation failed: ${errorText}`);
    }

    const imageData = await imageResponse.json();
    const base64Image = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!base64Image) {
      throw new Error('No image generated from AI');
    }

    // Convertir base64 en Uint8Array
    const base64Data = base64Image.split(',')[1];
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Upload vers Supabase Storage
    const fileName = `property-${propertyId}-${Date.now()}.png`;
    const { error: uploadError } = await supabase.storage
      .from('property-images')
      .upload(fileName, bytes, {
        contentType: 'image/png',
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

    console.log("Image generated successfully for property", propertyId);

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
