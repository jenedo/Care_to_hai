export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;
  readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode = 500,
    code = "INTERNAL_ERROR",
    details?: unknown,
    isOperational = true,
  ) {
    super(message);

    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = isOperational;

    Object.setPrototypeOf(this, new.target.prototype);

    const captureStackTrace = (
      Error as ErrorConstructor & {
        captureStackTrace?: (targetObject: object, constructorOpt?: Function) => void;
      }
    ).captureStackTrace;

    captureStackTrace?.(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = "Resource") {
    super(`${resource} not found`, 404, "NOT_FOUND");
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 400, "VALIDATION_ERROR", details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(message, 401, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(message, 403, "FORBIDDEN");
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 409, "CONFLICT", details);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = "Too many requests") {
    super(message, 429, "TOO_MANY_REQUESTS");
  }
}

export type ApiResponse<T = unknown> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error: {
        code: string;
        message: string;
        details?: unknown;
      };
    };

export function ok<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    data,
  };
}

export function fail(
  code: string,
  message: string,
  details?: unknown,
): ApiResponse<never> {
  return {
    success: false,
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {}),
    },
  };
}

export function failFromError(error: AppError): ApiResponse<never> {
  return fail(error.code, error.message, error.details);
}
