/**
 * Скрипт для удаления дубликатов штрихов во всех комнатах
 * Запускать: node server/scripts/cleanup-duplicate-strokes.js
 */

const { pgPool } = require('../config/db');

async function cleanupDuplicateStrokes() {
 console.log('Начинаем очистку дубликатов штрихов...\n');

 // Получаем все комнаты
 const roomsResult = await pgPool.query('SELECT id, name FROM rooms');
 const rooms = roomsResult.rows;

 console.log(`Найдено комнат: ${rooms.length}\n`);

 let totalDeleted =0;
 let totalUnique =0;

 for (const room of rooms) {
 // Получаем все штрихи комнаты с их ID
 const strokesResult = await pgPool.query(
 `SELECT id, stroke_data, created_at FROM strokes WHERE room_id = $1 ORDER BY created_at`,
 [room.id]
 );

 if (strokesResult.rows.length ===0) {
 console.log(`[${room.id}] ${room.name || 'Без имени'}: штрихов нет`);
 continue;
 }

 // Группируем по ID штриха (из stroke_data->>'id')
 const strokeIds = new Map();
 for (const row of strokesResult.rows) {
 try {
 const strokeData = typeof row.stroke_data === 'string' 
 ? JSON.parse(row.stroke_data) 
 : row.stroke_data;
 const strokeId = strokeData?.id;
        
 if (!strokeId) continue;

 if (!strokeIds.has(strokeId)) {
 strokeIds.set(strokeId, []);
 }
 strokeIds.get(strokeId).push(row.id);
 } catch (e) {
 // Пропускаем некорректные данные
 }
 }

 // Находим дубликаты
 const duplicateIds = [];
 for (const [strokeId, ids] of strokeIds) {
 if (ids.length >1) {
 // Оставляем первый, остальные удаляем
 duplicateIds.push(...ids.slice(1));
 }
 }

 const uniqueCount = strokesResult.rows.length - duplicateIds.length;
 totalUnique += uniqueCount;

 if (duplicateIds.length >0) {
 // Удаляем дубликаты
 await pgPool.query(
 'DELETE FROM strokes WHERE id = ANY($1)',
 [duplicateIds]
 );
      
 totalDeleted += duplicateIds.length;
 console.log(`[${room.id}] ${room.name || 'Без имени'}: удалено ${duplicateIds.length} дублей, уникальных: ${uniqueCount}`);
 } else {
 console.log(`[${room.id}] ${room.name || 'Без имени'}: уникальных: ${uniqueCount}, дубликатов нет`);
 }
 }

 console.log(`\n=== Результат ===`);
 console.log(`Всего уникальных штрихов: ${totalUnique}`);
 console.log(`Всего удалено дубликатов: ${totalDeleted}`);
 console.log(`\nОчистка завершена!`);

 process.exit(0);
}

cleanupDuplicateStrokes().catch(err => {
 console.error('Ошибка:', err);
 process.exit(1);
});
