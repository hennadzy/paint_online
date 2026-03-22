# Задачи по исправлению багов

## Проблема 1: Контакты в ЛС должны занимать всю строку
- [ ] `client/src/styles/personal-messages.scss` — убрать `border-left` у `.chat-area`, добавить стили для `.personal-messages-container:not(.has-selected)`
- [ ] `client/src/components/PersonalMessagesModal.jsx` — добавить класс `has-selected` к контейнеру

## Проблема 2: Реалтайм сообщения в ЛС
- [ ] `client/src/store/userState.js` — добавить `incomingPersonalMessages` и методы
- [ ] `client/src/App.jsx` — глобальный слушатель `personalMessage`
- [ ] `client/src/components/PersonalMessagesModal.jsx` — обработка накопленных сообщений при открытии

## Проблема 3: Прокрутка холста на мобильном
- [ ] `client/src/styles/canvas.scss` — изменить `.canvas-container` (мобильный портрет): `justify-content: flex-start`, `align-items: flex-start`
- [ ] `client/src/components/Canvas.jsx` — центрировать холст через scrollLeft/scrollTop при инициализации
