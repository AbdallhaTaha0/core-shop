import bcrypt from 'bcrypt';

// Cost 12 is the current baseline: expensive enough to resist offline
// brute force, cheap enough (~250ms) to keep login latency acceptable.
// The same cost is used in every environment so test hashes behave like
// production hashes.
const BCRYPT_COST = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
