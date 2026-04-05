const nodemailer = require('nodemailer');

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const FROM_EMAIL = process.env.FROM_EMAIL || SMTP_USER || 'no-reply@paint-online.local';

const isEmailConfigured = Boolean(SMTP_USER && SMTP_PASS);

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465,
  auth: isEmailConfigured
    ? {
        user: SMTP_USER,
        pass: SMTP_PASS
      }
    : undefined
});

async function sendMailSafe(mailOptions) {
  if (!isEmailConfigured) {
    const error = new Error('SMTP_NOT_CONFIGURED');
    error.code = 'SMTP_NOT_CONFIGURED';
    throw error;
  }

  return transporter.sendMail({
    from: FROM_EMAIL,
    ...mailOptions
  });
}

async function sendPasswordResetEmail({ to, username, resetLink }) {
  const safeName = username || 'пользователь';
  const subject = 'Восстановление пароля — Рисование.Онлайн';

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#222">
      <h2>Восстановление пароля</h2>
      <p>Здравствуйте, <b>${safeName}</b>!</p>
      <p>Вы запросили восстановление пароля в сервисе <b>Рисование.Онлайн</b>.</p>
      <p>Перейдите по ссылке, чтобы задать новый пароль:</p>
      <p><a href="${resetLink}" target="_blank" rel="noopener noreferrer">${resetLink}</a></p>
      <p>Ссылка действует 1 час.</p>
      <hr />
      <p style="color:#666">Если это были не вы, просто проигнорируйте это письмо.</p>
    </div>
  `;

  const text =
    `Восстановление пароля\n\n` +
    `Здравствуйте, ${safeName}!\n` +
    `Вы запросили восстановление пароля в сервисе Рисование.Онлайн.\n` +
    `Перейдите по ссылке: ${resetLink}\n` +
    `Ссылка действует 1 час.\n\n` +
    `Если это были не вы, проигнорируйте это письмо.`;

  return sendMailSafe({ to, subject, text, html });
}

async function sendWelcomeEmail({ to, username, supportEmail }) {
  const safeName = username || 'друг';
  const support = supportEmail || 'support@paint-online.ru';
  const subject = 'Добро пожаловать в Рисование.Онлайн 🎨';

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#222">
      <h2>Добро пожаловать, ${safeName}! 🎉</h2>
      <p>Рады видеть вас в <b>Рисование.Онлайн</b>.</p>
      <p>
        Рисуйте, наслаждайтесь процессом, публикуйте работы в галерее и общайтесь с другими
        художниками в личных сообщениях.
      </p>
      <p>
        Если появятся вопросы — напишите нам на почту:
        <a href="mailto:${support}">${support}</a>
        или прямо в личные сообщения в приложении.
      </p>
      <p>Приятного творчества! ✨</p>
    </div>
  `;

  const text =
    `Добро пожаловать, ${safeName}!\n\n` +
    `Рады видеть вас в Рисование.Онлайн.\n` +
    `Рисуйте, наслаждайтесь процессом, публикуйте работы в галерее и общайтесь в личных сообщениях.\n` +
    `Если появятся вопросы — напишите нам: ${support} или прямо в ЛС.\n\n` +
    `Приятного творчества!`;

  return sendMailSafe({ to, subject, text, html });
}

module.exports = {
  isEmailConfigured,
  sendPasswordResetEmail,
  sendWelcomeEmail
};
