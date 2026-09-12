import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/AppError';

// Centralized error formatting. Production responses never leak stack
// traces, SQL, or other internals; diagnostics go to server logs only.
// Request bodies are intentionally NOT logged (they may carry credentials).
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // Required 4-arg signature for Express error middleware.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details !== undefined ? { details: err.details } : {}),
      },
    });
    return;
  }

  // Malformed JSON rejected by express.json().
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({
      error: { code: 'INVALID_JSON', message: 'Malformed JSON in request body' },
    });
    return;
  }

  const message = err instanceof Error ? err.message : 'Unknown error';
  console.error(`Unhandled error: ${req.method} ${req.path} - ${message}`);

  const isProduction = process.env.NODE_ENV === 'production';
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: isProduction ? 'Internal server error' : message,
    },
  });
}
