// Typed error hierarchy. The global error handler maps these to responses;
// anything else becomes a generic 500 — internal messages and stacks are
// never leaked to clients.

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(code: string, message: string, statusCode: number) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super('NOT_FOUND', message, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super('UNAUTHORIZED', message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super('FORBIDDEN', message, 403);
  }
}

export class InvalidTransitionError extends AppError {
  constructor(from: string, to: string) {
    super('INVALID_TRANSITION', `Transition ${from} -> ${to} is not allowed`, 409);
  }
}

export class ValidationFailedError extends AppError {
  constructor(message: string) {
    super('VALIDATION_FAILED', message, 400);
  }
}
