# Coloring Book Mode - Implementation TODO

## Backend
- [x] 1. `server/index.js` — Add `coloring_pages` table in `initDb()`
- [x] 2. `server/routes/admin.js` — Add multer + coloring pages CRUD routes
- [x] 3. `server/routes/api.js` — Add public `GET /api/coloring-pages` endpoint

## Frontend
- [x] 4. `client/src/store/adminState.js` — Add coloring pages state & methods
- [x] 5. `client/src/components/AdminPage.jsx` — Add "Игровые режимы" tab
- [x] 6. `client/src/components/GamesModal.jsx` — Update coloring mode to navigate to /coloring
- [x] 7. `client/src/App.jsx` — Add /coloring route, hide global UI
- [x] 8. `client/src/components/ColoringPage.jsx` — NEW: full coloring page component
- [x] 9. `client/src/styles/coloring.scss` — NEW: styles for coloring page
- [x] 10. `client/src/styles/app.scss` — coloring.scss imported directly in App.jsx
