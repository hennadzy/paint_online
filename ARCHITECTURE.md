# Архитектура проекта Paint Online

## Обзор

Проект использует модульную event-driven архитектуру с четким разделением ответственности.

## Клиентская архитектура

```
┌─────────────────────────────────────────────────────────┐
│                    React Components                      │
│  (Canvas, Toolbar, Chat, RoomInterface, etc.)           │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│                   MobX Stores                            │
│  ┌──────────────┐  ┌──────────────┐                    │
│  │ canvasState  │  │   uiState    │                    │
│  │ (Coordinator)│  │ (UI Modals)  │                    │
│  └──────┬───────┘  └──────────────┘                    │
└─────────┼──────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────┐
│                      Services                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │CanvasService │  │WebSocketSvc  │  │HistoryService│ │
│  │              │  │              │  │              │ │
│  │ • Drawing    │  │ • Connection │  │ • Undo/Redo  │ │
│  │ • Zoom       │  │ • Messages   │  │ • Strokes    │ │
│  │ • Grid       │  │ • Reconnect  │  │ • Stacks     │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
          │                    │                  │
          └────────────────────┴──────────────────┘
                               │
                               ▼
                     Event System (Pub/Sub)
```

### Компоненты клиента

#### 1. CanvasService (195 строк)
**Ответственность:** Управление холстом и отрисовкой

**Методы:**
- `initialize(canvas)` - Инициализация холста
- `drawStroke(ctx, stroke)` - Отрисовка одного штриха
- `rebuildBuffer(strokes)` - Перестроение буфера
- `redraw()` - Перерисовка холста
- `setZoom(zoom)` - Масштабирование
- `toggleGrid()` - Переключение сетки

**События:**
- `initialized` - Холст инициализирован
- `zoomChanged` - Изменен масштаб
- `gridToggled` - Переключена сетка

#### 2. WebSocketService (182 строки)
**Ответственность:** WebSocket соединение

**Методы:**
- `connect(wsUrl, roomId, username)` - Подключение
- `disconnect()` - Отключение
- `send(message)` - Отправка сообщения
- `sendDraw(figure)` - Отправка рисунка
- `sendClear()` - Отправка очистки
- `sendChat(message)` - Отправка чата

**События:**
- `connected` - Подключено
- `disconnected` - Отключено
- `reconnecting` - Переподключение
- `userConnected` - Пользователь подключился
- `userDisconnected` - Пользователь отключился
- `drawReceived` - Получен рисунок
- `chatReceived` - Получено сообщение

**Особенности:**
- Автоматическое переподключение (до 5 попыток)
- Экспоненциальная задержка при переподключении
- Graceful error handling

#### 3. HistoryService (165 строк)
**Ответственность:** История изменений

**Методы:**
- `addStroke(stroke, username)` - Добавить штрих
- `undo(username)` - Отменить
- `redo(username)` - Повторить
- `undoById(strokeId)` - Отменить по ID
- `canUndo(username)` - Можно ли отменить
- `canRedo(username)` - Можно ли повторить

**События:**
- `strokeAdded` - Штрих добавлен
- `strokeUndone` - Штрих отменен
- `strokeRedone` - Штрих повторен
- `strokesCleared` - Штрихи очищены

#### 4. canvasState (Coordinator)
**Ответственность:** Координация сервисов

- Делегирует вызовы соответствующим сервисам
- Поддерживает observable state для MobX
- Обеспечивает обратную совместимость с legacy кодом

#### 5. uiState (65 строк)
**Ответственность:** Состояние UI

- Модалы
- Интерфейс комнат
- Публичные комнаты
- Созданные комнаты

## Серверная архитектура

```
┌─────────────────────────────────────────────────────────┐
│                    Express Server                        │
│                    (index.js)                            │
└────────────┬────────────────────────────────────────────┘
             │
             ├─────────────┬─────────────┬─────────────┐
             │             │             │             │
             ▼             ▼             ▼             ▼
    ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐
    │ WebSocket  │ │ REST API   │ │ Middleware │ │  Static    │
    │  Handler   │ │  Router    │ │  (CORS,    │ │  Files     │
    │            │ │            │ │  Helmet)   │ │            │
    └─────┬──────┘ └─────┬──────┘ └────────────┘ └────────────┘
          │              │
          ▼              ▼
    ┌─────────────────────────────────────────────────────┐
    │                   Services                           │
    │  ┌──────────────┐  ┌──────────────┐  ┌──────────┐ │
    │  │ RoomManager  │  │  DataStore   │  │ Security │ │
    │  │              │  │              │  │  Utils   │ │
    │  │ • Users      │  │ • Files      │  │          │ │
    │  │ • Rooms      │  │ • Persistence│  │ • XSS    │ │
    │  │ • Broadcast  │  │ • Cleanup    │  │ • Rates  │ │
    │  └──────────────┘  └──────────────┘  └──────────┘ │
    └─────────────────────────────────────────────────────┘
```

### Компоненты сервера

#### 1. DataStore (165 строк)
**Ответственность:** Управление данными

**Методы:**
- `createRoom(roomId, data)` - Создать комнату
- `getRoomInfo(roomId)` - Получить информацию
- `deleteRoom(roomId)` - Удалить комнату
- `saveRoomStrokes(roomId, strokes)` - Сохранить штрихи
- `loadRoomStrokes(roomId)` - Загрузить штрихи
- `getPublicRooms()` - Получить публичные комнаты
- `cleanupExpiredRooms(time)` - Очистить устаревшие

**Хранилище:**
- `roomInfo.json` - Метаданные комнат
- `room_data/*.json` - Штрихи комнат

#### 2. RoomManager (195 строк)
**Ответственность:** Управление активными комнатами

**Методы:**
- `getOrCreateRoom(roomId)` - Получить/создать комнату
- `addUser(roomId, username, ws)` - Добавить пользователя
- `removeUser(ws)` - Удалить пользователя
- `addStroke(roomId, stroke)` - Добавить штрих
- `removeStroke(roomId, strokeId)` - Удалить штрих
- `clearStrokes(roomId)` - Очистить штрихи
- `cleanupInactiveUsers()` - Очистить неактивных

**Ограничения:**
- Максимум 10 пользователей на комнату
- Таймаут неактивности: 10 минут
- Автоматическая очистка каждую минуту

#### 3. WebSocketHandler (180 строк)
**Ответственность:** Обработка WebSocket

**Методы:**
- `handleConnection(ws, msg)` - Обработка подключения
- `handleDraw(ws, msg)` - Обработка рисования
- `handleClear(ws, msg)` - Обработка очистки
- `handleChat(ws, msg)` - Обработка чата
- `broadcast(roomId, message, excludeWs)` - Рассылка

**Rate Limiting:**
- Максимум 50 сообщений в секунду на соединение
- Автоматическое закрытие при превышении

#### 4. API Router (120 строк)
**Ответственность:** REST API

**Эндпоинты:**
- `POST /rooms` - Создать комнату
- `GET /rooms/public` - Получить публичные комнаты
- `GET /rooms/:id/exists` - Проверить существование
- `POST /rooms/:id/verify-password` - Проверить пароль

**Rate Limiting:**
- API: 100 запросов за 15 минут
- Создание комнат: 10 за час
- Проверка паролей: 20 за 15 минут

## Поток данных

### 1. Рисование

```
User draws
    │
    ▼
Tool (Brush, Line, etc.)
    │
    ▼
canvasState.pushStroke()
    │
    ├─────────────────────┐
    │                     │
    ▼                     ▼
HistoryService       WebSocketService
    │                     │
    │                     ▼
    │              Server receives
    │                     │
    │                     ▼
    │              RoomManager.addStroke()
    │                     │
    │                     ▼
    │              DataStore.saveRoomStrokes()
    │                     │
    │                     ▼
    │              Broadcast to other users
    │                     │
    ▼                     ▼
CanvasService.drawStroke()
    │
    ▼
Canvas updated
```

### 2. Undo/Redo

```
User clicks Undo
    │
    ▼
canvasState.undo()
    │
    ▼
HistoryService.undo()
    │
    ├─────────────────────┐
    │                     │
    ▼                     ▼
Emit 'strokeUndone'  WebSocketService.sendDraw()
    │                     │
    ▼                     ▼
CanvasService.rebuild()  Server broadcasts
    │                     │
    ▼                     ▼
Canvas updated      Other users receive
```

### 3. WebSocket Reconnection

```
Connection lost
    │
    ▼
WebSocketService.onclose
    │
    ▼
Emit 'disconnected'
    │
    ▼
setTimeout (exponential backoff)
    │
    ▼
Attempt reconnect (max 5 times)
    │
    ├─── Success ──▶ Emit 'connected'
    │
    └─── Failure ──▶ Give up
```

## Безопасность

### Клиент
- XSS защита через sanitization
- CORS ограничения
- Rate limiting на UI уровне

### Сервер
- Helmet для security headers
- CORS whitelist
- Rate limiting на всех эндпоинтах
- Bcrypt для паролей (10 rounds)
- Validator для XSS защиты
- WebSocket rate limiting

## Производительность

### Оптимизации клиента
- Buffer canvas для быстрой перерисовки
- Event batching
- Lazy loading компонентов
- Memoization в React

### Оптимизации сервера
- In-memory хранение активных комнат
- Lazy loading штрихов с диска
- Автоматическая очистка неактивных комнат
- Эффективный broadcasting

## Масштабируемость

### Текущие ограничения
- Один сервер (без кластеризации)
- In-memory состояние комнат
- Файловое хранилище

### Возможные улучшения
- Redis для shared state
- PostgreSQL для метаданных
- S3 для штрихов
- Load balancer
- Horizontal scaling

## Мониторинг

### Метрики
- Активные комнаты: `RoomManager.getStats()`
- Количество пользователей
- Количество штрихов
- WebSocket соединения

### Логирование
- Ошибки соединений
- Rate limiting violations
- Неудачные попытки входа
- Очистка комнат

## Тестирование

### Unit тесты
- Каждый сервис тестируется независимо
- Mock WebSocket для RoomManager
- Mock файловая система для DataStore

### Integration тесты
- Полный flow рисования
- WebSocket соединение
- Undo/Redo
- Создание комнат

### E2E тесты
- Полный user journey
- Мобильная версия
- Pinch-to-zoom
- Чат

## Обратная совместимость

Все legacy методы сохранены в canvasState:
- `setSocket()` - no-op
- `setSessionId()` - no-op
- `handleMessage()` - делегирует WebSocketService
- `drawSingleStroke()` - делегирует CanvasService

Это позволяет постепенную миграцию без breaking changes.
