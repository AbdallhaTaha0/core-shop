import { describe, expect, it } from 'vitest';
import { parseExpiresInToMs, signAccessToken, verifyAccessToken } from '../src/utils/jwt';

describe('parseExpiresInToMs', () => {
  it('parses supported durations', () => {
    expect(parseExpiresInToMs('30s')).toBe(30_000);
    expect(parseExpiresInToMs('15m')).toBe(900_000);
    expect(parseExpiresInToMs('2h')).toBe(7_200_000);
    expect(parseExpiresInToMs('7d')).toBe(604_800_000);
  });

  it('rejects malformed durations', () => {
    expect(() => parseExpiresInToMs('15')).toThrow(/Invalid JWT_EXPIRES_IN/);
    expect(() => parseExpiresInToMs('never')).toThrow(/Invalid JWT_EXPIRES_IN/);
  });
});

describe('access tokens', () => {
  it('round-trips the subject and server-side role', () => {
    const token = signAccessToken({ id: '123e4567-e89b-12d3-a456-426614174000', role: 'admin' });

    expect(verifyAccessToken(token)).toEqual({
      sub: '123e4567-e89b-12d3-a456-426614174000',
      role: 'admin',
    });
  });

  it('rejects tampered tokens', () => {
    const token = signAccessToken({ id: '123e4567-e89b-12d3-a456-426614174000', role: 'admin' });

    expect(() => verifyAccessToken(`${token}tampered`)).toThrow(/Invalid session/);
  });
});
