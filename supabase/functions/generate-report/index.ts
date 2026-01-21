import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MonthlyOwnerReport {
  owner: {
    id: string;
    name: string;
    email: string;
  };
  period: {
    start: string;
    end: string;
    label: string;
  };
  summary: {
    total_properties: number;
    total_views: number;
    total_favorites: number;
    total_applications: number;
    total_revenue: number;
    occupied_properties: number;
    vacant_properties: number;
    occupancy_rate: number;
    avg_conversion_rate: number;
  };
  properties_performance: Array<{
    id: string;
    title: string;
    views: number;
    favorites: number;
    applications: number;
    conversion_rate: number;
    revenue: number;
    status: string;
    days_vacant?: number;
  }>;
  applications_breakdown: {
    pending: number;
    approved: number;
    rejected: number;
    withdrawn: number;
  };
  market_insights: {
    avg_market_rent: number;
    your_avg_rent: number;
    price_positioning: 'above' | 'below' | 'at_market';
  };
  recommendations: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { mode, owner_id, start_date, end_date, report_type = 'monthly', scheduled = false } = await req.json();

    console.log(`[generate-report] Mode: ${mode}, Type: ${report_type}, Scheduled: ${scheduled}`);

    const period = calculatePeriod(start_date, end_date, report_type);
    console.log(`[generate-report] Period: ${period.start} to ${period.end}`);

    const owners = mode === 'auto' 
      ? await getActiveOwners(supabaseAdmin)
      : [{ id: owner_id }];

    console.log(`[generate-report] Processing ${owners.length} owners`);

    let successCount = 0;
    let failureCount = 0;

    for (const owner of owners) {
      try {
        console.log(`[generate-report] Generating report for owner ${owner.id}`);

        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('full_name, email')
          .eq('id', owner.id)
          .single();

        if (!profile?.email) {
          console.warn(`[generate-report] Owner ${owner.id} has no email, skipping`);
          continue;
        }

        const { data: properties } = await supabaseAdmin
          .from('properties')
          .select('*')
          .eq('owner_id', owner.id);

        if (!properties || properties.length === 0) {
          console.log(`[generate-report] Owner ${owner.id} has no properties, skipping`);
          continue;
        }

        const propertyIds = properties.map(p => p.id);

        const [viewsData, favoritesData, applicationsData, revenueData] = await Promise.all([
          getPropertyViews(supabaseAdmin, propertyIds, period),
          getFavorites(supabaseAdmin, propertyIds, period),
          getApplications(supabaseAdmin, propertyIds, period),
          getRevenue(supabaseAdmin, owner.id, period)
        ]);

        const summary = calculateSummary(properties, viewsData, applicationsData, revenueData);
        const propertiesPerformance = buildPropertiesPerformance(properties, viewsData, favoritesData, applicationsData);
        const applicationsBreakdown = buildApplicationsBreakdown(applicationsData);
        const marketInsights = await getMarketInsights(supabaseAdmin, properties);
        const recommendations = generateRecommendations(summary, marketInsights, propertiesPerformance);

        const report: MonthlyOwnerReport = {
          owner: {
            id: owner.id,
            name: profile.full_name,
            email: profile.email
          },
          period,
          summary,
          properties_performance: propertiesPerformance,
          applications_breakdown: applicationsBreakdown,
          market_insights: marketInsights,
          recommendations
        };

        const { data: savedReport, error: saveError } = await supabaseAdmin
          .from('report_history')
          .insert({
            owner_id: owner.id,
            report_type,
            period_start: period.start,
            period_end: period.end,
            generated_by: mode === 'auto' ? null : req.headers.get('user-id'),
            sent_status: 'pending',
            report_data: report
          })
          .select()
          .single();

        if (saveError) {
          console.error(`[generate-report] Failed to save report for ${owner.id}:`, saveError);
          failureCount++;
          continue;
        }

        console.log(`[generate-report] Sending email to ${profile.email}`);
        const { data: emailResult, error: emailError } = await supabaseAdmin.functions.invoke('send-email', {
          body: {
            to: profile.email,
            subject: `📊 Rapport ${report_type === 'monthly' ? 'mensuel' : report_type === 'quarterly' ? 'trimestriel' : 'annuel'} - ${period.label}`,
            template: 'monthly-report',
            data: { report }
          }
        });

        if (emailError) {
          console.error(`[generate-report] Email failed for ${owner.id}:`, emailError);
          await supabaseAdmin
            .from('report_history')
            .update({ 
              sent_status: 'failed',
              error_message: emailError.message
            })
            .eq('id', savedReport.id);
          failureCount++;
        } else {
          console.log(`[generate-report] Email sent successfully to ${profile.email}`);
          await supabaseAdmin
            .from('report_history')
            .update({ 
              sent_status: 'sent',
              email_sent_at: new Date().toISOString()
            })
            .eq('id', savedReport.id);
          successCount++;
        }

      } catch (ownerError) {
        console.error(`[generate-report] Failed to process owner ${owner.id}:`, ownerError);
        failureCount++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: owners.length,
        successful: successCount,
        failed: failureCount,
        period
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[generate-report] Fatal error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function calculatePeriod(startDate?: string, endDate?: string, reportType = 'monthly') {
  const now = new Date();
  let start: Date;
  let end: Date;
  let label: string;

  if (startDate && endDate) {
    start = new Date(startDate);
    end = new Date(endDate);
    label = `${start.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })} - ${end.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`;
  } else if (reportType === 'monthly') {
    start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    label = start.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  } else if (reportType === 'quarterly') {
    const quarter = Math.floor((now.getMonth() - 1) / 3);
    start = new Date(now.getFullYear(), quarter * 3, 1);
    end = new Date(now.getFullYear(), (quarter + 1) * 3, 0, 23, 59, 59);
    label = `Q${quarter + 1} ${start.getFullYear()}`;
  } else {
    start = new Date(now.getFullYear() - 1, 0, 1);
    end = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);
    label = `${start.getFullYear()}`;
  }

  return {
    start: start.toISOString(),
    end: end.toISOString(),
    label
  };
}

async function getActiveOwners(supabase: any) {
  const { data } = await supabase
    .from('properties')
    .select('owner_id')
    .not('owner_id', 'is', null);

  const uniqueOwners = [...new Set(data?.map((p: any) => p.owner_id) || [])];
  return uniqueOwners.map(id => ({ id }));
}

async function getPropertyViews(supabase: any, propertyIds: string[], period: any) {
  const { data } = await supabase
    .from('search_history')
    .select('property_id')
    .in('property_id', propertyIds)
    .gte('created_at', period.start)
    .lte('created_at', period.end);

  const viewsMap = new Map<string, number>();
  data?.forEach((item: any) => {
    viewsMap.set(item.property_id, (viewsMap.get(item.property_id) || 0) + 1);
  });
  return viewsMap;
}

async function getFavorites(supabase: any, propertyIds: string[], period: any) {
  const { data } = await supabase
    .from('user_favorites')
    .select('property_id')
    .in('property_id', propertyIds)
    .gte('created_at', period.start)
    .lte('created_at', period.end);

  const favoritesMap = new Map<string, number>();
  data?.forEach((item: any) => {
    favoritesMap.set(item.property_id, (favoritesMap.get(item.property_id) || 0) + 1);
  });
  return favoritesMap;
}

async function getApplications(supabase: any, propertyIds: string[], period: any) {
  const { data } = await supabase
    .from('rental_applications')
    .select('*')
    .in('property_id', propertyIds)
    .gte('created_at', period.start)
    .lte('created_at', period.end);

  return data || [];
}

async function getRevenue(supabase: any, ownerId: string, period: any) {
  const { data } = await supabase
    .from('payments')
    .select('amount')
    .eq('receiver_id', ownerId)
    .eq('status', 'completed')
    .gte('created_at', period.start)
    .lte('created_at', period.end);

  return data?.reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0;
}

function calculateSummary(properties: any[], viewsMap: Map<string, number>, applications: any[], revenue: number) {
  const totalViews = Array.from(viewsMap.values()).reduce((sum, v) => sum + v, 0);
  const occupiedProperties = properties.filter(p => p.status === 'loué').length;
  const vacantProperties = properties.filter(p => p.status === 'disponible').length;
  const occupancyRate = properties.length > 0 ? (occupiedProperties / properties.length) * 100 : 0;
  
  const totalApplications = applications.length;
  const avgConversionRate = totalViews > 0 ? (totalApplications / totalViews) * 100 : 0;

  return {
    total_properties: properties.length,
    total_views: totalViews,
    total_favorites: 0,
    total_applications: totalApplications,
    total_revenue: revenue,
    occupied_properties: occupiedProperties,
    vacant_properties: vacantProperties,
    occupancy_rate: Math.round(occupancyRate * 10) / 10,
    avg_conversion_rate: Math.round(avgConversionRate * 10) / 10
  };
}

function buildPropertiesPerformance(properties: any[], viewsMap: Map<string, number>, favoritesMap: Map<string, number>, applications: any[]) {
  return properties.map((prop: any) => {
    const views = viewsMap.get(prop.id) || 0;
    const favorites = favoritesMap.get(prop.id) || 0;
    const propApplications = applications.filter((a: any) => a.property_id === prop.id);
    const conversionRate = views > 0 ? (propApplications.length / views) * 100 : 0;

    return {
      id: prop.id,
      title: prop.title,
      views,
      favorites,
      applications: propApplications.length,
      conversion_rate: Math.round(conversionRate * 10) / 10,
      revenue: 0,
      status: prop.status,
      days_vacant: prop.status === 'disponible' ? Math.floor((Date.now() - new Date(prop.created_at).getTime()) / (1000 * 60 * 60 * 24)) : undefined
    };
  }).sort((a: any, b: any) => b.views - a.views);
}

function buildApplicationsBreakdown(applications: any[]) {
  return {
    pending: applications.filter((a: any) => a.status === 'pending').length,
    approved: applications.filter((a: any) => a.status === 'approved').length,
    rejected: applications.filter((a: any) => a.status === 'rejected').length,
    withdrawn: applications.filter((a: any) => a.status === 'withdrawn').length
  };
}

async function getMarketInsights(supabase: any, properties: any[]): Promise<{
  avg_market_rent: number;
  your_avg_rent: number;
  price_positioning: 'above' | 'below' | 'at_market';
}> {
  if (properties.length === 0) {
    return {
      avg_market_rent: 0,
      your_avg_rent: 0,
      price_positioning: 'at_market'
    };
  }

  const city = properties[0]?.city;
  const { data: marketProps } = await supabase
    .from('properties')
    .select('monthly_rent')
    .eq('city', city)
    .eq('moderation_status', 'approved')
    .not('monthly_rent', 'is', null);

  const avgMarketRent = marketProps?.length > 0
    ? marketProps.reduce((sum: number, p: any) => sum + Number(p.monthly_rent), 0) / marketProps.length
    : 0;

  const yourAvgRent = properties.reduce((sum: number, p: any) => sum + Number(p.monthly_rent || 0), 0) / properties.length;

  const diff = yourAvgRent - avgMarketRent;
  const positioning: 'above' | 'below' | 'at_market' = Math.abs(diff) < avgMarketRent * 0.05 
    ? 'at_market' 
    : diff > 0 
      ? 'above' 
      : 'below';

  return {
    avg_market_rent: Math.round(avgMarketRent),
    your_avg_rent: Math.round(yourAvgRent),
    price_positioning: positioning
  };
}

function generateRecommendations(summary: any, market: any, properties: any[]): string[] {
  const recommendations: string[] = [];

  if (summary.occupancy_rate < 70) {
    recommendations.push("Votre taux d'occupation est faible. Envisagez de revoir vos prix ou d'améliorer vos photos.");
  }

  if (summary.avg_conversion_rate < 5) {
    recommendations.push("Peu de vues se convertissent en candidatures. Vérifiez la qualité des descriptions et des visuels.");
  }

  if (market.price_positioning === 'above' && summary.total_views < 50) {
    recommendations.push("Vos prix sont au-dessus du marché avec peu de vues. Considérez un ajustement tarifaire.");
  }

  const lowViewProps = properties.filter((p: any) => p.views < 10);
  if (lowViewProps.length > 0) {
    recommendations.push(`${lowViewProps.length} propriété(s) ont moins de 10 vues. Optimisez leur visibilité.`);
  }

  const longVacant = properties.filter((p: any) => p.days_vacant && p.days_vacant > 90);
  if (longVacant.length > 0) {
    recommendations.push(`${longVacant.length} propriété(s) sont vacantes depuis plus de 3 mois. Analysez les causes.`);
  }

  return recommendations;
}
