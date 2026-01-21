import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface GenerateRequest {
  dataType: 'profile' | 'property' | 'document' | 'conversation' | 'payment' | 'complete_scenario';
  params?: {
    gender?: 'male' | 'female';
    documentType?: 'CNI' | 'passport' | 'attestation';
    monthlyRent?: number;
    months?: number;
  };
}

async function getRandomIvoirianName(supabase: any, gender: string | null = null) {
  const { data, error } = await supabase.rpc('get_random_ivorian_name', {
    p_gender: gender,
  });
  if (error) throw error;
  return data;
}

async function callAzureOpenAI(messages: any[], operation: string = 'generate') {
  const endpoint = Deno.env.get('AZURE_OPENAI_ENDPOINT');
  const apiKey = Deno.env.get('AZURE_OPENAI_API_KEY');
  const deploymentName = Deno.env.get('AZURE_OPENAI_DEPLOYMENT_NAME');
  const apiVersion = Deno.env.get('AZURE_OPENAI_API_VERSION') || '2024-08-01-preview';

  const url = `${endpoint}openai/deployments/${deploymentName}/chat/completions?api-version=${apiVersion}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey!,
    },
    body: JSON.stringify({
      messages,
      temperature: 0.9,
      max_tokens: 1500,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Azure OpenAI error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return {
    content: data.choices[0].message.content,
    tokens: data.usage?.total_tokens || 0,
  };
}

async function generateTestProfile(supabase: any, userId: string, gender: string | null) {
  const name = await getRandomIvoirianName(supabase, gender);

  const { data: template } = await supabase
    .from('test_data_templates')
    .select('*')
    .eq('template_type', 'profile')
    .eq('active', true)
    .maybeSingle();

  if (!template) {
    throw new Error('Template de profil non trouvé');
  }

  const rules = template.generation_rules;
  const age = Math.floor(Math.random() * (rules.age_range.max - rules.age_range.min + 1)) + rules.age_range.min;
  const income = Math.floor(Math.random() * (rules.income_range.max - rules.income_range.min + 1)) + rules.income_range.min;

  const aiPrompt = `${template.ai_prompt}

Utilise ces informations de base:
- Nom: ${name.first_name} ${name.last_name}
- Genre: ${name.gender === 'male' ? 'Homme' : 'Femme'}
- Groupe ethnique: ${name.ethnic_group}
- Âge: ${age} ans
- Revenu mensuel: ${income} FCFA

Génère un profil complet et cohérent en JSON strictement conforme à cette structure:
{
  "professional_info": {
    "occupation": "string",
    "employer": "string",
    "monthly_income": number,
    "employment_duration_years": number
  },
  "family_info": {
    "marital_status": "string",
    "children_count": number
  },
  "housing_preferences": {
    "preferred_neighborhoods": ["string"],
    "property_type": "string",
    "budget_min": number,
    "budget_max": number
  },
  "rental_history": [
    {
      "address": "string",
      "neighborhood": "string",
      "duration_months": number,
      "monthly_rent": number
    }
  ]
}`;

  const aiResponse = await callAzureOpenAI([
    {
      role: 'system',
      content: 'Tu es un expert en génération de données de test réalistes pour la Côte d\'Ivoire. Réponds UNIQUEMENT en JSON valide, sans markdown ni texte additionnel.',
    },
    {
      role: 'user',
      content: aiPrompt,
    },
  ], 'generate_test_profile');

  let aiData;
  try {
    const cleanedResponse = aiResponse.content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    aiData = JSON.parse(cleanedResponse);
  } catch (e) {
    console.error('Failed to parse AI response:', aiResponse.content);
    throw new Error('Invalid JSON from AI');
  }

  const phoneNumber = `+225 ${Math.floor(Math.random() * 90000000) + 10000000}`;
  const email = `${name.first_name.toLowerCase()}.${name.last_name.toLowerCase()}@test.montoit.ci`;

  const profile = {
    personal_info: {
      first_name: name.first_name,
      last_name: name.last_name,
      full_name: `${name.first_name} ${name.last_name}`,
      age,
      gender: name.gender,
      ethnic_group: name.ethnic_group,
      phone: phoneNumber,
      email,
    },
    professional_info: aiData.professional_info,
    family_info: aiData.family_info,
    housing_preferences: aiData.housing_preferences,
    rental_history: aiData.rental_history || [],
  };

  await supabase.rpc('save_generated_test_data', {
    p_template_id: template.id,
    p_data_type: 'profile',
    p_generated_data: profile,
    p_ai_tokens_used: aiResponse.tokens,
    p_generated_by: userId,
  });

  return profile;
}

async function generateTestProperty(supabase: any, userId: string) {
  const { data: template } = await supabase
    .from('test_data_templates')
    .select('*')
    .eq('template_type', 'property')
    .eq('active', true)
    .maybeSingle();

  if (!template) {
    throw new Error('Template de propriété non trouvé');
  }

  const rules = template.generation_rules;
  const propertyType = rules.property_types[Math.floor(Math.random() * rules.property_types.length)];
  const quartier = rules.quartiers[Math.floor(Math.random() * rules.quartiers.length)];
  const priceRange = rules.price_ranges[propertyType];
  const monthlyRent = Math.floor(Math.random() * (priceRange.max - priceRange.min + 1)) + priceRange.min;

  const aiPrompt = `${template.ai_prompt}

Génère pour:
- Type: ${propertyType}
- Quartier: ${quartier}, Abidjan
- Loyer: ${monthlyRent} FCFA/mois

Retourne un JSON avec cette structure exacte:
{
  "title": "string",
  "description": "string",
  "property_type": "string",
  "neighborhood": "string",
  "address": "string",
  "monthly_rent": number,
  "surface_area": number,
  "rooms": number,
  "amenities": ["string"],
  "nearby_places": ["string"],
  "photos_description": ["string"]
}`;

  const aiResponse = await callAzureOpenAI([
    {
      role: 'system',
      content: 'Tu es un expert immobilier ivoirien. Génère des annonces réalistes pour Abidjan. Réponds UNIQUEMENT en JSON valide.',
    },
    {
      role: 'user',
      content: aiPrompt,
    },
  ], 'generate_test_property');

  let property;
  try {
    const cleanedResponse = aiResponse.content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    property = JSON.parse(cleanedResponse);
  } catch (e) {
    console.error('Failed to parse AI response:', aiResponse.content);
    throw new Error('Invalid JSON from AI');
  }

  await supabase.rpc('save_generated_test_data', {
    p_template_id: template.id,
    p_data_type: 'property',
    p_generated_data: property,
    p_ai_tokens_used: aiResponse.tokens,
    p_generated_by: userId,
  });

  return property;
}

async function generateTestDocument(supabase: any, userId: string, documentType: string, name?: any) {
  const personName = name || await getRandomIvoirianName(supabase, null);

  const { data: template } = await supabase
    .from('test_data_templates')
    .select('*')
    .eq('template_type', 'document')
    .eq('active', true)
    .maybeSingle();

  if (!template) {
    throw new Error('Template de document non trouvé');
  }

  const rules = template.generation_rules;
  const commune = rules.communes[Math.floor(Math.random() * rules.communes.length)];

  const birthYear = 2024 - (Math.floor(Math.random() * 40) + 20);
  const birthMonth = Math.floor(Math.random() * 12) + 1;
  const birthDay = Math.floor(Math.random() * 28) + 1;
  const dateOfBirth = `${birthYear}-${birthMonth.toString().padStart(2, '0')}-${birthDay.toString().padStart(2, '0')}`;

  const issueDate = new Date();
  issueDate.setFullYear(issueDate.getFullYear() - Math.floor(Math.random() * 3));
  const expiryDate = new Date(issueDate);
  expiryDate.setFullYear(expiryDate.getFullYear() + 10);

  const documentNumber = `CI${Math.floor(Math.random() * 9000000000) + 1000000000}`;

  const document = {
    document_type: documentType,
    document_number: documentNumber,
    personal_info: {
      first_name: personName.first_name,
      last_name: personName.last_name,
      date_of_birth: dateOfBirth,
      place_of_birth: commune,
      gender: personName.gender === 'male' ? 'M' : 'F',
    },
    issue_date: issueDate.toISOString().split('T')[0],
    expiry_date: expiryDate.toISOString().split('T')[0],
    watermark: {
      text: 'COPIE NON CONFORME - DOCUMENT DE TEST',
      style: rules.watermark_style,
    },
  };

  await supabase.rpc('save_generated_test_data', {
    p_template_id: template.id,
    p_data_type: 'document',
    p_generated_data: document,
    p_ai_tokens_used: 50,
    p_generated_by: userId,
  });

  return document;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile || profile.user_type !== 'admin_ansut') {
      throw new Error('Admin access required');
    }

    const requestData: GenerateRequest = await req.json();

    let result;

    switch (requestData.dataType) {
      case 'profile':
        result = await generateTestProfile(supabase, user.id, requestData.params?.gender || null);
        break;

      case 'property':
        result = await generateTestProperty(supabase, user.id);
        break;

      case 'document':
        result = await generateTestDocument(supabase, user.id, requestData.params?.documentType || 'CNI');
        break;

      case 'complete_scenario': {
        const tenant = await generateTestProfile(supabase, user.id, null);
        const landlord = await generateTestProfile(supabase, user.id, null);
        const property = await generateTestProperty(supabase, user.id);

        const tenantName = {
          first_name: tenant.personal_info.first_name,
          last_name: tenant.personal_info.last_name,
          gender: tenant.personal_info.gender,
          ethnic_group: tenant.personal_info.ethnic_group,
        };

        const landlordName = {
          first_name: landlord.personal_info.first_name,
          last_name: landlord.personal_info.last_name,
          gender: landlord.personal_info.gender,
          ethnic_group: landlord.personal_info.ethnic_group,
        };

        const tenantDoc = await generateTestDocument(supabase, user.id, 'CNI', tenantName);
        const landlordDoc = await generateTestDocument(supabase, user.id, 'CNI', landlordName);

        result = {
          tenant,
          landlord,
          property,
          tenantDocument: tenantDoc,
          landlordDocument: landlordDoc,
        };
        break;
      }

      default:
        throw new Error(`Unsupported data type: ${requestData.dataType}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: result,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error generating test data:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
