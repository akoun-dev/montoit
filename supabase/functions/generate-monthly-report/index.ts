import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface MonthlyReportData {
  owner_id: string;
  report_month: string;
  properties: any[];
  leases: any[];
  payments: any[];
  statistics: {
    total_revenue: number;
    total_properties: number;
    properties_rented: number;
    new_leases: number;
    ended_leases: number;
    total_views: number;
    total_applications: number;
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { owner_id, month, year } = await req.json();

    if (!owner_id) {
      return new Response(
        JSON.stringify({ error: 'owner_id is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const reportMonth = month && year
      ? new Date(year, month - 1, 1)
      : new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);

    const startDate = new Date(reportMonth.getFullYear(), reportMonth.getMonth(), 1);
    const endDate = new Date(reportMonth.getFullYear(), reportMonth.getMonth() + 1, 0);

    const { data: properties, error: propsError } = await supabase
      .from('properties')
      .select('*')
      .eq('owner_id', owner_id);

    if (propsError) throw propsError;

    const propertyIds = properties.map((p: any) => p.id);

    const { data: leases } = await supabase
      .from('leases')
      .select('*, properties(title), profiles(full_name)')
      .in('property_id', propertyIds);

    const activeLeasesThisMonth = leases?.filter((l: any) => {
      const start = new Date(l.start_date);
      const end = new Date(l.end_date);
      return start <= endDate && end >= startDate && l.status === 'actif';
    }) || [];

    const newLeasesThisMonth = leases?.filter((l: any) => {
      const start = new Date(l.created_at);
      return start >= startDate && start <= endDate;
    }) || [];

    const endedLeasesThisMonth = leases?.filter((l: any) => {
      const end = new Date(l.end_date);
      return end >= startDate && end <= endDate;
    }) || [];

    const { data: payments } = await supabase
      .from('payments')
      .select('*')
      .in('property_id', propertyIds)
      .eq('status', 'complete')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    const totalRevenue = payments?.reduce((sum: number, p: any) => sum + p.amount, 0) || 0;

    const { data: statistics } = await supabase
      .from('property_statistics')
      .select('*')
      .in('property_id', propertyIds)
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0]);

    const totalViews = statistics?.reduce((sum: number, s: any) => sum + s.total_views, 0) || 0;
    const totalApplications = statistics?.reduce((sum: number, s: any) => sum + s.applications, 0) || 0;

    const reportData: MonthlyReportData = {
      owner_id,
      report_month: reportMonth.toISOString().split('T')[0],
      properties: properties || [],
      leases: activeLeasesThisMonth,
      payments: payments || [],
      statistics: {
        total_revenue: totalRevenue,
        total_properties: properties?.length || 0,
        properties_rented: activeLeasesThisMonth.length,
        new_leases: newLeasesThisMonth.length,
        ended_leases: endedLeasesThisMonth.length,
        total_views: totalViews,
        total_applications: totalApplications,
      },
    };

    const { data: existingReport } = await supabase
      .from('monthly_reports')
      .select('id')
      .eq('owner_id', owner_id)
      .eq('report_month', reportData.report_month)
      .single();

    if (existingReport) {
      await supabase
        .from('monthly_reports')
        .update({
          total_revenue: reportData.statistics.total_revenue,
          total_properties: reportData.statistics.total_properties,
          properties_rented: reportData.statistics.properties_rented,
          new_leases: reportData.statistics.new_leases,
          ended_leases: reportData.statistics.ended_leases,
          total_views: reportData.statistics.total_views,
          total_applications: reportData.statistics.total_applications,
          report_data: reportData,
          generated_at: new Date().toISOString(),
        })
        .eq('id', existingReport.id);
    } else {
      await supabase
        .from('monthly_reports')
        .insert({
          owner_id,
          report_month: reportData.report_month,
          total_revenue: reportData.statistics.total_revenue,
          total_properties: reportData.statistics.total_properties,
          properties_rented: reportData.statistics.properties_rented,
          new_leases: reportData.statistics.new_leases,
          ended_leases: reportData.statistics.ended_leases,
          total_views: reportData.statistics.total_views,
          total_applications: reportData.statistics.total_applications,
          report_data: reportData,
        });
    }

    const { data: ownerProfile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', owner_id)
      .single();

    if (ownerProfile?.email) {
      const monthName = reportMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

      await fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          to: ownerProfile.email,
          subject: `Rapport mensuel - ${monthName}`,
          html: `
            <h2>Rapport mensuel - ${monthName}</h2>
            <p>Bonjour ${ownerProfile.full_name},</p>
            <p>Voici votre rapport d'activité pour le mois de ${monthName}:</p>

            <h3>Résumé financier</h3>
            <ul>
              <li><strong>Revenus du mois:</strong> ${totalRevenue.toLocaleString()} FCFA</li>
              <li><strong>Propriétés louées:</strong> ${activeLeasesThisMonth.length} / ${properties?.length || 0}</li>
            </ul>

            <h3>Activité du mois</h3>
            <ul>
              <li><strong>Nouvelles locations:</strong> ${newLeasesThisMonth.length}</li>
              <li><strong>Fins de bail:</strong> ${endedLeasesThisMonth.length}</li>
              <li><strong>Vues totales:</strong> ${totalViews}</li>
              <li><strong>Candidatures:</strong> ${totalApplications}</li>
            </ul>

            <p>Connectez-vous à votre tableau de bord pour plus de détails.</p>
            <p>Cordialement,<br>L'équipe Mon Toit</p>
          `,
        }),
      });

      await supabase
        .from('monthly_reports')
        .update({ emailed_at: new Date().toISOString() })
        .eq('owner_id', owner_id)
        .eq('report_month', reportData.report_month);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Monthly report generated successfully',
        report: reportData.statistics,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error generating monthly report:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to generate monthly report',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
