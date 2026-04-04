/**
 * Централизованный обработчик ошибок для Express
 */

// Типы ошибок
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, errors = {}) {
    super(message, 400);
    this.errors = errors;
    this.name = 'ValidationError';
  }
}

class AuthError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
    this.name = 'AuthError';
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403);
    this.name = 'ForbiddenError';
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Not Found') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

// Обработчик асинхронных функций для Express
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Middleware для обработки ошибок
const errorMiddleware = (err, req, res, next) => {
  console.error('Error:', err);

  // Если ошибка операционная (ожидаемая), отправляем соответствующий статус и сообщение
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      error: err.message,
      ...(err.errors && { errors: err.errors }),
    });
  }

  // Для неожиданных ошибок отправляем общее сообщение
  const isDev = process.env.NODE_ENV !== 'production';
  
  res.status(500).json({
    error: isDev ? err.message : 'Внутренняя ошибка сервера',
    ...(isDev && { stack: err.stack }),
  });
};

// Обработчик для неперехваченных исключений и отклоненных промисов
const setupGlobalErrorHandlers = () => {
  process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION:', err);
    console.error('Shutting down...');
    process.exit(1);
  });

  process.on('unhandledRejection', (err) => {
    console.error('UNHANDLED REJECTION:', err);
    console.error('Shutting down...');
    process.exit(1);
  });
};

module.exports = {
  AppError,
  ValidationError,
  AuthError,
  ForbiddenError,
  NotFoundError,
  asyncHandler,
  errorMiddleware,
  setupGlobalErrorHandlers,
};
