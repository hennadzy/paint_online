# TODO: Исправления задач

## Задачи

- [ ] 1. Создать `server/services/PersonalMessageStore.js` — хранение личных сообщений в БД
- [ ] 2. Обновить `server/index.js` — добавить таблицу `personal_messages`
- [ ] 3. Обновить `server/services/WebSocketHandler.js` — реестр userId→ws, обработка personalMessage, доставка pending
- [ ] 4. Обновить `server/routes/users.js` — эндпоинт истории сообщений
- [ ] 5. Обновить `client/src/services/WebSocketService.js` — метод sendPersonalMessage, обработка personalMessage
- [ ] 6. Обновить `client/src/components/PersonalMessagesModal.jsx` — контакты из localStorage, fullscreen мобайл, история из API
- [ ] 7. Обновить `client/src/styles/personal-messages.scss` — контакты на всю высоту
- [ ] 8. Обновить `client/src/styles/canvas.scss` — убрать margin:auto из canvas-container-inner (фикс зума)
