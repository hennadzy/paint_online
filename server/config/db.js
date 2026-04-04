const { Pool } = require('pg');
const Redis = require('ioredis');

let pgPool;
let redis;

// Приоритет: DATABASE_URL > индивидуальные переменные > значения по умолчанию
if (process.env.DATABASE_URL) {
  pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
} else {
  pgPool = new Pool({
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'paint_online',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
  
  if (process.env.NODE_ENV !== 'production') {
    console.log('Using database connection:', {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'paint_online',
      user: process.env.DB_USER || 'postgres',
      ssl: false
    });
  }
}

// Приоритет: REDIS_URL > индивидуальные переменные > значения по умолчанию
if (process.env.REDIS_URL) {
  redis = new Redis(process.env.REDIS_URL);
} else {
  redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined
  });
  
  if (process.env.NODE_ENV !== 'production') {
    console.log('Using Redis connection:', {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379
    });
  }
}

module.exports = { pgPool, redis };
