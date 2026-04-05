# TODO: Реализация задач по улучшению авторизации и чата

## План реализации:

### 1. Email инфраструктура (задачи 2,4)
- [ ] Добавить nodemailer в server/package.json и установить
- [ ] Создать server/utils/email.js (transporter, sendResetEmail, sendWelcomeEmail)
- [ ] Обновить server/routes/auth.js:
  - [ ] /forgot-password: отправка reset email вместо console.log
  - [ ] /register: отправка welcome email + PM новому пользователю
- [ ] Добавить .env vars: SMTP_HOST, SMTP_PORT=587, SMTP_USER, SMTP_PASS, FROM_EMAIL, FRONTEND_URL

### 2. Подсветка авторизации в Справке (задача 3)
- [ ] Обновить client/src/components/AboutModal.jsx: добавить секцию преимуществ регистрации

### 3. Улучшение ЛС в комнате (задача 1 - уже работает)
- [ ] Добавить CSS polish для clickable nicks (если нужно)

### 4. Тестирование
- [ ] Проверить отправку email (register, forgot)
- [ ] Проверить PM welcome
- [ ] Browser: клик по нику → ЛС overlay, close → room
- [ ] AboutModal: visible auth promo

Текущее: Начинаем с email infra.
