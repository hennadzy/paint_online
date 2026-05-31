const nodemailer = require('nodemailer');

let transporter = null;

function envTrim(key) {
  const v = process.env[key];
  if (v === undefined || v === null) return '';
  return String(v).trim();
}

/** Письма «от кого»: MAIL_FROM, иначе частый случай — SMTP_USER как логин и адрес отправителя */
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
  // Совместимо с utils/email.js: требуется SMTP_USER и SMTP_PASS
  const user = envTrim('SMTP_USER');
  const pass = envTrim('SMTP_PASS');
  return !!(user && pass);
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
