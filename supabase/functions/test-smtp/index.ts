import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let client: SmtpClient | null = null;

  try {
    const { smtp_host, smtp_port, smtp_user, smtp_pass, smtp_secure } = await req.json();

    console.log('Testing SMTP connection with settings:', {
      host: smtp_host,
      port: smtp_port,
      user: smtp_user,
      secure: smtp_secure
    });

    // Validate required fields
    if (!smtp_host || !smtp_port || !smtp_user || !smtp_pass) {
      return new Response(
        JSON.stringify({ 
          error: 'Configuration SMTP incomplète. Veuillez remplir tous les champs.' 
        }),
        { 
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }

    client = new SmtpClient();

    const config = {
      hostname: smtp_host,
      port: Number(smtp_port),
      username: smtp_user,
      password: smtp_pass,
      tls: smtp_secure === 'tls' || Number(smtp_port) === 587
    };

    console.log('Connecting with config:', {
      ...config,
      password: '[REDACTED]'
    });

    try {
      await client.connectTLS(config);
      console.log('SMTP connection successful');
      
      // Send test email
      await client.send({
        from: smtp_user,
        to: smtp_user,
        subject: "Test de connexion SMTP",
        content: "Si vous recevez cet email, la configuration SMTP est correcte.",
      });
      
      console.log('Test email sent successfully');

      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Configuration SMTP validée avec succès'
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    } catch (error) {
      console.error('SMTP Error:', error);
      throw error;
    }
  } catch (error) {
    console.error('SMTP Error:', error);
    
    let errorMessage = 'Erreur de connexion SMTP';
    let statusCode = 500;
    
    if (error.message?.toLowerCase().includes('connection refused')) {
      errorMessage = 'Connexion refusée - vérifiez l\'hôte et le port';
      statusCode = 400;
    } else if (error.message?.toLowerCase().includes('authentication failed')) {
      errorMessage = 'Authentification échouée - vérifiez les identifiants';
      statusCode = 401;
    } else if (error.message?.toLowerCase().includes('certificate')) {
      errorMessage = 'Erreur de certificat SSL/TLS - vérifiez les paramètres de sécurité';
      statusCode = 400;
    } else if (error.message?.toLowerCase().includes('timeout')) {
      errorMessage = 'Délai d\'attente dépassé - le serveur SMTP ne répond pas';
      statusCode = 408;
    }

    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: error.message
      }),
      {
        status: statusCode,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  } finally {
    if (client) {
      try {
        await client.close();
      } catch (closeError) {
        console.error('Error closing SMTP connection:', closeError);
      }
    }
  }
});