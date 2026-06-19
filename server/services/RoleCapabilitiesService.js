const { pgPool } = require('../config/db');

const FEATURE_IDS = ['penPressure', 'brushPro'];

const FEATURE_DEFS = {
  penPressure: {
    label: 'Сила нажатия пера',
    description:
      'Переменная толщина линии от нажима стилуса на планшете. Без опции линия фиксированной толщины, как у мыши.',
  },
  brushPro: {
    label: 'Группа кистей Brush Pro',
    description:
      'Профессиональные кисти: акварель, масляная, пастель и каллиграфическая. Доступна зарегистрированным пользователям по ролям.',
  },
};

const ROLE_IDS = ['guest', 'user', 'premium', 'admin'];

const ROLE_LABELS = {
  guest: 'Гость (не зарегистрирован)',
  user: 'Автор (зарегистрирован)',
  premium: 'Премиум',
  admin: 'Администратор',
};

const DEFAULT_CONFIG = {
  features: {
    penPressure: { enabled: true },
    brushPro: { enabled: true },
  },
  roles: {
    guest: { penPressure: false, brushPro: false },
    user: { penPressure: true, brushPro: true },
    premium: { penPressure: true, brushPro: true },
    admin: { penPressure: true, brushPro: true },
  },
};

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function sanitizeConfig(raw) {
  const cfg = deepClone(DEFAULT_CONFIG);
  if (raw && typeof raw === 'object' && raw.features && typeof raw.features === 'object') {
    for (const fk of FEATURE_IDS) {
      if (raw.features[fk] && typeof raw.features[fk] === 'object') {
        cfg.features[fk].enabled = raw.features[fk].enabled !== false;
      }
    }
  }
  if (raw && typeof raw === 'object' && raw.roles && typeof raw.roles === 'object') {
    for (const rk of ROLE_IDS) {
      if (raw.roles[rk] && typeof raw.roles[rk] === 'object') {
        for (const fk of FEATURE_IDS) {
          if (Object.prototype.hasOwnProperty.call(raw.roles[rk], fk)) {
            cfg.roles[rk][fk] = Boolean(raw.roles[rk][fk]);
          }
        }
      }
    }
  }
  return cfg;
}

async function ensureTable() {
  await pgPool.query(`
    CREATE TABLE IF NOT EXISTS app_config (
      key VARCHAR(64) PRIMARY KEY,
      value JSONB NOT NULL DEFAULT '{}',
      updated_at BIGINT NOT NULL
    );
  `);
}

const CONFIG_KEY = 'role_capabilities';

async function getConfig() {
  await ensureTable();
  const res = await pgPool.query('SELECT value FROM app_config WHERE key = $1', [CONFIG_KEY]);
  if (res.rows.length === 0) {
    const initial = sanitizeConfig(null);
    const now = Date.now();
    await pgPool.query(
      'INSERT INTO app_config (key, value, updated_at) VALUES ($1, $2, $3)',
      [CONFIG_KEY, initial, now]
    );
    return initial;
  }
  const val = res.rows[0].value;
  const parsed = typeof val === 'string' ? JSON.parse(val) : val;
  return sanitizeConfig(parsed);
}

async function saveConfig(body) {
  const sanitized = sanitizeConfig(body);
  const now = Date.now();
  await ensureTable();
  await pgPool.query(
    `INSERT INTO app_config (key, value, updated_at) VALUES ($1, $2, $3)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at`,
    [CONFIG_KEY, sanitized, now]
  );
  return sanitized;
}

function getPublicPayload(config) {
  return {
    features: config.features,
    roles: config.roles,
  };
}

function getAdminPayload(config) {
  return {
    config,
    featureDefs: FEATURE_DEFS,
    roleLabels: ROLE_LABELS,
    roleIds: ROLE_IDS,
    featureIds: FEATURE_IDS,
  };
}

module.exports = {
  FEATURE_IDS,
  FEATURE_DEFS,
  ROLE_IDS,
  ROLE_LABELS,
  DEFAULT_CONFIG,
  getConfig,
  saveConfig,
  sanitizeConfig,
  getPublicPayload,
  getAdminPayload,
};
