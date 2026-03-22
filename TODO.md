# TODO: Fix Personal Messages Real-time Delivery

## Root Cause
Server rejects WS connection with `roomId='personal'` + auth token because auth token has no `roomId` field.
`userSockets` map is never populated for profile-page users → messages not delivered in real-time.

## Steps

- [x] 1. Create `client/src/services/PersonalWSService.js` — dedicated WS service for personal messages
- [x] 2. Update `server/services/WebSocketHandler.js` — add personal connection handler, remove userSockets from room handleConnection
- [x] 3. Update `server/index.js` — add `/ws/personal` WebSocket endpoint
- [x] 4. Update `client/src/App.jsx` — connect PersonalWSService when authenticated, global listener
- [x] 5. Update `client/src/components/PersonalMessagesModal.jsx` — use PersonalWSService, remove broken WS logic
