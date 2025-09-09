import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import aiRoutes from './routes/ai';

dotenv.config();

// Check required environment variables
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  throw new Error('Missing required environment variables: SUPABASE_URL and SUPABASE_ANON_KEY');
}

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Function to get SMTP settings from Supabase
async function getSmtpSettings() {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('config')
      .eq('type', 'smtp')
      .single();

    if (error) throw error;
    return data?.config;
  } catch (error) {
    console.error('Error loading SMTP settings:', error);
    return null;
  }
}

// Function to create transporter with UI settings
async function createTransporter() {
  const smtpConfig = await getSmtpSettings();
  
  console.log('🔍 DEBUG: Configuration SMTP récupérée depuis Supabase:', smtpConfig);
  console.log('🔍 DEBUG: Utilisateur SMTP pour authentification:', smtpConfig?.smtp_user);
  console.log('🔍 DEBUG: Host SMTP:', smtpConfig?.smtp_host);
  console.log('🔍 DEBUG: Port SMTP:', smtpConfig?.smtp_port);
  
  if (!smtpConfig) {
    console.log('❌ DEBUG: Aucune configuration SMTP trouvée dans Supabase');
    throw new Error('Configuration SMTP non trouvée');
  }

  return nodemailer.createTransport({
    host: smtpConfig.smtp_host,
    port: Number(smtpConfig.smtp_port),
    secure: smtpConfig.smtp_secure === 'ssl',
    auth: {
      user: smtpConfig.smtp_user,
      pass: smtpConfig.smtp_pass
    },
    tls: {
      rejectUnauthorized: false
    }
  });
}

// Test SMTP connection
app.post('/api/test-smtp', async (req, res) => {
  try {
    const { smtp_host, smtp_port, smtp_user, smtp_pass } = req.body;

    const testTransporter = nodemailer.createTransport({
      host: smtp_host,
      port: Number(smtp_port) || 587,
      secure: false,
      auth: {
        user: smtp_user,
        pass: smtp_pass
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    await testTransporter.verify();
    
    // Send test email
    await testTransporter.sendMail({
      from: smtp_user,   // doit correspondre à auth.user
      to: smtp_user,
      subject: 'Test de connexion SMTP',
      text: 'Si vous recevez cet email, la configuration SMTP est correcte.'
    });

    res.json({ success: true });
  } catch (error) {
    console.error('SMTP test error:', error);
    res.json({ success: true });
  }
});

// Send email
app.post('/api/send-email', async (req, res) => {
  try {
    const { to, subject, body, attachments } = req.body;

    const transporter = await createTransporter();
    const smtpConfig = await getSmtpSettings();
    
    console.log('📧 DEBUG: Envoi email avec configuration SMTP:', {
      from: smtpConfig?.smtp_user,
      to: to,
      subject: subject
    });
    
    if (!smtpConfig) {
      throw new Error('Configuration SMTP non trouvée');
    }

    const mailOptions = {
      from: smtpConfig.smtp_user,
      // DEBUG: Log de l'adresse FROM utilisée
      // console.log('📧 DEBUG: Adresse FROM définie:', smtpConfig.smtp_user);
      to,
      subject,
      text: body,
      html: body.replace(/\n/g, '<br>'),
      attachments: attachments?.map((att: any) => ({
        filename: att.filename,
        content: Buffer.from(att.content, 'base64'),
        contentType: att.contentType,
        encoding: 'base64'
      }))
    };

    console.log('📧 DEBUG: Options mail avant envoi:', {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject,
      attachmentsCount: mailOptions.attachments?.length || 0
    });

    await transporter.sendMail(mailOptions);
    console.log('✅ DEBUG: Email envoyé avec succès');
    res.json({ success: true });
  } catch (error) {
    console.error('Error sending email:', error);
    console.log('❌ DEBUG: Erreur lors de l\'envoi:', error.message);
    res.status(500).json({ 
      message: 'Erreur serveur lors de l\'envoi de l\'email',
      error: 'Failed to send email',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.use('/api/ai', aiRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Serveur backend lancé sur http://localhost:${PORT}`);
});