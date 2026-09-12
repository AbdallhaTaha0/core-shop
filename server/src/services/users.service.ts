import { Op, type WhereOptions } from 'sequelize';
import { User } from '../models/index';
import type { SafeUser, UserAttributes } from '../models/user';
import type { UpdateUserRoleDto, UserQuery } from '../schemas/user.schema';
import { AppError } from '../utils/AppError';

export interface UserList {
  data: SafeUser[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}

export async function listUsers(query: UserQuery): Promise<UserList> {
  const where: WhereOptions<UserAttributes> = {};
  if (query.q !== undefined && query.q !== '') {
    where.email = { [Op.iLike]: `%${escapeLike(query.q)}%` };
  }
  const offset = (query.page - 1) * query.limit;
  const result = await User.findAndCountAll({
    where,
    order: [['createdAt', 'ASC']],
    limit: query.limit,
    offset,
  });
  return {
    data: result.rows.map((user) => user.toSafeUser()),
    meta: {
      page: query.page,
      limit: query.limit,
      total: result.count,
      totalPages: Math.max(1, Math.ceil(result.count / query.limit)),
    },
  };
}

export async function getUser(id: string): Promise<SafeUser> {
  const user = await User.findByPk(id);
  if (user === null) {
    throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
  }
  return user.toSafeUser();
}

export async function updateUserRole(
  callerId: string,
  id: string,
  dto: UpdateUserRoleDto,
): Promise<SafeUser> {
  if (callerId === id) {
    // An admin must never be able to remove their own access: a misclick
    // (or a hijacked session) could otherwise lock out all administration.
    throw new AppError(403, 'SELF_DEMOTE_BLOCKED', 'You cannot change your own role');
  }
  const user = await User.findByPk(id);
  if (user === null) {
    throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
  }
  await user.update({ role: dto.role });
  return user.toSafeUser();
}
