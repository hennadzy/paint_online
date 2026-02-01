const validator = require('validator');

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

const generateId = () => {
  return Math.random().toString(36).substring(2, 11);
};

module.exports = {
  sanitizeInput,
  generateId
};
