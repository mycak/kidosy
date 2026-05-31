import { createClient } from 'npm:@supabase/supabase-js@2.91.1';

type LeadNotificationRequest = {
  leadIds?: string[];
};

type LeadRow = {
  id: string;
  offer_id: string;
  child_name: string;
  child_age: number;
  parent_name: string;
  parent_email: string;
  parent_phone: string;
  message: string | null;
  created_at: string;
  offer_snapshot: {
    title?: string;
    user_id?: string;
  } | null;
};

type OrganizerProfileRow = {
  company_name: string;
  email_public: string;
  phone: string;
};

type AuthUserRow = {
  email: string;
};

type MailjetResponse = {
  Messages?: Array<{
    Status?: string;
    Errors?: Array<{ ErrorMessage?: string }>;
  }>;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function buildTextBody(
  offerTitle: string,
  organizerName: string,
  parentName: string,
  parentEmail: string,
  parentPhone: string,
  leads: LeadRow[],
): string {
  const childLines = leads
    .map((lead) => `- ${lead.child_name}, ${lead.child_age} lat`)
    .join('\n');
  const additionalMessage =
    leads.find((lead) => lead.message)?.message?.trim() ||
    'Brak dodatkowej wiadomości.';

  return [
    `Masz nowe zgłoszenie na ofertę: ${offerTitle}`,
    '',
    `Organizator: ${organizerName}`,
    `Rodzic: ${parentName}`,
    `E-mail rodzica: ${parentEmail}`,
    `Telefon rodzica: ${parentPhone}`,
    '',
    'Dzieci:',
    childLines,
    '',
    'Wiadomość od rodzica:',
    additionalMessage,
  ].join('\n');
}

function buildHtmlBody(
  offerTitle: string,
  organizerName: string,
  parentName: string,
  parentEmail: string,
  parentPhone: string,
  leads: LeadRow[],
): string {
  const childItems = leads
    .map(
      (lead) =>
        `<li>${escapeHtml(lead.child_name)} — ${lead.child_age} lat</li>`,
    )
    .join('');
  const additionalMessage = escapeHtml(
    leads.find((lead) => lead.message)?.message?.trim() ||
      'Brak dodatkowej wiadomości.',
  );

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
      <h2 style="margin: 0 0 16px;">Nowe zgłoszenie na ofertę: ${escapeHtml(offerTitle)}</h2>
      <p style="margin: 0 0 8px;"><strong>Organizator:</strong> ${escapeHtml(organizerName)}</p>
      <p style="margin: 0 0 8px;"><strong>Rodzic:</strong> ${escapeHtml(parentName)}</p>
      <p style="margin: 0 0 8px;"><strong>E-mail rodzica:</strong> ${escapeHtml(parentEmail)}</p>
      <p style="margin: 0 0 16px;"><strong>Telefon rodzica:</strong> ${escapeHtml(parentPhone)}</p>
      <h3 style="margin: 0 0 8px;">Dzieci</h3>
      <ul style="margin: 0 0 16px; padding-left: 20px;">${childItems}</ul>
      <h3 style="margin: 0 0 8px;">Wiadomość od rodzica</h3>
      <p style="margin: 0; white-space: pre-wrap;">${additionalMessage}</p>
    </div>
  `;
}

async function sendMailjetEmail(params: {
  recipientEmail: string;
  recipientName: string;
  subject: string;
  textBody: string;
  htmlBody: string;
}): Promise<{ ok: boolean; errorMessage?: string }> {
  const mailjetApiKey = Deno.env.get('MAILJET_API_KEY');
  const mailjetApiSecret = Deno.env.get('MAILJET_API_SECRET');
  const senderEmail = Deno.env.get('MAILJET_SENDER_EMAIL');
  const senderName = Deno.env.get('MAILJET_SENDER_NAME') ?? 'Kidosy';

  if (!mailjetApiKey || !mailjetApiSecret || !senderEmail) {
    return {
      ok: false,
      errorMessage:
        'Brakuje konfiguracji Mailjet: MAILJET_API_KEY, MAILJET_API_SECRET lub MAILJET_SENDER_EMAIL',
    };
  }

  const response = await fetch('https://api.mailjet.com/v3.1/send', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${mailjetApiKey}:${mailjetApiSecret}`)}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      Messages: [
        {
          From: {
            Email: senderEmail,
            Name: senderName,
          },
          To: [
            {
              Email: params.recipientEmail,
              Name: params.recipientName,
            },
          ],
          Subject: params.subject,
          TextPart: params.textBody,
          HTMLPart: params.htmlBody,
        },
      ],
    }),
  });

  const payload = (await response
    .json()
    .catch(() => null)) as MailjetResponse | null;
  const message = payload?.Messages?.[0];

  if (!response.ok || message?.Status !== 'success') {
    return {
      ok: false,
      errorMessage:
        message?.Errors?.[0]?.ErrorMessage ||
        `Mailjet zwrócił status ${response.status}`,
    };
  }

  return { ok: true };
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', {
      status: 204,
      headers: corsHeaders,
    });
  }

  if (request.method !== 'POST') {
    return new Response(
      JSON.stringify({ ok: false, error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }

  try {
    const body = (await request.json()) as LeadNotificationRequest;
    const leadIds =
      body.leadIds?.filter(
        (leadId): leadId is string =>
          typeof leadId === 'string' && leadId.trim().length > 0,
      ) ?? [];

    if (leadIds.length === 0) {
      return new Response(
        JSON.stringify({ ok: false, error: 'leadIds are required' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'Brakuje konfiguracji Supabase server-side',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select(
        'id, offer_id, child_name, child_age, parent_name, parent_email, parent_phone, message, created_at, offer_snapshot',
      )
      .in('id', leadIds)
      .order('created_at', { ascending: true });

    if (leadsError || !leads || leads.length === 0) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: leadsError?.message || 'Nie znaleziono zgłoszeń',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const typedLeads = leads as LeadRow[];
    const firstLead = typedLeads[0];
    const offerSnapshot = firstLead.offer_snapshot;
    const offerTitle = offerSnapshot?.title ?? 'Oferta';
    const organizerUserId = offerSnapshot?.user_id;

    const { data: offerData } = organizerUserId
      ? await supabase
          .from('organizer_profiles')
          .select('company_name, email_public, phone')
          .eq('user_id', organizerUserId)
          .maybeSingle()
      : { data: null };

    const organizerProfile = offerData as OrganizerProfileRow | null;

    const { data: organizerUser } = await supabase
      .from('users')
      .select('email')
      .eq('id', organizerUserId ?? '')
      .maybeSingle();

    const fallbackRecipient = organizerUser as AuthUserRow | null;
    const recipientEmail =
      organizerProfile?.email_public ?? fallbackRecipient?.email;
    if (!recipientEmail) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Brak adresu e-mail organizatora' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const organizerName = organizerProfile?.company_name ?? 'Organizator';
    const recipientName =
      organizerProfile?.company_name ??
      fallbackRecipient?.email ??
      'Organizator';
    const parentName = firstLead.parent_name;
    const parentEmail = firstLead.parent_email;
    const parentPhone = firstLead.parent_phone;

    const subject = `Nowe zgłoszenie na ofertę: ${offerTitle}`;
    const textBody = buildTextBody(
      offerTitle,
      organizerName,
      parentName,
      parentEmail,
      parentPhone,
      typedLeads,
    );
    const htmlBody = buildHtmlBody(
      offerTitle,
      organizerName,
      parentName,
      parentEmail,
      parentPhone,
      typedLeads,
    );

    const { data: emailLog, error: logError } = await supabase
      .from('email_logs')
      .insert({
        recipient_email: recipientEmail,
        email_type: 'lead_submission_to_organizer',
        lead_id: firstLead.id,
        offer_id: firstLead.offer_id,
        user_id: organizerUserId,
        status: 'pending',
      })
      .select('id')
      .single();

    const emailLogId = emailLog?.id ?? null;

    const mailResult = await sendMailjetEmail({
      recipientEmail,
      recipientName,
      subject,
      textBody,
      htmlBody,
    });

    if (emailLogId) {
      await supabase
        .from('email_logs')
        .update(
          mailResult.ok
            ? {
                status: 'sent',
                sent_at: new Date().toISOString(),
                error_message: null,
              }
            : {
                status: 'failed',
                error_message:
                  mailResult.errorMessage ??
                  logError?.message ??
                  'Nie udało się wysłać e-maila',
              },
        )
        .eq('id', emailLogId);
    }

    return new Response(
      JSON.stringify({
        ok: mailResult.ok,
        recipientEmail,
        recipientName,
        leadCount: typedLeads.length,
        emailLogId,
        error: mailResult.errorMessage,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : 'Nie udało się przetworzyć zgłoszenia',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
