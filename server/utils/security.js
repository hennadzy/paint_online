const crypto = require('crypto');
const validator = require('validator');
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

const sanitizeInput = (input, maxLength) => {
  if (typeof input !== 'string') return '';

  let sanitized = input.trim().slice(0, maxLength);
  sanitized = validator.escape(sanitized);

  return sanitized;
};

const sanitizeChatMessage = (text) => {
  if (typeof text !== 'string') return '';

  let sanitized = text.trim();

  if (sanitized.length > 1000) {
    sanitized = sanitized.slice(0, 1000);
  }

  sanitized = sanitized.normalize('NFKC');

  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '');

  sanitized = DOMPurify.sanitize(sanitized, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel):)/i,
    USE_PROFILES: { html: false, svg: false, mathMl: false }
  });

  sanitized = sanitized.replace(/<[^>]*>/g, '');

  sanitized = sanitized
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");

  return sanitized.trim();
};

const sanitizeBroadcastSubject = (text) => {
  if (typeof text !== 'string') return '';
  let s = text.trim().slice(0, 200);
  s = s.normalize('NFKC');
  s = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '');
  s = DOMPurify.sanitize(s, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true
  });
  s = s.replace(/<[^>]*>/g, '');
  s = s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
  return s.trim();
};

const sanitizeBroadcastBody = (text, maxLength = 15000) => {
  if (typeof text !== 'string') return '';
  let sanitized = text.trim();
  if (sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength);
  }
  sanitized = sanitized.normalize('NFKC');
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '');
  sanitized = DOMPurify.sanitize(sanitized, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel):)/i,
    USE_PROFILES: { html: false, svg: false, mathMl: false }
  });
  sanitized = sanitized.replace(/<[^>]*>/g, '');
  sanitized = sanitized
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
  return sanitized.trim();
};

const validateUsername = (username) => {
  if (typeof username !== 'string') {
    return { valid: false, error: 'Имя должно быть текстом' };
  }

  const trimmed = username.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: 'Введите ваше имя' };
  }

  if (trimmed.length < 2) {
    return { valid: false, error: 'Имя должно содержать минимум 2 символа' };
  }

  if (trimmed.length > 30) {
    return { valid: false, error: 'Имя не должно превышать 30 символов' };
  }

  const invalidChars = trimmed.match(/[^a-zA-Zа-яА-ЯёЁ0-9\s]/g);
  if (invalidChars) {
    const uniqueChars = [...new Set(invalidChars)].join(', ');
    return {
      valid: false,
      error: `Недопустимые символы: ${uniqueChars}. Используйте только буквы, цифры и пробелы`
    };
  }

  const dangerousWords = [
    { pattern: /admin/gi, word: 'admin' },
    { pattern: /moderator/gi, word: 'moderator' },
    { pattern: /system/gi, word: 'system' },
    { pattern: /bot/gi, word: 'bot' },
    { pattern: /null/gi, word: 'null' },
    { pattern: /undefined/gi, word: 'undefined' }
  ];

  for (const { pattern, word } of dangerousWords) {
    if (pattern.test(trimmed)) {
      return {
        valid: false,
        error: `Слово "${word}" запрещено в имени`
      };
    }
  }

  return { valid: true, username: trimmed };
};

const sanitizeUsername = (username, isPrivileged = false) => {
  if (typeof username !== 'string') return '';

  let sanitized = username.trim();

  if (sanitized.length > 30) {
    sanitized = sanitized.slice(0, 30);
  }

  sanitized = sanitized.normalize('NFKC');

  sanitized = sanitized.replace(/[^a-zA-Zа-яА-ЯёЁ0-9\s]/g, '');

  sanitized = sanitized.replace(/\s+/g, ' ');

  if (!isPrivileged) {
    const dangerousPatterns = [
      /admin/gi,
      /moderator/gi,
      /system/gi,
      /bot/gi,
      /null/gi,
      /undefined/gi
    ];

    dangerousPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });
  }

  sanitized = validator.escape(sanitized);

  return sanitized.trim();
};

const generateId = () => {
  const bytes = crypto.randomBytes(9);
  return bytes.toString('hex').slice(0, 9);
};

const MAX_STROKE_JSON_BYTES = 1.5 * 1024 * 1024;

const getStrokePayloadSize = (stroke) => {
  try {
    return Buffer.byteLength(JSON.stringify(stroke), 'utf8');
  } catch {
    return Number.POSITIVE_INFINITY;
  }
};

const isStrokePayloadTooLarge = (stroke) => {
  return getStrokePayloadSize(stroke) > MAX_STROKE_JSON_BYTES;
};

module.exports = {
  sanitizeInput,
  sanitizeChatMessage,
  sanitizeBroadcastSubject,
  sanitizeBroadcastBody,
  sanitizeUsername,
  validateUsername,
  generateId,
  getStrokePayloadSize,
  isStrokePayloadTooLarge,
  MAX_STROKE_JSON_BYTES,
};
