const nodemailer = require('nodemailer');

let transporter = null;

function envTrim(key) {
  const v = process.env[key];
  if (v === undefined || v === null) return '';
  return String(v).trim();
}

function resolveFromAddress() {
  return (
    envTrim('MAIL_FROM') ||
    envTrim('EMAIL_FROM') ||
    envTrim('SMTP_FROM') ||
    envTrim('SMTP_USER')
  );
}

function isConfigured() {
  const host = envTrim('SMTP_HOST');
  if (!host) return false;
  const user = envTrim('SMTP_USER');
  const pass = envTrim('SMTP_PASS');
  const result = !!(user && pass);
  if (typeof window === 'undefined') {
    console.log('[MailService.isConfigured] SMTP_HOST:', host ? 'set' : 'missing');
    console.log('[MailService.isConfigured] SMTP_USER:', user ? 'set' : 'missing');
    console.log('[MailService.isConfigured] SMTP_PASS:', pass ? 'set (length=' + pass.length + ')' : 'missing');
    console.log('[MailService.isConfigured] Result:', result);
  }
  return result;
}

function getTransporter() {
  if (transporter) return transporter;
  if (!isConfigured()) return null;
  const port = parseInt(envTrim('SMTP_PORT') || '587', 10);
  const secure = envTrim('SMTP_SECURE') === 'true' || port === 465;
  const user = envTrim('SMTP_USER');
  transporter = nodemailer.createTransport({
    host: envTrim('SMTP_HOST'),
    port,
    secure,
    auth: user ? { user, pass: envTrim('SMTP_PASS') } : undefined
  });
  return transporter;
}

async function sendTextEmail({ to, subject, text }) {
  const t = getTransporter();
  if (!t) {
    throw new Error('SMTP is not configured');
  }
  const from = resolveFromAddress();
  await t.sendMail({
    from,
    to,
    subject,
    text,
    headers: { 'X-Mailer': 'Paint Online Admin' }
  });
}

module.exports = {
  isConfigured,
  getTransporter,
  sendTextEmail
};
