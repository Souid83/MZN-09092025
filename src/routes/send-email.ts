import express from 'express';
import nodemailer from 'nodemailer';

const router = express.Router();

router.post('/', async (req, res) => {
  console.log("ROUTE /api/send-email appelée");

  const { to, subject, body } = req.body;

  if (!to || !subject || !body) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.kkoat.fr',
    port: 587,
    secure: false,
    auth: {
      user: 'contact@kkoat.fr',
      pass: 'TON_MDP_ICI'
    }
  });

  try {
    const info = await transporter.sendMail({
      from: '"MZN Transport" <contact@kkoat.fr>',
      to,
      subject,
      text: body
    });

    console.log('Message sent: %s', info.messageId);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Erreur SMTP :', error instanceof Error ? error.message : error);
    return res.status(500).json({ message: 'SMTP Error', detail: error instanceof Error ? error.message : error });
  }
});

export default router;
