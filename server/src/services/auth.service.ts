import { UniqueConstraintError } from 'sequelize';
import type { LoginDto, RegisterDto } from '../schemas/auth.schema';
import { User } from '../models/index';
import type { SafeUser } from '../models/user';
import { AppError } from '../utils/AppError';
import { comparePassword, hashPassword } from '../utils/password';

export async function registerUser(dto: RegisterDto): Promise<SafeUser> {
  const existing = await User.findOne({ where: { email: dto.email } });
  if (existing !== null) {
    throw new AppError(409, 'USER_ALREADY_EXISTS', 'An account with this email already exists');
  }
  try {
    // Role is never taken from the DTO — every self-registration is a customer.
    const user = await User.create({
      email: dto.email,
      passwordHash: await hashPassword(dto.password),
    });
    return user.toSafeUser();
  } catch (err) {
    // Defensive: covers the check-then-insert race on the unique email index.
    if (err instanceof UniqueConstraintError) {
      throw new AppError(409, 'USER_ALREADY_EXISTS', 'An account with this email already exists');
    }
    throw err;
  }
}

export async function loginUser(dto: LoginDto): Promise<SafeUser> {
  const user = await User.findOne({ where: { email: dto.email } });
  // Identical response for "unknown email" and "wrong password" so attackers
  // cannot enumerate registered accounts.
  if (user === null || !(await comparePassword(dto.password, user.passwordHash))) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }
  return user.toSafeUser();
}

export async function getUserById(id: string): Promise<SafeUser | null> {
  const user = await User.findByPk(id);
  return user?.toSafeUser() ?? null;
}
