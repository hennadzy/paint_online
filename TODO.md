# TODO — SEO-разделы раскрасок и админка (индексация `/coloring/:sectionSlug(/:roomSlug)`)

## 0. Редакционные решения (зафиксировать до кода)
- [x] Подтверждена URL-архитектура:
  - [x] Раздел: `/coloring/<sectionSlug>`
  - [x] Комната внутри раздела: `/coloring/<sectionSlug>/<roomSlug>`
- [x] “Комната раскрасок” — новая сущность (НЕ canvas-комнаты `rooms`).

## 1. Исследование текущей реализации
- [x] Прочитать `client/src/store/adminState.js` (как работает админка для coloring_pages и какие методы/стейты использовать)
- [x] Прочитать `client/src/components/SeoMeta.jsx` (как формируется title/description для `/coloring` и что можно переиспользовать)
- [x] Найти источник `robots.txt` и проверить текущие правила для `/coloring`:
  - [x] статический файл (client/build/robots.txt) — `Allow: /coloring` и `Sitemap` на `/sitemap.xml`
  - [x] обновлён `client/public/robots.txt` — добавлен `Allow: /coloring/*`
- [x] Убедиться в серверной логике X-Robots-Tag: `noindex` стоит только для canvas-комнатных SPA-роутов `/:id`, но не для `/coloring/*`

## 2. Данные и БД
- [x] Подготовить схему/миграции:
  - [x] таблица `coloring_sections` (slug, title, seo_text ~2000 знаков)
  - [x] таблица `coloring_rooms` (section_id, slug, title, seo_text ~2000 знаков)
  - [x] добавить `room_id` (FK) в `coloring_pages` и индекс по нему + `is_active`
- [x] Обновить/добавить миграции в `server/migrations/*`:
  - [x] `server/migrations/create_coloring_sections_rooms.sql`

## 3. Backend API
- [x] Добавить public API:
  - [x] `GET /api/coloring-sections`
  - [x] `GET /api/coloring-sections/:sectionSlug/rooms`
  - [x] `GET /api/coloring-sections/:sectionSlug/:roomSlug/pages`
- [x] Добавить admin API:
  - [x] `POST /api/admin/coloring-sections` (создать раздел из админки)
  - [x] `GET /api/admin/coloring-sections` (для select)
  - [x] расширить создание/обновление `coloring_pages`:
    - [x] `POST /api/admin/game-modes/coloring` — добавляет `room_id`
    - [x] `PUT /api/admin/game-modes/coloring/:id` — обновляет `room_id`
- [x] Обновить `server/index.js`:
  - [x] добавить server-side SEO routes:
    - [x] `GET /coloring/:sectionSlug`
    - [x] `GET /coloring/:sectionSlug/:roomSlug`

## 4. SEO и индексация
- [x] В server-side routes:
  - [x] подмена `<title>`, description/keywords, og:title/og:description, canonical
  - [x] вставка скрытого indexable контента (h1 + seo_text + внутренние ссылки)
- [x] `sitemap.xml`:
  - [x] добавить url `/coloring/<sectionSlug>`
  - [x] добавить url `/coloring/<sectionSlug>/<roomSlug>`

## 5. Frontend роутинг и UI
- [x] React Router:
  - [x] добавить маршруты `/coloring/:sectionSlug` и `/coloring/:sectionSlug/:roomSlug`
- [x] Разделы:
  - [x] реализован каталог комнат внутри `/coloring/:sectionSlug` на базе `ColoringPage`
- [x] Комнаты:
  - [x] список комнат внутри раздела (режим без `roomSlug`)
- [x] Страница комнаты:
  - [x] получение `/api/coloring-sections/:sectionSlug/:roomSlug/pages` и вывод раскрасок
- [x] SEO на фронте:
  - [x] фронт не перетирает server-side SEO для режимов каталог/комната (через `setSeoData(null)`), а для выбранной конкретной раскраски SEO уточняется

## 6. Админка
- [x] В `AdminPage` (gameModes/coloring upload):
  - [x] добавить select “Раздел”
  - [x] добавить select “Комната” (зависит от выбранного раздела)
  - [x] добавить кнопку “Создать новый раздел”
    - [x] модалка/форма: title, slug, seo_text (~2000 знаков)
- [x] В `adminState`:
  - [x] методы загрузки sections и rooms для select
  - [x] отправка `room_id` при загрузке/редактировании coloring page
  - [x] обновление списка раскрасок при изменениях

## 7. Тексты SEO (~2000 знаков)
- [x] Подготовить/загрузить SEO-тексты для разделов и комнат (~2000 знаков RU) в БД:
  - Добавлена миграция `server/migrations/seed_coloring_sections_rooms_ru.sql` (seed для `coloring_sections` и `coloring_rooms`)

## 8. Тестирование (критический путь)
- [ ] Проверить URL-рендер (браузер/сервер):
  - [ ] `/coloring` (каталог — базовая SPA)
  - [ ] `/coloring/<sectionSlug>` (server-side SEO, скрытый indexable-контент)
  - [ ] `/coloring/<sectionSlug>/<roomSlug>` (server-side SEO, скрытый indexable-контент)
- [ ] Проверить индексационные заголовки:
  - [ ] убедиться, что нет `noindex` для `/coloring/*`
- [ ] Проверить новые API через curl:
  - [ ] sections list (`/api/coloring-sections`)
  - [ ] rooms list по section (`/api/coloring-sections/:sectionSlug/rooms`)
  - [ ] pages list по room (`/api/coloring-sections/:sectionSlug/:roomSlug/pages`)
- [ ] Проверить админку критические действия:
  - [ ] создать раздел
  - [ ] создать раскраску с привязкой к разделу/комнате
  - [ ] убедиться, что URL попали в `sitemap.xml`
