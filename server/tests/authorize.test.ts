import type { NextFunction, Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { requireRole } from '../src/middleware/authorize';
import { AppError } from '../src/utils/AppError';

function run(
  allowed: Parameters<typeof requireRole>,
  user: Request['user'],
): { next: ReturnType<typeof vi.fn>; error: unknown } {
  const next = vi.fn();
  requireRole(...allowed)({ user } as Request, {} as Response, next as unknown as NextFunction);
  return { next, error: next.mock.calls[0]?.[0] };
}

describe('requireRole', () => {
  it('rejects unauthenticated requests with 401', () => {
    const { error } = run(['admin'], undefined);
    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).statusCode).toBe(401);
  });

  it('rejects customers from admin operations with 403', () => {
    const { error } = run(['admin'], { id: 'user-1', role: 'customer' });
    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).code).toBe('FORBIDDEN');
  });

  it('admits admins to admin operations', () => {
    const { next } = run(['admin'], { id: 'user-2', role: 'admin' });
    expect(next).toHaveBeenCalledWith();
  });
});
