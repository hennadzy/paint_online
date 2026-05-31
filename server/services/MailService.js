const nodemailer = require('nodemailer');

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.reg.ru';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '465', 10);
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const FROM_EMAIL = process.env.FROM_EMAIL || process.env.SMTP_USER || '';

const isEmailConfigured = Boolean(SMTP_USER && SMTP_PASS);

console.log('[MailService] Loading module...');
console.log('[MailService] SMTP_HOST:', SMTP_HOST ? 'set' : 'MISSING');
console.log('[MailService] SMTP_USER:', SMTP_USER ? 'set' : 'MISSING');
console.log('[MailService] SMTP_PASS:', SMTP_PASS ? 'set (len=' + SMTP_PASS.length + ')' : 'MISSING');
console.log('[MailService] FROM_EMAIL:', FROM_EMAIL ? 'set' : 'MISSING');
console.log('[MailService] isEmailConfigured:', isEmailConfigured);

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!isEmailConfigured) {
    console.log('[MailService] Transporter not created - SMTP not configured');
    return null;
  }
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    }
  });
  console.log('[MailService] Transporter created successfully');
  return transporter;
}

function isConfigured() {
  const result = isEmailConfigured;
  console.log('[MailService.isConfigured] Result:', result);
  return result;
}

async function sendTextEmail({ to, subject, text }) {
  const t = getTransporter();
  if (!t) {
    throw new Error('SMTP is not configured');
  }
  await t.sendMail({
    from: FROM_EMAIL,
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
