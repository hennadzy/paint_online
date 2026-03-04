const { Pool } = require('pg');
const Redis = require('ioredis');

let pgPool;
let redis;

if (process.env.DATABASE_URL) {
  pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
} else {
  console.error('DATABASE_URL not set');
  pgPool = new Pool({
    user: 'postgres',
    password: 'postgres',
    host: 'localhost',
    port: 5432,
    database: 'paint_online',
    ssl: false
  });
}

if (process.env.REDIS_URL) {
  redis = new Redis(process.env.REDIS_URL);
} else {
  console.error('REDIS_URL not set');
  redis = new Redis({
    host: 'localhost',
    port: 6379
  });
}

module.exports = { pgPool, redis };
