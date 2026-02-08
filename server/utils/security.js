const crypto = require('crypto');
const validator = require('validator');
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');
const xss = require('xss');

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

const sanitizeInput = (input, maxLength) => {
  if (typeof input !== 'string') return '';
  
  let sanitized = input.trim().slice(0, maxLength);
  sanitized = validator.escape(sanitized);
  
  sanitized = sanitized.replace(/javascript:/gi, '')
                       .replace(/on\w+\s*=/gi, '')
                       .replace(/<script/gi, '')
                       .replace(/<\/script>/gi, '');
  
  return sanitized;
};

const sanitizeChatMessage = (text) => {
  if (typeof text !== 'string') return '';
  
  let sanitized = text.trim();
  
  if (sanitized.length > 1000) {
    sanitized = sanitized.slice(0, 1000);
  }
  
  sanitized = sanitized.normalize('NFKC');
  
  sanitized = sanitized.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
  
  const dangerousPatterns = [
    /javascript:/gi,
    /data:/gi,
    /vbscript:/gi,
    /file:/gi,
    /about:/gi,
    /on\w+\s*=/gi,
    /<script/gi,
    /<\/script>/gi,
    /<iframe/gi,
    /<embed/gi,
    /<object/gi,
    /<link/gi,
    /<meta/gi,
    /<style/gi,
    /<img/gi,
    /<svg/gi,
    /onerror/gi,
    /onload/gi,
    /onclick/gi,
    /onmouseover/gi,
    /onfocus/gi,
    /onblur/gi,
    /eval\s*\(/gi,
    /expression\s*\(/gi,
    /import\s+/gi,
    /document\./gi,
    /window\./gi,
    /<\?php/gi,
    /<\?=/gi,
    /<%/gi,
    /%>/gi
  ];
  
  dangerousPatterns.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '');
  });
  
  sanitized = DOMPurify.sanitize(sanitized, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true
  });
  
  sanitized = xss(sanitized, {
    whiteList: {},
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script', 'style']
  });
  
  sanitized = validator.escape(sanitized);
  
  return sanitized;
};

const checkSpam = (text, username, messageHistory = []) => {
  if (typeof text !== 'string') return { isSpam: false };
  
  const upperCaseCount = (text.match(/[A-ZА-ЯЁ]/g) || []).length;
  const totalLetters = (text.match(/[A-Za-zА-Яа-яЁё]/g) || []).length;
  if (totalLetters > 0 && (upperCaseCount / totalLetters) > 0.7) {
    return { isSpam: true, reason: 'Слишком много заглавных букв' };
  }
  
  const repeatingPattern = /(.)\1{9,}/;
  if (repeatingPattern.test(text)) {
    return { isSpam: true, reason: 'Повторяющиеся символы' };
  }
  
  const emojiPattern = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
  const emojiCount = (text.match(emojiPattern) || []).length;
  if (emojiCount > 10) {
    return { isSpam: true, reason: 'Слишком много эмодзи' };
  }
  
  const now = Date.now();
  const recentMessages = messageHistory.filter(msg => 
    msg.username === username && (now - msg.timestamp) < 3000
  );
  if (recentMessages.length >= 3) {
    return { isSpam: true, reason: 'Слишком частые сообщения' };
  }
  
  return { isSpam: false };
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

const sanitizeUsername = (username) => {
  if (typeof username !== 'string') return '';
  
  let sanitized = username.trim();
  
  if (sanitized.length > 30) {
    sanitized = sanitized.slice(0, 30);
  }
  
  sanitized = sanitized.normalize('NFKC');
  
  sanitized = sanitized.replace(/[^a-zA-Zа-яА-ЯёЁ0-9\s]/g, '');
  
  sanitized = sanitized.replace(/\s+/g, ' ');
  
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
  
  sanitized = validator.escape(sanitized);
  
  return sanitized.trim();
};

const generateId = () => {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 9);
  }
  return Math.random().toString(36).substring(2, 11);
};

module.exports = {
  sanitizeInput,
  sanitizeChatMessage,
  sanitizeUsername,
  validateUsername,
  checkSpam,
  generateId
};
