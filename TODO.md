# TODO: Исправление багов paint_online

## Шаг 1: [✅] Мобильные превью в админке (AdminPage.jsx + admin.scss)
- ✅ Touch события + touch-action: none для модалки

## Шаг 2: [✅] Штрихи при входе в комнату (RoomInterface.jsx + canvasState.js)
- ✅ Флаг joiningRoom в connectToRoom, игнорирует drawsReceived при join
- ✅ Сервер не сохраняет join как stroke (DataStore OK)

## Шаг 3: [✅] Моргание кнопок ЛС (ProfilePage.jsx + TopMenu.jsx + PersonalMessagesModal.jsx)
- ✅ notification класс на TopMenu/ProfilePage кнопках профиля (радуга из profile.scss)
- ✅ PersonalMessagesModal onClose: userState.incomingPersonalMessages = []
- ✅ Badge на ЛС в профиле показывает количество

## Шаг 4: [✅] Тестирование
- ✅ Мобильное превью в админке (touch работает)
- ✅ strokeCount при join пустой комнаты (не растет)
- ✅ WS сообщение → моргание профиля → открыть ЛС → остановка

## Шаг 5: [ ] Завершение

## Шаг 4: [ ] Тестирование
- Мобильное превью в админке
- strokeCount при join пустой комнаты
- WS сообщение → моргание → открыть ЛС → остановка

## Шаг 5: [ ] Завершение
- attempt_completion

