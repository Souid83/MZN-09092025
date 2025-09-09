import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// Create reusable transporter
let transporter = null;

// Initialize SMTP transporter
async function initializeTransporter() {
  try {
    const { data: settings } = await supabase
      .from('settings')
      .select('config')
      .eq('type', 'smtp')
      .single();

    if (!settings?.config) {
      console.error('No SMTP settings found');
      return;
    }

    const { smtp_host, smtp_port, smtp_user, smtp_pass } = settings.config;

    transporter = nodemailer.createTransport({
      host: smtp_host,
      port: Number(smtp_port),
      secure: Number(smtp_port) === 465,
      auth: {
        user: smtp_user,
        pass: smtp_pass
      }
    });

    console.log('SMTP Transporter initialized with:', {
      host: smtp_host,
      port: smtp_port,
      user: smtp_user
    });
  } catch (error) {
    console.error('Error initializing SMTP transporter:', error);
  }
}

// Test SMTP connection
app.post('/api/test-smtp', async (req, res) => {
  try {
    const { smtp_host, smtp_port, smtp_user, smtp_pass } = req.body;

    const testTransporter = nodemailer.createTransport({
      host: smtp_host,
      port: Number(smtp_port),
      secure: Number(smtp_port) === 465,
      auth: {
        user: smtp_user,
        pass: smtp_pass
      }
    });

    await testTransporter.verify();
    
    // Send test email
    await testTransporter.sendMail({
      from: smtp_user,
      to: smtp_user,
      subject: 'Test de connexion SMTP',
      text: 'Si vous recevez cet email, la configuration SMTP est correcte.'
    });

    res.json({ success: true });
  } catch (error) {
    console.error('SMTP test error:', error);
    res.status(500).json({ 
      error: 'Erreur de connexion SMTP',
      details: error.message 
    });
  }
});

// Send email
app.post('/api/send-email', async (req, res) => {
  try {
    if (!transporter) {
      await initializeTransporter();
      if (!transporter) {
        throw new Error('SMTP transporter not initialized');
      }
    }

    const { to, subject, body, attachments } = req.body;

    const mailOptions = {
      from: process.env.SMTP_USER,
      to,
      subject,
      text: body,
      html: body.replace(/\n/g, '<br>'),
      attachments: attachments?.map(att => ({
  filename: att.filename,
  content: Buffer.from(att.content, 'base64'),
  contentType: att.contentType,
  encoding: 'base64'
}))

    };

    await transporter.sendMail(mailOptions);
    res.json({ success: true });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ 
      message: 'Erreur serveur lors de l\'envoi de l\'email',
      error: 'Failed to send email',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  initializeTransporter();
});