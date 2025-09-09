import type { TransportSlip, FreightSlip } from '../types';

interface SendEmailParams {
  to: string;
  subject: string;
  body: string;
  attachments: Array<{
    filename: string;
    content: string;
    contentType: string;
  }>;
}

export async function sendEmail({ to, subject, body, attachments }: SendEmailParams): Promise<void> {
  const url = import.meta.env.DEV
    ? 'http://localhost:3000/api/send-email'
    : `${import.meta.env.VITE_API_BASE_URL}/api/send-email`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to,
      subject,
      body,
      attachments
    })
  });

  const responseText = await response.text();
  let data;
  
  try {
    data = JSON.parse(responseText);
  } catch (e) {
    throw new Error(`Invalid response from server: ${responseText}`);
  }

  if (!response.ok || !data.success) {
    throw new Error(data.error || data.message || 'Error sending email');
  }
}

export async function testSmtpConnection(config: {
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass: string;
}): Promise<void> {
  const response = await fetch('/api/test-smtp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(config)
  });

  const responseText = await response.text();
  let data;
  
  try {
    data = JSON.parse(responseText);
  } catch (e) {
    throw new Error(`Invalid response from server: ${responseText}`);
  }

  if (!response.ok || !data.success) {
    throw new Error(data.error || data.message || 'SMTP connection test failed');
  }
}