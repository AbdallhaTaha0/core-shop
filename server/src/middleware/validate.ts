import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../utils/AppError';

// Reusable Zod validation middleware. Controllers behind this middleware
// only ever see validated, typed input. Unknown keys are stripped by
// default Zod object behavior only when `.strict()` is used — schemas that
// must reject mass-assignment should use `.strict()`.
function validatePart<T extends z.ZodType>(
  schema: T,
  pick: (req: Request) => unknown,
  assign: (req: Request, value: z.infer<T>) => void,
  label: string,
) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(pick(req));
    if (!result.success) {
      next(new AppError(400, 'VALIDATION_ERROR', `Invalid ${label}`, z.flattenError(result.error)));
      return;
    }
    assign(req, result.data);
    next();
  };
}

export function validateBody<T extends z.ZodType>(
  schema: T,
): (req: Request, res: Response, next: NextFunction) => void {
  return validatePart(
    schema,
    (req) => req.body,
    (req, value) => {
      req.body = value;
    },
    'request body',
  );
}

export function validateQuery<T extends z.ZodType>(
  schema: T,
): (req: Request, res: Response, next: NextFunction) => void {
  return validatePart(
    schema,
    (req) => req.query,
    (req, value) => {
      req.validatedQuery = value;
    },
    'query parameters',
  );
}

export function validateParams<T extends z.ZodType>(
  schema: T,
): (req: Request, res: Response, next: NextFunction) => void {
  return validatePart(
    schema,
    (req) => req.params,
    (req, value) => {
      // Same note as validateQuery: the value is schema-validated at runtime.
      req.params = value as Request['params'];
    },
    'route parameters',
  );
}
