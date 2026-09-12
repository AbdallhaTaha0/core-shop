import type { NextFunction, Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { validateBody, validateParams, validateQuery } from '../src/middleware/validate';
import { AppError } from '../src/utils/AppError';

function runMiddleware(
  middleware: (req: Request, res: Response, next: NextFunction) => void,
  req: Partial<Request>,
): { next: ReturnType<typeof vi.fn>; req: Request } {
  const fullReq = req as Request;
  const res = {} as Response;
  const next = vi.fn();
  middleware(fullReq, res, next as unknown as NextFunction);
  return { next, req: fullReq };
}

describe('validateBody', () => {
  const schema = z.object({ name: z.string().min(1) });

  it('passes validated data through and calls next without an error', () => {
    const { next, req } = runMiddleware(validateBody(schema), { body: { name: 'cpu' } });

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
    expect(req.body).toEqual({ name: 'cpu' });
  });

  it('forwards a VALIDATION_ERROR for an invalid body', () => {
    const { next } = runMiddleware(validateBody(schema), { body: { name: '' } });

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0]?.[0];
    expect(err).toBeInstanceOf(AppError);
    expect((err as AppError).code).toBe('VALIDATION_ERROR');
  });
});

describe('validateQuery', () => {
  const schema = z.object({ page: z.coerce.number().int().min(1).default(1) });

  it('coerces and defaults query parameters', () => {
    const { next, req } = runMiddleware(validateQuery(schema), { query: {} });

    expect(next).toHaveBeenCalledWith();
    expect(req.validatedQuery).toEqual({ page: 1 });
  });
});

describe('validateParams', () => {
  const schema = z.object({ slug: z.string().min(1) });

  it('forwards a VALIDATION_ERROR for invalid route params', () => {
    const { next } = runMiddleware(validateParams(schema), { params: { slug: '' } });

    const err = next.mock.calls[0]?.[0];
    expect(err).toBeInstanceOf(AppError);
  });
});
