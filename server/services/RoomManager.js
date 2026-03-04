// server/services/RoomManager.js
const { redis } = require('../config/db');
const DataStore = require('./DataStore');

class RoomManager {
  constructor() {
    // Локальное хранилище сокетов для быстрой рассылки (только в памяти этого сервера)
    this.roomSockets = new Map(); // roomId -> Set(ws)
  }

  /**
   * Добавить пользователя в комнату
   * @param {string} roomId
   * @param {string} username
   * @param {WebSocket} ws
   * @returns {Promise<{strokes: Array}>}
   */
  async addUser(roomId, username, ws) {
    // Проверяем, не полная ли комната (лимит 10)
    const userCount = await redis.scard(`room:${roomId}:users`);
    if (userCount >= 10) {
      throw new Error('Room is full');
    }

    // Генерируем уникальный идентификатор для этого соединения
    const wsId = this._getWsId(ws);

    // Атомарно добавляем пользователя в Redis
    const multi = redis.multi();
    multi.sadd(`room:${roomId}:users`, username);
    multi.hset(`ws:${wsId}`, 'roomId', roomId, 'username', username, 'lastActivity', Date.now());
    multi.set(`user:${username}:room`, roomId);
    await multi.exec();

    // Обновляем время активности комнаты в PostgreSQL
    await DataStore.updateRoomActivity(roomId);

    // Сохраняем сокет в локальном хранилище для рассылки
    if (!this.roomSockets.has(roomId)) {
      this.roomSockets.set(roomId, new Set());
    }
    this.roomSockets.get(roomId).add(ws);

    // Получаем текущие штрихи комнаты (из Redis или PostgreSQL)
    const strokes = await this.getRoomStrokes(roomId);
    return { strokes };
  }

  /**
   * Удалить пользователя из комнаты
   * @param {WebSocket} ws
   * @returns {Promise<{roomId: string, username: string} | null>}
   */
  async removeUser(ws) {
    const wsId = this._getWsId(ws);
    const userData = await redis.hgetall(`ws:${wsId}`);
    if (!userData.roomId) return null;

    const { roomId, username } = userData;

    // Удаляем пользователя из Redis
    const multi = redis.multi();
    multi.srem(`room:${roomId}:users`, username);
    multi.del(`ws:${wsId}`);
    multi.del(`user:${username}:room`);
    await multi.exec();

    // Удаляем сокет из локального хранилища
    const roomSockets = this.roomSockets.get(roomId);
    if (roomSockets) {
      roomSockets.delete(ws);
      if (roomSockets.size === 0) {
        this.roomSockets.delete(roomId);
      }
    }

    // Если комната опустела – сохраняем все штрихи из Redis в PostgreSQL
    const remaining = await redis.scard(`room:${roomId}:users`);
    if (remaining === 0) {
      const strokes = await redis.lrange(`room:${roomId}:strokes`, 0, -1);
      if (strokes.length > 0) {
        const strokesObjects = strokes.map(s => JSON.parse(s));
        await DataStore.saveStrokes(roomId, strokesObjects);
      }
      await redis.del(`room:${roomId}:strokes`);
    }

    return { roomId, username };
  }

  /**
   * Добавить штрих в комнату (сохраняем только в Redis)
   * @param {string} roomId
   * @param {Object} stroke
   */
  async addStroke(roomId, stroke) {
    await redis.rpush(`room:${roomId}:strokes`, JSON.stringify(stroke));
  }

  /**
   * Получить все штрихи комнаты (сначала из Redis, если нет – из PostgreSQL)
   * @param {string} roomId
   * @returns {Promise<Array>}
   */
  async getRoomStrokes(roomId) {
    let strokes = await redis.lrange(`room:${roomId}:strokes`, 0, -1);
    if (strokes.length > 0) {
      return strokes.map(s => JSON.parse(s));
    }

    // Если в Redis пусто – загружаем из PostgreSQL
    const dbStrokes = await DataStore.loadStrokes(roomId);
    if (dbStrokes.length > 0) {
      // Сохраняем в Redis для быстрого доступа
      const multi = redis.multi();
      for (const s of dbStrokes) {
        multi.rpush(`room:${roomId}:strokes`, JSON.stringify(s));
      }
      await multi.exec();
    }
    return dbStrokes;
  }

  /**
   * Очистить все штрихи комнаты (и из Redis, и из PostgreSQL)
   * @param {string} roomId
   */
  async clearStrokes(roomId) {
    await redis.del(`room:${roomId}:strokes`);
    await DataStore.deleteStrokes(roomId);
  }

  /**
   * Получить список пользователей в комнате
   * @param {string} roomId
   * @returns {Promise<string[]>}
   */
  async getRoomUsers(roomId) {
    return redis.smembers(`room:${roomId}:users`);
  }

  /**
   * Обновить время активности пользователя
   * @param {WebSocket} ws
   */
  async updateUserActivity(ws) {
    const wsId = this._getWsId(ws);
    await redis.hset(`ws:${wsId}`, 'lastActivity', Date.now());
  }

  /**
   * Получить информацию о пользователе по соединению
   * @param {WebSocket} ws
   * @returns {Promise<{roomId: string, username: string} | null>}
   */
  async getUserInfo(ws) {
    const wsId = this._getWsId(ws);
    const data = await redis.hgetall(`ws:${wsId}`);
    if (!data.roomId) return null;
    return { roomId: data.roomId, username: data.username };
  }

  /**
   * Получить все сокеты комнаты (для рассылки)
   * @param {string} roomId
   * @returns {Set<WebSocket> | undefined}
   */
  getRoomSockets(roomId) {
    return this.roomSockets.get(roomId);
  }

  // Вспомогательный метод для получения/генерации ID соединения
  _getWsId(ws) {
    if (!ws._id) {
      ws._id = `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    return ws._id;
  }
}

module.exports = new RoomManager();
