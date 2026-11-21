import nodemailer from 'nodemailer';
import config from '../config';
import logger from './logger';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.port === 465,
      auth: {
        user: config.email.user,
        pass: config.email.password,
      },
    });
  }
  return transporter;
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: config.email.from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
    logger.info({ email: options.to }, 'Email sent successfully');
  } catch (error) {
    logger.error({ error, email: options.to }, 'Failed to send email');
    throw error;
  }
}

export async function sendPublishSuccessEmail(email: string, videoTitle: string, platform: string): Promise<void> {
  const html = `
    <h2>Video Published Successfully!</h2>
    <p>Your video "<strong>${videoTitle}</strong>" has been published to ${platform}.</p>
    <p>Log in to your dashboard to view details.</p>
  `;

  await sendEmail({
    to: email,
    subject: '✅ Video Published Successfully',
    html,
  });
}

export async function sendPublishFailureEmail(email: string, videoTitle: string, reason: string): Promise<void> {
  const html = `
    <h2>Video Publishing Failed</h2>
    <p>Your video "<strong>${videoTitle}</strong>" failed to publish.</p>
    <p><strong>Reason:</strong> ${reason}</p>
    <p>Please check your connected accounts and try again.</p>
  `;

  await sendEmail({
    to: email,
    subject: '❌ Video Publishing Failed',
    html,
  });
}
