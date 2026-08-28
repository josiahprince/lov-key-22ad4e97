import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // This function is called from a DB trigger (net.http_post), not a
    // logged-in user, so auth is a shared secret header rather than a JWT.
    const webhookSecret = req.headers.get('x-webhook-secret');
    if (!webhookSecret || webhookSecret !== Deno.env.get('REPORT_ALERT_WEBHOOK_SECRET')) {
      console.warn('Missing or invalid webhook secret for notify-report-alert');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { report_id, reporter_id, reported_id, reason, details, created_at } = await req.json();

    if (!report_id || !reporter_id || !reported_id || !reason) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, nickname')
      .in('id', [reporter_id, reported_id]);

    const reporterName = profiles?.find((p) => p.id === reporter_id)?.nickname ?? reporter_id;
    const reportedName = profiles?.find((p) => p.id === reported_id)?.nickname ?? reported_id;

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const toEmail = Deno.env.get('REPORT_ALERT_TO_EMAIL');

    if (!resendApiKey || !toEmail) {
      console.error('RESEND_API_KEY or REPORT_ALERT_TO_EMAIL not configured');
      return new Response(
        JSON.stringify({ error: 'Email alerting not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'LovKey Reports <onboarding@resend.dev>',
        to: [toEmail],
        subject: `[LovKey] New report: ${reason}`,
        text: [
          `A new report was submitted and needs review within 24 hours.`,
          ``,
          `Reporter: ${reporterName} (${reporter_id})`,
          `Reported user: ${reportedName} (${reported_id})`,
          `Reason: ${reason}`,
          `Details: ${details || '(none provided)'}`,
          `Submitted: ${created_at}`,
          ``,
          `Report ID: ${report_id}`,
          `Review it in the Supabase dashboard: https://supabase.com/dashboard/project/iqgrlpstwxzonnjswefa/editor`,
        ].join('\n'),
      }),
    });

    if (!emailRes.ok) {
      const errText = await emailRes.text();
      console.error('Resend API error:', errText);
      return new Response(
        JSON.stringify({ error: 'Failed to send alert email' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error in notify-report-alert:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
