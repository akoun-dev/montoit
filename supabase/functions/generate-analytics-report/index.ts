Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { reportType, userId, startDate, endDate, config } = await req.json();

    if (!reportType || !userId || !startDate || !endDate) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialisation Supabase client (utilise automatiquement les env vars)
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ error: 'Supabase configuration missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const headers_supabase = {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
    };

    // Générer le rapport selon le type
    let reportData: any = {};

    switch (reportType) {
      case 'property_performance':
        reportData = await generatePropertyPerformanceReport(
          supabaseUrl,
          headers_supabase,
          userId,
          startDate,
          endDate
        );
        break;

      case 'financial':
        reportData = await generateFinancialReport(
          supabaseUrl,
          headers_supabase,
          userId,
          startDate,
          endDate
        );
        break;

      case 'market_analysis':
        reportData = await generateMarketAnalysisReport(
          supabaseUrl,
          headers_supabase,
          startDate,
          endDate
        );
        break;

      case 'platform_admin':
        reportData = await generatePlatformAdminReport(
          supabaseUrl,
          headers_supabase,
          startDate,
          endDate
        );
        break;

      default:
        return new Response(
          JSON.stringify({ error: 'Unknown report type' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    // Retourner les données du rapport
    return new Response(
      JSON.stringify({ data: reportData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating report:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Rapport de performance des propriétés
async function generatePropertyPerformanceReport(
  supabaseUrl: string,
  headers: any,
  userId: string,
  startDate: string,
  endDate: string
) {
  // Récupérer les propriétés du propriétaire
  const propertiesRes = await fetch(
    `${supabaseUrl}/rest/v1/properties?owner_id=eq.${userId}&select=*`,
    { headers }
  );
  const properties = await propertiesRes.json();

  // Récupérer les statistiques pour chaque propriété
  const propertyStats = await Promise.all(
    properties.map(async (property: any) => {
      const statsRes = await fetch(
        `${supabaseUrl}/rest/v1/property_statistics?property_id=eq.${property.id}&date=gte.${startDate}&date=lte.${endDate}&select=*`,
        { headers }
      );
      const stats = await statsRes.json();

      const totalViews = stats.reduce((sum: number, s: any) => sum + s.total_views, 0);
      const uniqueViews = stats.reduce((sum: number, s: any) => sum + s.unique_views, 0);
      const favorites = stats.reduce((sum: number, s: any) => sum + s.favorites_added, 0);
      const applications = stats.reduce((sum: number, s: any) => sum + s.applications, 0);

      return {
        propertyId: property.id,
        propertyTitle: property.title,
        propertyCity: property.city,
        totalViews,
        uniqueViews,
        favorites,
        applications,
        conversionRate: totalViews > 0 ? (applications / totalViews * 100).toFixed(2) : 0,
        status: property.status,
      };
    })
  );

  const summary = {
    totalProperties: properties.length,
    totalViews: propertyStats.reduce((sum, p) => sum + p.totalViews, 0),
    totalApplications: propertyStats.reduce((sum, p) => sum + p.applications, 0),
    avgConversionRate: (
      propertyStats.reduce((sum, p) => sum + parseFloat(p.conversionRate), 0) /
      properties.length
    ).toFixed(2),
  };

  return {
    summary,
    properties: propertyStats,
    period: { startDate, endDate },
  };
}

// Rapport financier
async function generateFinancialReport(
  supabaseUrl: string,
  headers: any,
  userId: string,
  startDate: string,
  endDate: string
) {
  // Récupérer les baux actifs
  const leasesRes = await fetch(
    `${supabaseUrl}/rest/v1/leases?select=*,properties!inner(*)&properties.owner_id=eq.${userId}`,
    { headers }
  );
  const leases = await leasesRes.json();

  const activeLeases = leases.filter((l: any) => l.status === 'actif');
  const totalRevenue = activeLeases.reduce((sum: number, l: any) => sum + l.monthly_rent, 0);

  // Revenus par mois
  const monthlyRevenue: any = {};
  activeLeases.forEach((lease: any) => {
    const month = new Date(lease.start_date).toISOString().slice(0, 7);
    monthlyRevenue[month] = (monthlyRevenue[month] || 0) + lease.monthly_rent;
  });

  return {
    summary: {
      totalActiveLeases: activeLeases.length,
      totalMonthlyRevenue: totalRevenue,
      totalProperties: leases.length,
    },
    monthlyRevenue,
    leases: activeLeases.map((l: any) => ({
      propertyTitle: l.properties?.title,
      tenantName: 'Locataire', // Simplify for now
      monthlyRent: l.monthly_rent,
      startDate: l.start_date,
      endDate: l.end_date,
      status: l.status,
    })),
    period: { startDate, endDate },
  };
}

// Rapport d'analyse de marché
async function generateMarketAnalysisReport(
  supabaseUrl: string,
  headers: any,
  startDate: string,
  endDate: string
) {
  // Récupérer les analytics géographiques
  const geoRes = await fetch(
    `${supabaseUrl}/rest/v1/geographic_analytics?date=gte.${startDate}&date=lte.${endDate}&select=*&order=demand_score.desc`,
    { headers }
  );
  const geoData = await geoRes.json();

  // Agréger par ville
  const cityStats: any = {};
  geoData.forEach((geo: any) => {
    if (!cityStats[geo.city]) {
      cityStats[geo.city] = {
        city: geo.city,
        totalSearches: 0,
        totalViews: 0,
        totalProperties: 0,
        avgPrice: 0,
        avgDemandScore: 0,
        count: 0,
      };
    }
    cityStats[geo.city].totalSearches += geo.search_count;
    cityStats[geo.city].totalViews += geo.view_count;
    cityStats[geo.city].totalProperties += geo.property_count;
    cityStats[geo.city].avgPrice += geo.avg_price;
    cityStats[geo.city].avgDemandScore += geo.demand_score;
    cityStats[geo.city].count += 1;
  });

  // Calculer moyennes
  Object.keys(cityStats).forEach((city) => {
    const stat = cityStats[city];
    stat.avgPrice = Math.round(stat.avgPrice / stat.count);
    stat.avgDemandScore = Math.round(stat.avgDemandScore / stat.count);
    delete stat.count;
  });

  const topCities = Object.values(cityStats)
    .sort((a: any, b: any) => b.avgDemandScore - a.avgDemandScore)
    .slice(0, 10);

  return {
    topCities,
    allCities: Object.values(cityStats),
    period: { startDate, endDate },
  };
}

// Rapport admin plateforme
async function generatePlatformAdminReport(
  supabaseUrl: string,
  headers: any,
  startDate: string,
  endDate: string
) {
  // Récupérer les métriques de plateforme
  const metricsRes = await fetch(
    `${supabaseUrl}/rest/v1/platform_metrics?date=gte.${startDate}&date=lte.${endDate}&select=*&order=date.asc`,
    { headers }
  );
  const metrics = await metricsRes.json();

  const summary = {
    totalUsers: metrics[metrics.length - 1]?.total_users || 0,
    newUsers: metrics.reduce((sum: number, m: any) => sum + m.new_users, 0),
    totalProperties: metrics[metrics.length - 1]?.total_properties || 0,
    totalViews: metrics.reduce((sum: number, m: any) => sum + m.total_views, 0),
    totalRevenue: metrics[metrics.length - 1]?.total_revenue || 0,
    avgConversionRate: (
      metrics.reduce((sum: number, m: any) => sum + m.view_to_application_rate, 0) /
      metrics.length
    ).toFixed(2),
  };

  return {
    summary,
    dailyMetrics: metrics,
    period: { startDate, endDate },
  };
}
