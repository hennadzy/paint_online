const validator = require('validator');

/**
 * Sanitize user input to prevent XSS attacks
 */
const sanitizeInput = (input, maxLength) => {
  if (typeof input !== 'string') return '';
  
  let sanitized = input.trim().slice(0, maxLength);
  sanitized = validator.escape(sanitized);
  
  // Additional protection
  sanitized = sanitized.replace(/javascript:/gi, '')
                       .replace(/on\w+\s*=/gi, '')
                       .replace(/<script/gi, '')
                       .replace(/<\/script>/gi, '');
  
  return sanitized;
};

/**
 * Generate unique ID
 */
const generateId = () => {
  return Math.random().toString(36).substring(2, 11);
};

module.exports = {
  sanitizeInput,
  generateId
};
