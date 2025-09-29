import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.39.3';
import { SMTPClient } from 'npm:emailjs@4.0.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, subject, body, attachments } = await req.json();

    const client = new SMTPClient({
      user: Deno.env.get('SMTP_USER'),
      password: Deno.env.get('SMTP_PASSWORD'),
      host: Deno.env.get('SMTP_HOST'),
      port: parseInt(Deno.env.get('SMTP_PORT') || '587'),
      tls: true,
    });

    const message = {
      from: Deno.env.get('SMTP_FROM'),
      to,
      subject,
      text: body,
      attachment: attachments?.map(({ filename, content, contentType }) => ({
        name: filename,
        data: Buffer.from(content, 'base64'),
        type: contentType,
      })) || [],
    };

    await client.sendAsync(message);

    return new Response(
      JSON.stringify({ message: 'Email sent successfully' }),
      { 
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      },
    );
  } catch (error) {
    console.error('Error sending email:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      },
    );
  }
});