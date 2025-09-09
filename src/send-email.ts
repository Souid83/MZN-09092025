import express from 'express';
import nodemailer from 'nodemailer';

const router = express.Router();

router.post('/', async (req, res) => {
  console.log("📩 Route /api/send-email appelée");

  const { to, subject, body, attachments } = req.body;

  if (!to || !subject || !body) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.ionos.fr',
    port: 587,
    secure: false,
    auth: {
      user: 'contact@allcheaper.fr',
      pass: '@JeSecuriseMonMail!$'
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  try {
    const info = await transporter.sendMail({
      from: '"MZN Transport" <contact@allcheaper.fr>',
      to,
      subject,
      text: body,
      attachments: attachments?.map(({ filename, content, contentType }) => ({
  filename,
  content: Buffer.from(content, 'base64'),
  contentType,
  encoding: 'base64'
}))

    });

    console.log('✅ Email envoyé :', info.messageId);
    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('❌ Erreur SMTP :', error.message);
    return res.status(500).json({ message: 'SMTP Error', detail: error.message });
  }
});

export default router;