# Исправления для раздела раскрасок

## Изменения

### 1. Исправлена ошибка "Не удалось загрузить список раскрасок"
- Улучшена обработка ошибок API с детальным логированием статуса и текста ошибки
- Сообщение об ошибке теперь более информативное: "Не удалось загрузить список раскрасок. Проверьте соединение с интернетом."

### 2. Добавлены изображения для разделов раскрасок
- Добавлено поле `image_url` в таблицу `coloring_sections`
- Обновлены API endpoints для возврата поля `imageUrl`
- Обновлена админ-панель для загрузки URL изображения при создании раздела
- Обновлена страница раскрасок для отображения изображений разделов
- Добавлена заглушка при отсутствии изображения

## Автоматическая миграция

**Миграция применяется автоматически при перезапуске сервера!**

При запуске сервера выполняются:
1. Создание таблицы `coloring_sections` (если не существует)
2. Добавление поля `image_url` (если отсутствует)
3. Заполнение тестовыми разделами (если таблица пуста)
4. Присвоение URL изображений существующим разделам

Вам **не нужно** вручную применять SQL-миграции.

## Применение миграций (если нужно вручную)

### Через SQL клиент (опционально)

Если вы хотите применить миграцию вручную без перезапуска сервера:

```sql
-- Файл: server/migrations/add_image_url_to_coloring_sections.sql
ALTER TABLE coloring_sections
  ADD COLUMN IF NOT EXISTS image_url VARCHAR(500) DEFAULT NULL;

COMMENT ON COLUMN coloring_sections.image_url IS 'URL или путь к изображению превью раздела';
```

**Способ 1: Через pgAdmin или другой SQL клиент:**
1. Откройте файл `server/migrations/add_image_url_to_coloring_sections.sql`
2. Выполните SQL-запрос в вашей базе данных

**Способ 2: Через командную строку:**
```bash
psql -U postgres -d risovanie_online -f server/migrations/add_image_url_to_coloring_sections.sql
```

### Обновление изображений для разделов (опционально)

```bash
psql -U postgres -d risovanie_online -f server/migrations/update_sections_with_images.sql
```

**Способ 1: Через pgAdmin или другой SQL клиент:**
1. Откройте файл `server/migrations/add_image_url_to_coloring_sections.sql`
2. Выполните SQL-запрос в вашей базе данных

**Способ 2: Через командную строку (если PostgreSQL доступен):**
```bash
psql -U postgres -d risovanie_online -f server/migrations/add_image_url_to_coloring_sections.sql
```

### Шаг 2: (Опционально) Добавить изображения для существующих разделов

Выполните скрипт для добавления тестовых URL:

```bash
psql -U postgres -d risovanie_online -f server/migrations/update_sections_with_images.sql
```

Или обновите вручную через админ-панель.

### Шаг 3: Перезапустить сервер

```bash
# Остановить текущий сервер
# Запустить заново
cd server
npm start

# Или в режиме разработки
npm run dev
```

## Добавление изображений для разделов

### Через админ-панель

1. Откройте админ-панель: `https://risovanie.online/admin`
2. Перейдите в раздел "Раскраски"
3. Нажмите "+ Создать раздел"
4. Заполните поля:
   - Заголовок раздела
   - Slug (URL) - генерируется автоматически
   - **URL изображения превью** - укажите путь к изображению
   - SEO-текст
5. Нажмите "Создать"

### Редактирование существующего раздела

Для добавления изображения к существующему разделу выполните SQL:

```sql
UPDATE coloring_sections 
SET image_url = '/uploads/coloring/your-image.jpg'
WHERE slug = 'your-section-slug';
```

Или через админ-панель (если функционал редактирования доступен).

### Форматы URL изображений

- Абсолютный URL: `https://example.com/image.jpg`
- Относительный путь: `/uploads/coloring/section.jpg`
- Путь на сервере: будет обрабатываться через `coloringAssetUrl()`

## Рекомендуемые размеры изображений

- Формат: JPG, PNG, WebP
- Размер: 300x200px (пропорция 3:2)
- Максимальный размер файла: 500 КБ
- Качество: среднее для быстрой загрузки

## Структура файлов для изображений

Создайте директорию для изображений разделов:

```
server/files/coloring/
├── cartoons-section.jpg
├── animals-section.jpg
├── cars-section.jpg
├── princess-section.jpg
├── nature-section.jpg
├── space-section.jpg
├── fairytales-section.jpg
└── transport-section.jpg
```

Или используйте внешний хостинг изображений.

## Проверка работы

1. Перезапустите сервер:
   ```bash
   cd server
   npm start
   ```
2. Проверьте логи сервера - должны быть сообщения:
   ```
   ✅ Migration: Added image_url column to coloring_sections
   ✅ Migration: Updated X sections with default image URLs
   ```
3. Откройте страницу раскрасок: `https://risovanie.online/coloring`
4. Проверьте, что разделы отображаются с изображениями
5. Проверьте консоль браузера на отсутствие ошибок

## Отладка

### Если изображения не отображаются:

1. Проверьте консоль браузера на наличие ошибок CORS
2. Проверьте логи сервера на наличие ошибок базы данных
3. Убедитесь, что поле `image_url` заполнено в базе данных:
   ```sql
   SELECT id, slug, title, image_url FROM coloring_sections;
   ```

### Если ошибка "Не удалось загрузить список раскрасок" сохраняется:

1. Проверьте, что сервер запущен и доступен
2. Проверьте подключение к базе данных
3. Проверьте логи сервера:
   ```bash
   cd server
   npm start 2>&1 | tee server.log
   ```
4. Проверьте консоль браузера (F12) на наличие ошибок сети

### Проверка API endpoints:

```bash
# Получить список разделов
curl https://risovanie.online/api/coloring-sections

# Получить раскраски раздела
curl https://risovanie.online/api/coloring-sections/cartoons/pages
```

## Изменённые файлы

### Backend:
- `server/index.js` - добавлена автоматическая миграция при запуске
- `server/routes/api.js` - обновлён GET `/api/coloring-sections`
- `server/routes/admin.js` - обновлены GET и POST `/api/admin/coloring-sections`
- `server/migrations/add_image_url_to_coloring_sections.sql` - SQL миграция (для ручного применения)
- `server/migrations/update_sections_with_images.sql` - скрипт для тестовых данных

### Frontend:
- `client/src/components/ColoringPage.jsx` - улучшена обработка ошибок, добавлено отображение изображений разделов
- `client/src/components/AdminPage.jsx` - добавлено поле для URL изображения в форме создания раздела
- `client/src/store/adminState.js` - автоматически передаёт imageUrl (без изменений)

### Документация:
- `COLORING_FIXES.md` - этот файл
