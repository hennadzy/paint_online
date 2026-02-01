# Руководство по рефакторингу

## Обзор изменений

Проект был реорганизован для улучшения поддерживаемости, масштабируемости и разделения ответственности.

### Клиентская часть

#### Новая структура:
```
client/src/
├── services/
│   ├── CanvasService.js      # Управление холстом и отрисовкой
│   ├── WebSocketService.js   # WebSocket соединение
│   └── HistoryService.js     # История изменений (undo/redo)
├── store/
│   ├── canvasState.js        # Старый файл (сохранен для совместимости)
│   ├── canvasState.new.js    # Новый координатор сервисов
│   ├── uiState.js            # Состояние UI (модалы, интерфейс)
│   └── toolState.js          # Без изменений
```

#### Преимущества:
- **CanvasService** (195 строк): Изолированная логика рисования
- **WebSocketService** (182 строки): Управление соединением с автопереподключением
- **HistoryService** (165 строк): Чистая логика undo/redo
- **UIState** (65 строк): Отдельное управление UI

### Серверная часть

#### Новая структура:
```
server/
├── services/
│   ├── DataStore.js          # Управление данными и файлами
│   ├── RoomManager.js        # Управление комнатами и пользователями
│   └── WebSocketHandler.js  # Обработка WebSocket сообщений
├── routes/
│   └── api.js                # REST API эндпоинты
├── utils/
│   └── security.js           # Утилиты безопасности
├── index.js                  # Старый файл (сохранен)
└── index.new.js              # Новая точка входа
```

#### Преимущества:
- **DataStore** (165 строк): Изолированная работа с файлами
- **RoomManager** (195 строк): Управление жизненным циклом комнат
- **WebSocketHandler** (180 строк): Обработка сообщений и broadcasting
- **API Router** (120 строк): Чистые REST эндпоинты

## План миграции

### Этап 1: Подготовка (без остановки сервиса)

1. Все новые файлы уже созданы
2. Старые файлы сохранены для обратной совместимости

### Этап 2: Тестирование клиента

```bash
# 1. Обновить импорт в Canvas.jsx (или создать тестовую ветку)
cd client/src/components
# Заменить импорт:
# import canvasState from "../store/canvasState";
# на:
# import canvasState from "../store/canvasState.new";

# 2. Пересобрать клиент
cd client
npm run build

# 3. Протестировать локально
npm start
```

### Этап 3: Тестирование сервера

```bash
# 1. Запустить новый сервер локально
cd server
node index.new.js

# 2. Проверить функциональность:
# - Создание комнат
# - WebSocket соединение
# - Рисование
# - Undo/Redo
# - Чат
# - Очистка холста
```

### Этап 4: Финальная миграция

После успешного тестирования:

```bash
# Клиент
cd client/src/store
mv canvasState.js canvasState.old.js
mv canvasState.new.js canvasState.js

# Сервер
cd server
mv index.js index.old.js
mv index.new.js index.js

# Пересобрать и задеплоить
cd client
npm run build
cd ..
git add .
git commit -m "Refactor: migrate to new modular architecture"
git push
```

## Ключевые улучшения

### 1. Event-Driven Architecture

Все сервисы используют event system для коммуникации:

```javascript
// Пример использования
CanvasService.on('zoomChanged', ({ zoom }) => {
  console.log('Zoom changed to:', zoom);
});

WebSocketService.on('connected', () => {
  console.log('Connected to server');
});
```

### 2. Graceful Error Handling

Каждый сервис обрабатывает ошибки независимо:

```javascript
// В CanvasService
emit(event, data) {
  this.listeners.forEach(listener => {
    try {
      listener.callback(data);
    } catch (error) {
      console.error(`Error in ${event} listener:`, error);
      // Ошибка не прерывает работу других listeners
    }
  });
}
```

### 3. Автопереподключение WebSocket

```javascript
// WebSocketService автоматически переподключается
socket.onclose = () => {
  if (this.reconnectAttempts < this.maxReconnectAttempts) {
    this.reconnectAttempts++;
    setTimeout(() => {
      this.connect(wsUrl, roomId, username);
    }, this.reconnectDelay * this.reconnectAttempts);
  }
};
```

### 4. Модульное тестирование

Каждый модуль можно тестировать независимо:

```javascript
// Пример теста для HistoryService
const HistoryService = require('./services/HistoryService');

test('undo removes last stroke', () => {
  HistoryService.addStroke({ id: '1', type: 'line' }, 'user1');
  const removed = HistoryService.undo('user1');
  expect(removed.id).toBe('1');
  expect(HistoryService.getStrokes().length).toBe(0);
});
```

## Откат изменений

Если что-то пойдет не так:

```bash
# Клиент
cd client/src/store
mv canvasState.js canvasState.new.js
mv canvasState.old.js canvasState.js

# Сервер
cd server
mv index.js index.new.js
mv index.old.js index.js

# Пересобрать
cd client
npm run build
```

## Мониторинг после миграции

Проверьте следующие метрики:

1. **Время отклика WebSocket**: должно остаться прежним
2. **Использование памяти**: может немного увеличиться из-за event listeners
3. **Ошибки в консоли**: не должно быть новых ошибок
4. **Функциональность**:
   - ✅ Рисование всеми инструментами
   - ✅ Undo/Redo
   - ✅ Масштабирование (pinch-to-zoom)
   - ✅ Чат
   - ✅ Создание/подключение к комнатам
   - ✅ Сохранение рисунков

## Контрольный список

- [ ] Протестировать локально клиент
- [ ] Протестировать локально сервер
- [ ] Проверить все инструменты рисования
- [ ] Проверить undo/redo
- [ ] Проверить WebSocket соединение
- [ ] Проверить создание комнат
- [ ] Проверить чат
- [ ] Проверить мобильную версию
- [ ] Проверить pinch-to-zoom
- [ ] Задеплоить на production
- [ ] Мониторинг в течение 24 часов

## Поддержка

При возникновении проблем:

1. Проверьте консоль браузера на ошибки
2. Проверьте логи сервера
3. Используйте откат изменений
4. Создайте issue с описанием проблемы
