# TODO — Исправления 5 проблем

## Статус задач

- [ ] 1. Мобильный чат ЛС — полный экран без отступов, скролл только внутри чата
- [ ] 2. Контакты — полная ширина строки, убрать разделитель справа
- [ ] 3. Передача личных сообщений — исправить (HTTP API + WebSocket доставка)
- [ ] 4. История переписки сохраняется после выхода
- [ ] 5. Холст — левая сторона доступна при зуме на мобильном

## Файлы для изменения

### Сервер
- [ ] server/services/WebSocketHandler.js — сохранять userId/username на ws объекте, добавить fromUsername в доставку
- [ ] server/routes/users.js — добавить POST /messages эндпоинт

### Клиент
- [ ] client/src/components/PersonalMessagesModal.jsx — HTTP отправка, загрузка истории при открытии
- [ ] client/src/styles/personal-messages.scss — полный экран на мобильном, убрать border-right, width: 100%
- [ ] client/src/hooks/usePinchZoom.js — исправить расчёт скролла при зуме
- [ ] client/src/styles/canvas.scss — исправить canvas-container-inner для доступа к левому краю
