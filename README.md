# Paint Online

Онлайн-платформа для совместного рисования в реальном времени.

## Особенности

- Совместное рисование в реальном времени
- Различные инструменты для рисования (кисть, линия, прямоугольник и т.д.)
- Чат для общения между пользователями
- Галерея работ
- Личные сообщения
- Административная панель

## Технологии

- **Frontend**: React, MobX, WebSocket
- **Backend**: Node.js, Express, WebSocket
- **База данных**: PostgreSQL, Redis

## Установка и запуск

### Предварительные требования

- Node.js (версия 14 или выше)
- PostgreSQL
- Redis (опционально, для продакшена)

### Установка зависимостей

```bash
# Установка зависимостей сервера
cd server
npm install

# Установка зависимостей клиента
cd ../client
npm install
```

### Настройка переменных окружения

1. Скопируйте файл `.env.example` в `.env`:
   ```bash
   cp .env.example .env
   ```

2. Отредактируйте файл `.env`, указав свои значения для переменных окружения:
   ```
   JWT_SECRET=your_secure_random_string_here
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=paint_online
   DB_USER=postgres
   DB_PASSWORD=your_password
   REDIS_URL=redis://localhost:6379
   PORT=5000
   NODE_ENV=development
   ```

### Запуск проекта

```bash
# Запуск сервера
cd server
npm start

# Запуск клиента (в отдельном терминале)
cd client
npm start
```

## Безопасность

В продакшен-окружении обязательно установите переменную окружения `JWT_SECRET` с надежным случайным значением для обеспечения безопасности JWT-токенов.

## Лицензия

[MIT](LICENSE)
